import { supabase } from '@/integrations/supabase/client';

const PREVIEW_USERS = [
  {
    id: 'preview-migrant-1',
    name: 'Mariana Silva',
    avatar: 'https://i.pravatar.cc/150?u=mariana-pertodemimservicos',
    role: 'migrant',
    professional_area: 'Moradia',
    help_categories: ['housing'],
    need_categories: ['housing'],
  },
  {
    id: 'preview-helper-1',
    name: 'Lucas Martin',
    avatar: 'https://i.pravatar.cc/150?u=lucas-pertodemimservicos',
    role: 'helper',
    professional_area: 'Jurídico',
    help_categories: ['legal'],
    need_categories: [],
  },
];

const previewStoreKey = (userId) => `cloned_chat_messages_${userId || 'preview-user'}_v2`;

const safeParse = (value, fallback) => {
  try {
    return JSON.parse(value || '') ?? fallback;
  } catch {
    return fallback;
  }
};

const getSessionUserId = async () => {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id || null;
};

export const normalizeMessage = (message, currentUserId) => ({
  id: message.id,
  conversation_id: message.conversation_id,
  from_user_id: message.sender_id,
  to_user_id: message.sender_id === currentUserId ? null : currentUserId,
  is_from_me: message.sender_id === currentUserId,
  message: message.content || '',
  content: message.content || '',
  created_at: message.created_at,
  media_type: message.media_type,
  media_url: message.media_url,
  lat: message.lat,
  lng: message.lng,
  location: message.lat != null && message.lng != null ? { lat: message.lat, lng: message.lng } : null,
  media: message.media_url ? [message.media_url] : [],
});

const profileToUser = (profile, fallbackId) => ({
  id: profile?.user_id || fallbackId,
  name: profile?.display_name || 'Usuário',
  avatar: profile?.avatar_url || null,
  role: profile?.role || 'user',
  professional_area: profile?.bio || profile?.city || '',
  help_categories: profile?.categories || [],
  need_categories: profile?.categories || [],
});

export const getPreviewUser = (userId) => PREVIEW_USERS.find((u) => u.id === userId) || {
  id: userId,
  name: 'Usuário',
  avatar: `https://i.pravatar.cc/150?u=${userId || 'user'}`,
  role: 'user',
  professional_area: '',
  help_categories: [],
  need_categories: [],
};

export const loadPreviewConversations = (currentUserId = 'preview-user') => {
  const saved = safeParse(localStorage.getItem(previewStoreKey(currentUserId)), []);
  const latestByUser = new Map();

  saved.forEach((message) => {
    const otherId = message.from_user_id === currentUserId ? message.to_user_id : message.from_user_id;
    if (!otherId) return;
    const previous = latestByUser.get(otherId);
    if (!previous || new Date(message.created_at) > new Date(previous.created_at)) latestByUser.set(otherId, message);
  });

  return Array.from(latestByUser.entries()).map(([otherId, message]) => ({
    id: `preview-conv-${otherId}`,
    user: getPreviewUser(otherId),
    last_message: message.message || message.content || 'Sem mensagens',
    last_message_time: message.created_at,
  })).sort((a, b) => new Date(b.last_message_time || 0) - new Date(a.last_message_time || 0));
};

export const loadPreviewMessages = (otherUserId, currentUserId = 'preview-user') => {
  const saved = safeParse(localStorage.getItem(previewStoreKey(currentUserId)), []);
  return saved
    .filter((message) =>
      (message.from_user_id === currentUserId && message.to_user_id === otherUserId) ||
      (message.from_user_id === otherUserId && message.to_user_id === currentUserId)
    )
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
};

export const savePreviewMessage = (otherUserId, text, currentUserId = 'preview-user', extra = {}) => {
  const key = previewStoreKey(currentUserId);
  const saved = safeParse(localStorage.getItem(key), []);
  const message = {
    id: `local-${Date.now()}`,
    from_user_id: currentUserId,
    to_user_id: otherUserId,
    is_from_me: true,
    message: text,
    content: text,
    created_at: new Date().toISOString(),
    ...extra,
  };
  localStorage.setItem(key, JSON.stringify([...saved, message].slice(-300)));
  return message;
};

export const fetchChatUser = async (userId) => {
  const currentUserId = await getSessionUserId();
  if (!currentUserId || !userId || userId.startsWith('preview-')) return getPreviewUser(userId);

  const { data, error } = await supabase
    .from('svc_profiles')
    .select('user_id, display_name, avatar_url, bio, city, rating, role, categories')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return profileToUser(data, userId);
};

export const fetchChatConversations = async (fallbackUserId = 'preview-user') => {
  const currentUserId = await getSessionUserId();
  if (!currentUserId) return loadPreviewConversations(fallbackUserId);

  const { data: conversations, error } = await supabase
    .from('svc_conversations')
    .select('*')
    .or(`user_a.eq.${currentUserId},user_b.eq.${currentUserId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (error) throw error;

  const conversationRows = conversations || [];
  const otherIds = conversationRows.map((c) => (c.user_a === currentUserId ? c.user_b : c.user_a));
  const profileMap = {};
  const lastMessageMap = {};

  if (otherIds.length) {
    const [{ data: profiles }, { data: messages }] = await Promise.all([
      supabase
        .from('svc_profiles')
        .select('user_id, display_name, avatar_url, bio, city, rating, role, categories')
        .in('user_id', otherIds),
      supabase
        .from('svc_messages')
        .select('conversation_id, content, created_at')
        .in('conversation_id', conversationRows.map((c) => c.id))
        .order('created_at', { ascending: false }),
    ]);

    (profiles || []).forEach((profile) => { profileMap[profile.user_id] = profile; });
    (messages || []).forEach((message) => {
      if (!lastMessageMap[message.conversation_id]) lastMessageMap[message.conversation_id] = message;
    });
  }

  return conversationRows.map((conversation) => {
    const otherId = conversation.user_a === currentUserId ? conversation.user_b : conversation.user_a;
    const last = lastMessageMap[conversation.id];
    return {
      id: conversation.id,
      user: profileToUser(profileMap[otherId], otherId),
      last_message: last?.content || 'Sem mensagens',
      last_message_time: last?.created_at || conversation.last_message_at || conversation.created_at,
    };
  });
};

export const fetchChatMessages = async (otherUserId, fallbackUserId = 'preview-user') => {
  const currentUserId = await getSessionUserId();
  if (!currentUserId || otherUserId?.startsWith('preview-')) return loadPreviewMessages(otherUserId, fallbackUserId);

  const { data: conversationId, error: conversationError } = await supabase.rpc('svc_get_or_create_conversation', {
    _other_user: otherUserId,
  });
  if (conversationError) throw conversationError;

  const { data, error } = await supabase
    .from('svc_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map((message) => normalizeMessage(message, currentUserId));
};

export const sendChatMessage = async (otherUserId, text, fallbackUserId = 'preview-user', extra = {}) => {
  const currentUserId = await getSessionUserId();
  if (!currentUserId || otherUserId?.startsWith('preview-')) return savePreviewMessage(otherUserId, text, fallbackUserId, extra);

  const { data: conversationId, error: conversationError } = await supabase.rpc('svc_get_or_create_conversation', {
    _other_user: otherUserId,
  });
  if (conversationError) throw conversationError;

  const insertPayload = {
    conversation_id: conversationId,
    sender_id: currentUserId,
    content: text || null,
    media_type: extra.media_type || (extra.location ? 'location' : null),
    media_url: Array.isArray(extra.media) ? extra.media[0] : extra.media_url || null,
    lat: extra.location?.lat ?? extra.lat ?? null,
    lng: extra.location?.lng ?? extra.lng ?? null,
  };

  const { data, error } = await supabase
    .from('svc_messages')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error) throw error;
  return normalizeMessage(data, currentUserId);
};