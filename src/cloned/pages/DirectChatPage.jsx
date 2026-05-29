import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../ClonedAuthContext';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import {
  ArrowLeft, Send, User, MapPin, Image as ImageIcon, Video, Paperclip, Lock,
  Phone, MessageCircle, CheckCheck, MoreVertical, Camera, Search, Star,
  Home as HomeIcon, Users as UsersIcon, Plus, BarChart3, MessageSquare,
  Video as VideoIcon, X as XIcon, Calendar, CreditCard, Star as StarIcon,
  Share2, Pin, Archive, Flag, Ban, ChevronRight, Copy, Clock, MoreHorizontal,
  ThumbsUp, FileText, Receipt, History, ClipboardList, Wallet, Settings
} from 'lucide-react';
import { toast } from 'sonner';
import MapPreview from '../components/MapPreview';
import { fetchChatConversations, fetchChatMessages, fetchChatUser, sendChatMessage } from '../lib/chatService';
import { getStableDefaultAvatarUrl } from '../lib/authProfile';

const CATEGORY_INFO = {
  food: { icon: '🍽️', label: 'Alimentação', color: 'bg-green-100 text-green-700' },
  legal: { icon: '⚖️', label: 'Jurídico', color: 'bg-blue-100 text-blue-700' },
  health: { icon: '🏥', label: 'Saúde', color: 'bg-red-100 text-red-700' },
  housing: { icon: '🏠', label: 'Moradia', color: 'bg-orange-100 text-orange-700' },
  work: { icon: '💼', label: 'Emprego', color: 'bg-yellow-100 text-yellow-700' },
  education: { icon: '📚', label: 'Educação', color: 'bg-orange-100 text-orange-700' },
  social: { icon: '🤝', label: 'Social', color: 'bg-orange-100 text-orange-700' },
  clothes: { icon: '👕', label: 'Roupas', color: 'bg-orange-100 text-orange-700' },
  furniture: { icon: '🪑', label: 'Móveis', color: 'bg-teal-100 text-teal-700' },
  transport: { icon: '🚗', label: 'Transporte', color: 'bg-cyan-100 text-cyan-700' },
  repairs: { icon: '🔧', label: 'Manutenção', color: 'bg-gray-200 text-gray-700' }
};

const formatRelativeDate = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return ''; }
};

const PIX_KEY = '3ef11200-bebf-4d88-930c-48e84b11cfc452';
const PIX_MERCHANT_NAME = 'JATAI TRABALHO';
const PIX_MERCHANT_CITY = 'JATAI';

const emv = (id, value) => `${id}${String(value.length).padStart(2, '0')}${value}`;

const crc16 = (payload) => {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
};

const sanitizePixText = (value, max) => (value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^A-Z0-9 .,-]/gi, '')
  .trim()
  .slice(0, max)
  .toUpperCase();

const buildPixPayload = ({ amount, description }) => {
  const txid = `JRT${Date.now().toString(36).toUpperCase()}`.slice(0, 25);
  const merchantInfo = emv('00', 'BR.GOV.BCB.PIX') + emv('01', PIX_KEY) + emv('02', sanitizePixText(description || 'Pagamento de serviço', 40));
  const additionalData = emv('05', txid);
  const base = [
    emv('00', '01'),
    emv('26', merchantInfo),
    emv('52', '0000'),
    emv('53', '986'),
    emv('54', amount.toFixed(2)),
    emv('58', 'BR'),
    emv('59', sanitizePixText(PIX_MERCHANT_NAME, 25)),
    emv('60', sanitizePixText(PIX_MERCHANT_CITY, 15)),
    emv('62', additionalData),
  ].join('');
  const payload = `${base}6304`;
  return { brcode: `${payload}${crc16(payload)}`, txid };
};

const getQrUrl = (brcode) => `https://api.qrserver.com/v1/create-qr-code/?size=360x360&ecc=M&qzone=3&data=${encodeURIComponent(brcode)}`;

const copyToClipboard = async (text) => {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const input = document.createElement('textarea');
  input.value = text;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  document.body.removeChild(input);
};

export default function DirectChatPage() {
  const { userId } = useParams();
  const { user: currentUser, token } = useContext(AuthContext);
  const navigate = useNavigate();

  // ====== Estado original preservado ======
  const [otherUser, setOtherUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [canChat, setCanChat] = useState(true);
  const [chatRestrictionReason, setChatRestrictionReason] = useState('');
  const messagesEndRef = useRef(null);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [userPosts, setUserPosts] = useState([]);

  // ====== Estado novo (sidebar de conversas + busca) ======
  const [conversations, setConversations] = useState([]);
  const [convFilter, setConvFilter] = useState('all'); // all | unread | archived
  const [search, setSearch] = useState('');
  const [showPostPreview, setShowPostPreview] = useState(false);

  // ====== Action modals ======
  const [activeModal, setActiveModal] = useState(null); // 'refuse' | 'schedule' | 'payment' | 'more' | null
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleNote, setScheduleNote] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payDescription, setPayDescription] = useState('');
  const [pixCharge, setPixCharge] = useState(null); // {brcode, qr_code_base64}
  const [loadingAction, setLoadingAction] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingNote, setRatingNote] = useState('');

  // ====== Local conversation flags (pinned/archived/blocked) ======
  const convKey = userId || 'unknown';
  const readFlag = (k) => {
    try { return JSON.parse(localStorage.getItem(`dc:${k}`) || '{}'); } catch { return {}; }
  };
  const writeFlag = (k, obj) => localStorage.setItem(`dc:${k}`, JSON.stringify(obj));
  const [pinnedMap, setPinnedMap] = useState(() => readFlag('pinned'));
  const [archivedMap, setArchivedMap] = useState(() => readFlag('archived'));
  const [blockedMap, setBlockedMap] = useState(() => readFlag('blocked'));
  const isPinned = !!pinnedMap[convKey];
  const isArchived = !!archivedMap[convKey];
  const isBlocked = !!blockedMap[convKey];

  const togglePin = () => {
    const next = { ...pinnedMap, [convKey]: !isPinned };
    if (!next[convKey]) delete next[convKey];
    setPinnedMap(next); writeFlag('pinned', next);
    toast.success(isPinned ? 'Conversa desafixada' : 'Conversa fixada');
    setActiveModal(null);
  };
  const toggleArchive = () => {
    const next = { ...archivedMap, [convKey]: !isArchived };
    if (!next[convKey]) delete next[convKey];
    setArchivedMap(next); writeFlag('archived', next);
    toast.success(isArchived ? 'Conversa desarquivada' : 'Conversa arquivada');
    setActiveModal(null);
  };
  const toggleBlock = () => {
    const next = { ...blockedMap, [convKey]: !isBlocked };
    if (!next[convKey]) delete next[convKey];
    setBlockedMap(next); writeFlag('blocked', next);
    if (!isBlocked) { setCanChat(false); setChatRestrictionReason('Você bloqueou este usuário.'); }
    else { setCanChat(true); setChatRestrictionReason(''); }
    toast.warning(isBlocked ? 'Usuário desbloqueado' : 'Usuário bloqueado');
    setActiveModal(null);
  };
  const handleReport = () => {
    const reports = readFlag('reports');
    reports[convKey] = { at: new Date().toISOString() };
    writeFlag('reports', reports);
    toast.warning('Usuário reportado. Nossa equipe vai analisar.');
    setActiveModal(null);
  };
  const handleShareConversation = async () => {
    const url = `${window.location.origin}/direct-chat/${userId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Conversa', url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copiado!');
      }
    } catch { /* user cancelled */ }
    setActiveModal(null);
  };
  const openRating = () => { setRatingValue(0); setRatingNote(''); setActiveModal('rate'); };
  const submitRating = async () => {
    if (!ratingValue) { toast.error('Selecione uma nota'); return; }
    try {
      await sendSystemMessage(`⭐ Avaliação: ${ratingValue}/5${ratingNote ? `\n📝 ${ratingNote}` : ''}`);
      toast.success('Avaliação enviada!');
    } catch { toast.error('Erro ao avaliar'); }
    setActiveModal(null);
  };


  // ====== Action handlers ======
  const handleRefuse = async () => {
    setLoadingAction(true);
    try {
      await sendSystemMessage('❌ Solicitação recusada. Obrigado pelo contato.');
      toast.success('Solicitação recusada');
      setActiveModal(null);
    } catch (error) {
      console.error('[chat] erro ao recusar:', error);
      toast.error(error?.message || 'Erro ao recusar');
    }
    finally { setLoadingAction(false); }
  };

  const handleSchedule = async () => {
    if (!scheduleDate || !scheduleTime) {
      toast.error('Selecione data e hora');
      return;
    }
    setLoadingAction(true);
    try {
      const [year, month, day] = scheduleDate.split('-');
      const [hour, minute] = scheduleTime.split(':');
      const d = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
      if (Number.isNaN(d.getTime())) throw new Error('Data ou hora inválida');
      const formatted = d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const msg = `📅 Agendamento proposto: ${formatted}${scheduleNote ? `\n📝 ${scheduleNote}` : ''}`;
      await sendSystemMessage(msg);
      toast.success('Agendamento enviado!');
      setActiveModal(null);
      setScheduleDate(''); setScheduleTime(''); setScheduleNote('');
    } catch (error) {
      console.error('[chat] erro ao agendar:', error);
      toast.error(error?.message || 'Erro ao agendar');
    }
    finally { setLoadingAction(false); }
  };

  const handleGeneratePix = async () => {
    const amount = parseFloat(payAmount.replace(',', '.'));
    if (!amount || amount <= 0) {
      toast.error('Informe um valor válido');
      return;
    }
    setLoadingAction(true);
    try {
      const description = payDescription || 'Pagamento de serviço';
      const { brcode, txid } = buildPixPayload({ amount, description });
      const data = { brcode, txid, qr_code_base64: getQrUrl(brcode) };
      setPixCharge(data);
      const summary = `💳 Cobrança PIX gerada\nValor: R$ ${amount.toFixed(2).replace('.', ',')}\n${description}\n\nPIX Copia e Cola:\n${brcode}`;
      await sendSystemMessage(summary);
      toast.success('PIX enviado no chat!');
    } catch (error) {
      console.error('[chat] erro ao gerar PIX:', error);
      toast.error(error?.message || 'Erro ao gerar PIX');
    }
    finally { setLoadingAction(false); }
  };

  const sendSystemMessage = async (text) => {
    if (!userId) throw new Error('Conversa inválida');
    const sent = await sendChatMessage(userId, text, currentUser?.id);
    setMessages((prev) => [...prev, sent]);
    fetchMessages();
    fetchConversations();
    return true;
  };

  const closePaymentModal = () => {
    setActiveModal(null);
    setPayAmount(''); setPayDescription(''); setPixCharge(null);
  };

  // ====== Fetchers (lógica original preservada) ======
  useEffect(() => {
    if (!userId) return;
    fetchOtherUser();
    checkCanChat();
    fetchMessages();
    fetchUserPosts();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [userId]);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchOtherUser = async () => {
    try {
      setOtherUser(await fetchChatUser(userId));
    } catch (error) { console.error(error); }
  };

  const fetchUserPosts = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ""}/api/posts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok && isJsonResponse(response)) {
        const data = await response.json();
        setUserPosts(data.filter(p => p.user_id === userId));
      }
    } catch (error) { console.error(error); }
  };

  const checkCanChat = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ""}/api/can-chat/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok && isJsonResponse(response)) {
        const data = await response.json();
        setCanChat(data.can_chat);
        if (!data.can_chat) setChatRestrictionReason(data.reason);
      }
    } catch (error) { console.error(error); }
  };

  const isJsonResponse = (r) => (r.headers.get('content-type') || '').includes('application/json');

  const fetchMessages = async () => {
    try {
      setMessages(await fetchChatMessages(userId, currentUser?.id));
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const fetchConversations = async () => {
    try {
      const data = await fetchChatConversations(currentUser?.id);
      setConversations(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const sendMessage = async (messageData = {}) => {
    if (!input.trim() && !messageData.location && !messageData.media) return;
    if (!userId) { toast.error('Conversa inválida'); return; }
    setSending(true);
    const messageText = input || (messageData.location ? '📍 Localização compartilhada' : '📎 Mídia compartilhada');
    const optimistic = {
      id: `local-${Date.now()}`,
      from_user_id: currentUser?.id || 'preview-user',
      to_user_id: userId,
      is_from_me: true,
      message: messageText,
      content: messageText,
      created_at: new Date().toISOString(),
      ...messageData,
    };
    setInput('');
    setShowMediaOptions(false);
    setMessages((prev) => [...prev, optimistic]);
    try {
      const sent = await sendChatMessage(userId, messageText, currentUser?.id, messageData);
      if (sent) {
        setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? sent : m)));
      }
      fetchMessages();
      fetchConversations();
    } catch (error) {
      console.error(error);
      toast.error(error?.message || 'Não foi possível enviar a mensagem');
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInput(messageText);
    } finally { setSending(false); }
  };

  const sendLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          sendMessage({ location: { lat: position.coords.latitude, lng: position.coords.longitude } });
          toast.success('Localização enviada!');
        },
        () => toast.error('Erro ao obter localização')
      );
    }
  };

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10000000) { toast.error('Arquivo muito grande! Máximo 10MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      sendMessage({ media: [reader.result], media_type: type });
      toast.success(`${type === 'image' ? 'Foto' : 'Vídeo'} enviado!`);
    };
    reader.readAsDataURL(file);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'volunteer': return 'Voluntário';
      case 'migrant': return 'Migrante';
      case 'helper': return 'Ajudante';
      case 'admin': return 'Admin';
      default: return role || 'Usuário';
    }
  };

  const getCategoryInfo = (cat) => CATEGORY_INFO[cat] || { icon: '📝', label: cat || 'Geral', color: 'bg-gray-200 text-gray-700' };

  // Agrupar mensagens por data
  const groupMessagesByDate = (msgs) => {
    const groups = {};
    msgs.forEach(msg => {
      const date = new Date(msg.created_at).toLocaleDateString('pt-BR');
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return groups;
  };
  const messageGroups = groupMessagesByDate(messages);

  // Conversas filtradas
  const filteredConversations = conversations.filter(c => {
    if (!c?.user) return false;
    if (search && !(c.user.name || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Post atual relacionado à conversa
  const currentPost = userPosts.find(p => p.type === 'need') || userPosts[0];

  const avatarUrl = (u) => u?.avatar_url || u?.avatar || getStableDefaultAvatarUrl(u);

  return (
    <div className="min-h-screen bg-[#f4f5f7] pb-20 md:pb-0" data-testid="direct-chat-page">
      {/* ===== MOBILE TOP CHAT HEADER (only mobile) ===== */}
      <header className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-30 px-3 py-2.5 flex items-center gap-3">
        <button
          data-testid="mobile-back-btn"
          onClick={() => navigate('/chat')}
          className="p-1 text-blue-500"
          aria-label="Voltar"
        >
          <ArrowLeft size={24} />
        </button>
        {otherUser ? (
          <>
            <img
              src={avatarUrl(otherUser)}
              alt={otherUser.name}
              className="w-11 h-11 rounded-full object-cover bg-gray-200"
            />
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-gray-900 truncate leading-tight" data-testid="mobile-other-name">
                {otherUser.name}
              </h1>
              <p className="text-xs text-gray-500 truncate leading-tight">Serviço solicitado</p>
            </div>
            <button
              data-testid="mobile-menu-btn"
              onClick={() => toast.info('Mais opções em breve')}
              className="p-2 text-gray-600"
              aria-label="Menu"
            >
              <MoreVertical size={20} />
            </button>
          </>
        ) : (
          <div className="flex-1 text-sm text-gray-400">Carregando...</div>
        )}
      </header>

      {/* ===== TOP NAVBAR (desktop only) ===== */}
      <header className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/home')}
              data-testid="logo-home"
              className="text-2xl font-bold tracking-tight"
            >
              <span className="text-[#16a34a]">Jataí</span>{' '}
              <span className="text-amber-500">Região</span>{' '}
              <span className="text-gray-900">Trabalho</span>
            </button>
            <span className="hidden md:inline text-xs text-gray-500 ml-2">Paris (Chaillot 1)</span>
          </div>

          <nav className="flex items-center gap-1">
            <NavBtn label="Acolhida" icon={<HomeIcon size={18} />} onClick={() => navigate('/home')} />
            <NavBtn label="Voluntários" icon={<UsersIcon size={18} />} onClick={() => navigate('/volunteers')} />
            <button
              onClick={() => navigate('/home')}
              data-testid="nav-demanda"
              className="flex flex-col items-center -mt-3 mx-2"
            >
              <div className="w-12 h-12 rounded-full bg-[#16a34a] text-white grid place-items-center shadow-md shadow-green-500/30 hover:shadow-lg hover:scale-105 transition-all">
                <Plus size={24} />
              </div>
              <span className="text-[11px] text-[#16a34a] font-medium mt-0.5">Demanda</span>
            </button>
            <NavBtn label="Assinatura" icon={<BarChart3 size={18} />} onClick={() => navigate('/assinatura')} />
            <NavBtn label="Mensagens" icon={<MessageSquare size={18} />} active onClick={() => navigate('/chat')} />
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/profile')}
              data-testid="profile-avatar-top"
              className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 hover:border-[#16a34a] transition-all"
            >
              <img src={avatarUrl(currentUser)} alt="me" className="w-full h-full object-cover" />
            </button>
          </div>
        </div>
      </header>

      {/* ===== 3-COLUMN LAYOUT (desktop) / chat fullscreen (mobile) ===== */}
      <div className="max-w-[1400px] mx-auto grid grid-cols-12 gap-0 px-0 md:px-6 py-0 md:py-6">

        {/* ============ LEFT: CONVERSATIONS LIST (desktop only) ============ */}
        <aside className="hidden md:block md:col-span-3 bg-white md:rounded-2xl md:shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Mensagens</h2>
            <button data-testid="edit-conversations" className="text-sm text-gray-500 hover:text-gray-800">Editar</button>
          </div>
          <div className="px-5 pb-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                data-testid="conversations-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar"
                className="pl-9 rounded-full bg-gray-50 border-gray-200 h-10"
              />
            </div>
          </div>
          <div className="px-5 pb-3 flex items-center gap-2">
            {[
              { key: 'all', label: 'Todas' },
              { key: 'unread', label: 'Não lidas' },
              { key: 'archived', label: 'Arquivadas' }
            ].map(t => (
              <button
                key={t.key}
                data-testid={`tab-${t.key}`}
                onClick={() => setConvFilter(t.key)}
                className={`px-3 py-1.5 text-sm rounded-full font-medium transition ${
                  convFilter === t.key
                    ? 'bg-gray-900 text-white'
                    : 'bg-transparent text-gray-600 hover:bg-gray-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto max-h-[calc(100vh-280px)] divide-y divide-gray-100" data-testid="conversations-list">
            {filteredConversations.length === 0 && (
              <div className="px-5 py-10 text-center text-sm text-gray-400">Nenhuma conversa encontrada</div>
            )}
            {filteredConversations.map((c, idx) => {
              const isActive = c.user.id === userId;
              const catBadge = c.user.help_categories?.[0] || c.user.need_categories?.[0];
              const catInfo = catBadge ? getCategoryInfo(catBadge) : null;
              return (
                <button
                  key={c.user.id}
                  data-testid={`conversation-item-${idx}`}
                  onClick={() => navigate(`/direct-chat/${c.user.id}`)}
                  className={`w-full text-left px-5 py-4 hover:bg-gray-50 transition relative ${isActive ? 'bg-emerald-50/40' : ''}`}
                >
                  {isActive && <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#16a34a]" />}
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <img
                        src={avatarUrl(c.user)}
                        alt={c.user.name}
                        className="w-12 h-12 rounded-full object-cover bg-gray-200"
                      />
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold text-gray-900 truncate">{c.user.name}</span>
                        <span className="text-xs text-gray-400 shrink-0">{formatRelativeDate(c.last_message_time)}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star size={12} className="text-amber-400 fill-amber-400" />
                        <span className="text-xs text-gray-700">5/5</span>
                      </div>
                      {catInfo && (
                        <span className="inline-block mt-1.5 text-[11px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                          {catInfo.label}
                        </span>
                      )}
                      <p className="text-sm text-gray-500 truncate mt-1">
                        {c.last_message || 'Sem mensagens'}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ============ CENTER: CHAT ============ */}
        <main className="col-span-12 md:col-span-6 bg-white md:mx-0 md:rounded-2xl md:shadow-sm border-0 md:border md:border-gray-200 flex flex-col" style={{ minHeight: 'calc(100vh - 112px)' }}>

          {/* Banner: Solicitação privada (desktop only) */}
          {currentPost && (
            <div className="hidden md:block px-6 pt-5 pb-3 border-b border-gray-100">
              <div className="bg-sky-50/70 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-[#16a34a] font-semibold text-sm">
                    <Lock size={14} /> Solicitação privada
                  </div>
                  <p className="text-sm text-gray-700 mt-1 line-clamp-1">
                    <span className="font-medium text-gray-900">{otherUser?.name || 'Olá'},</span>{' '}
                    {currentPost.description || currentPost.title}
                  </p>
                  <button
                    onClick={() => setShowPostPreview(!showPostPreview)}
                    data-testid="toggle-post-preview"
                    className="mt-2 text-xs font-medium px-3 py-1 rounded-full bg-white border border-gray-200 hover:border-[#16a34a] hover:text-[#16a34a] transition"
                  >
                    {showPostPreview ? 'Ocultar' : 'Exibir'}
                  </button>
                </div>
                <div className="text-xs text-gray-400 shrink-0 whitespace-nowrap">
                  postado em {currentPost.created_at ? new Date(currentPost.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }) : '—'}
                </div>
              </div>

              {showPostPreview && (
                <div className="mt-3 rounded-xl border border-gray-200 p-4 bg-white">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 grid place-items-center">
                      <MessageCircle size={18} className="text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{currentPost.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{currentPost.description}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {(currentPost.categories?.length ? currentPost.categories : [currentPost.category]).filter(Boolean).map(cat => {
                          const info = getCategoryInfo(cat);
                          return (
                            <span key={cat} className={`text-[11px] px-2 py-0.5 rounded-full ${info.color}`}>
                              {info.icon} {info.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {!canChat ? (
              <div className="text-center py-12" data-testid="chat-restricted">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 max-w-md mx-auto">
                  <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Lock size={26} className="text-amber-600" />
                  </div>
                  <h3 className="text-lg font-bold text-amber-800 mb-1">Chat Restrito</h3>
                  <p className="text-sm text-amber-700">{chatRestrictionReason || 'Você não pode conversar com este usuário.'}</p>
                  <Button
                    onClick={() => navigate('/profile')}
                    className="mt-4 rounded-full bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Atualizar Perfil
                  </Button>
                </div>
              </div>
            ) : loading ? (
              <div className="text-center py-16">
                <div className="animate-spin w-8 h-8 border-4 border-[#16a34a] border-t-transparent rounded-full mx-auto mb-3"></div>
                <p className="text-gray-500 text-sm">Carregando mensagens...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full grid place-items-center" data-testid="no-messages">
                <p className="text-gray-400 text-sm">Nenhuma mensagem ainda</p>
              </div>
            ) : (
              <div className="space-y-1">
                {Object.entries(messageGroups).map(([date, msgs]) => (
                  <div key={date}>
                    <div className="flex items-center justify-center my-4">
                      <span className="bg-gray-100 text-gray-500 text-[11px] px-3 py-1 rounded-full">
                        {date === new Date().toLocaleDateString('pt-BR') ? 'Hoje' : date}
                      </span>
                    </div>
                    {msgs.map((msg, idx) => {
                      const isMe = msg.is_from_me || msg.from_user_id === currentUser.id;
                      return (
                        <div
                          key={idx}
                          data-testid={`message-${isMe ? 'sent' : 'received'}`}
                          className={`flex gap-2 mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isMe && (
                            <img src={avatarUrl(otherUser)} alt="" className="w-7 h-7 rounded-full object-cover mt-auto" />
                          )}
                          <div
                            className={`max-w-[70%] px-4 py-2.5 ${
                              isMe
                                ? 'bg-[#16a34a] text-white rounded-2xl rounded-br-md'
                                : 'bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md'
                            }`}
                          >
                            {msg.location && (
                              <div className={`mb-2 p-2 rounded-xl ${isMe ? 'bg-white/20' : 'bg-white'}`}>
                                <MapPreview location={msg.location} size="small" />
                              </div>
                            )}
                            {msg.media && msg.media.length > 0 && (
                              <div className="mb-2">
                                {msg.media_type === 'image' ? (
                                  <img src={msg.media[0]} alt="" className="rounded-xl max-w-full max-h-64 cursor-pointer"
                                    onClick={() => window.open(msg.media[0], '_blank')} />
                                ) : (
                                  <video src={msg.media[0]} controls className="rounded-xl max-w-full max-h-64" />
                                )}
                              </div>
                            )}
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
                            <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
                              <span className="text-[10px]">
                                {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isMe && <CheckCheck size={12} />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Action buttons (Recusar / Agendar / Pagamento / Avaliar) - mobile + desktop */}
          {canChat && (
            <div className="border-t border-gray-100 px-3 md:px-6 py-2.5 bg-white">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <ActionBtn icon={<XIcon size={16} className="text-red-500" />} label="Recusar" onClick={() => setActiveModal('refuse')} testid="action-refuse" />
                <ActionBtn icon={<Calendar size={16} className="text-blue-500" />} label="Encontro" onClick={() => setActiveModal('schedule')} testid="action-schedule" />
                <ActionBtn icon={<CreditCard size={16} className="text-brand-coral" />} label="Pagamento" onClick={() => setActiveModal('payment')} testid="action-payment" />
                <ActionBtn icon={<StarIcon size={16} className="text-amber-500" />} label="Avaliação" onClick={openRating} testid="action-rate" />
                <ActionBtn icon={<MoreHorizontal size={16} />} label="Ver tudo" onClick={() => setActiveModal('more')} testid="action-more" />
              </div>
            </div>
          )}

          {/* Input area */}
          {canChat && (
            <div className="border-t border-gray-100 p-4">
              {showMediaOptions && (
                <div className="flex gap-2 mb-3">
                  <Button data-testid="send-location-button" onClick={sendLocation} variant="outline" size="sm" className="rounded-full">
                    <MapPin size={14} className="mr-1" /> Localização
                  </Button>
                  <Button data-testid="send-image-button" onClick={() => fileInputRef.current?.click()} variant="outline" size="sm" className="rounded-full">
                    <ImageIcon size={14} className="mr-1" /> Foto
                  </Button>
                  <Button data-testid="send-video-button" onClick={() => videoInputRef.current?.click()} variant="outline" size="sm" className="rounded-full">
                    <Video size={14} className="mr-1" /> Vídeo
                  </Button>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} className="hidden" />
              <input ref={videoInputRef} type="file" accept="video/*" onChange={(e) => handleFileUpload(e, 'video')} className="hidden" />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={(e) => handleFileUpload(e, 'image')} className="hidden" />

              <div className="flex items-center gap-2 bg-gray-50 rounded-full px-3 py-1.5 border border-gray-200">
                <button
                  data-testid="toggle-media-button"
                  onClick={() => setShowMediaOptions(!showMediaOptions)}
                  className="p-2 hover:bg-gray-200 rounded-full transition"
                  title="Anexar"
                >
                  <Paperclip size={18} className="text-gray-500" />
                </button>
                <button
                  data-testid="open-camera"
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-2 hover:bg-gray-200 rounded-full transition"
                  title="Câmera"
                >
                  <Camera size={18} className="text-gray-500" />
                </button>
                <Textarea
                  data-testid="message-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Sua mensagem"
                  rows={1}
                  className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none min-h-[24px] max-h-32 py-1 text-sm shadow-none"
                />
                <button
                  data-testid="send-message-button"
                  onClick={() => sendMessage()}
                  disabled={sending || !input.trim()}
                  className="w-9 h-9 grid place-items-center rounded-full bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-40 text-white transition"
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </div>
            </div>
          )}
        </main>

        {/* ============ RIGHT: PROFILE PANEL (desktop only) ============ */}
        <aside className="hidden md:block md:col-span-3 md:pl-6">
          <div className="bg-white md:rounded-2xl md:shadow-sm border border-gray-200 p-6">
            {otherUser ? (
              <>
                <div className="flex flex-col items-center text-center">
                  <div className="relative">
                    <img
                      src={avatarUrl(otherUser)}
                      alt={otherUser.name}
                      className="w-24 h-24 rounded-full object-cover ring-4 ring-white shadow-md"
                      data-testid="other-user-avatar"
                    />
                    <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-gray-900" data-testid="other-user-name">{otherUser.name}</h3>
                  <div className="flex items-center gap-1 mt-1 text-sm">
                    <Star size={14} className="text-amber-400 fill-amber-400" />
                    <span className="font-semibold text-gray-900">5/5</span>
                    <span className="text-gray-500">(2 avaliações)</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{getRoleLabel(otherUser.role)}</p>

                  <div className="flex items-center gap-3 mt-4">
                    <button
                      data-testid="video-call-btn"
                      onClick={async () => {
                        const room = `pertodemim-${(otherUser?.id || userId || 'sala').toString().slice(0, 16)}`;
                        const url = `https://meet.jit.si/${room}`;
                        try {
                          await sendSystemMessage(`📹 Chamada de vídeo iniciada. Entre pelo link: ${url}`);
                        } catch (err) {
                          console.error('[video-call] system msg failed', err);
                        }
                        window.open(url, '_blank', 'noopener');
                      }}
                      className="w-11 h-11 rounded-full border border-gray-200 hover:border-[#16a34a] hover:text-[#16a34a] grid place-items-center transition"
                      title="Iniciar chamada de vídeo"
                    >
                      <VideoIcon size={18} />
                    </button>
                    <button
                      data-testid="phone-call-btn"
                      onClick={() => {
                        const phone = otherUser?.phone || otherUser?.whatsapp;
                        if (phone) {
                          window.location.href = `tel:${phone}`;
                        } else {
                          toast.error('Esse usuário não cadastrou telefone.');
                        }
                      }}
                      className="w-11 h-11 rounded-full border border-gray-200 hover:border-[#16a34a] hover:text-[#16a34a] grid place-items-center transition"
                      title="Ligar"
                    >
                      <Phone size={18} />
                    </button>
                  </div>


                  <button
                    data-testid="view-profile-btn"
                    onClick={() => navigate('/profile')}
                    className="mt-5 w-full px-5 py-2.5 rounded-full border border-gray-900 text-gray-900 font-medium hover:bg-gray-900 hover:text-white transition"
                  >
                    Ver perfil
                  </button>
                </div>

                <div className="mt-6 space-y-1 border-t pt-4">
                  <PanelLink icon={<Share2 size={16} />} label="Compartilhar perfil" onClick={handleShareConversation} testid="share-profile" />
                  <PanelLink icon={<Pin size={16} />} label={isPinned ? 'Desafixar conversa' : 'Fixar conversa'} onClick={togglePin} testid="pin-conversation" />
                  <PanelLink icon={<Archive size={16} />} label={isArchived ? 'Desarquivar conversa' : 'Arquivar conversa'} onClick={toggleArchive} testid="archive-conversation" />
                </div>

                <div className="mt-4 space-y-1 border-t pt-4">
                  <PanelLink danger icon={<Flag size={16} />} label="Reportar perfil" onClick={handleReport} testid="report-profile" />
                  <PanelLink danger icon={<Ban size={16} />} label={isBlocked ? 'Desbloquear' : 'Bloquear'} onClick={toggleBlock} testid="block-user" />
                </div>

              </>
            ) : (
              <div className="text-center text-sm text-gray-400 py-10">Carregando perfil...</div>
            )}
          </div>
        </aside>
      </div>

      {/* ===== ACTION MODALS ===== */}
      {activeModal === 'refuse' && (
        <ModalShell title="Recusar solicitação" onClose={() => setActiveModal(null)}>
          <p className="text-sm text-gray-600 mb-5">
            Deseja recusar esta solicitação de serviço? O outro usuário será notificado.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveModal(null)}
              className="flex-1 h-11 rounded-full border border-gray-300 font-medium hover:bg-gray-50"
              data-testid="refuse-cancel"
            >Cancelar</button>
            <button
              onClick={handleRefuse}
              disabled={loadingAction}
              data-testid="refuse-confirm"
              className="flex-1 h-11 rounded-full bg-red-500 text-white font-semibold hover:bg-red-600 disabled:opacity-60"
            >{loadingAction ? 'Enviando...' : 'Sim, recusar'}</button>
          </div>
        </ModalShell>
      )}

      {activeModal === 'schedule' && (
        <ModalShell title="Agendar visita / serviço" onClose={() => setActiveModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Data</label>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                data-testid="schedule-date"
                className="w-full h-11 px-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Hora</label>
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                data-testid="schedule-time"
                className="w-full h-11 px-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Observação (opcional)</label>
              <Textarea
                value={scheduleNote}
                onChange={(e) => setScheduleNote(e.target.value)}
                placeholder="Ex: chegarei pela entrada lateral, levarei ferramentas..."
                rows={2}
                data-testid="schedule-note"
                className="resize-none border-gray-300 rounded-xl text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button
              onClick={() => setActiveModal(null)}
              className="flex-1 h-11 rounded-full border border-gray-300 font-medium hover:bg-gray-50"
            >Cancelar</button>
            <button
              onClick={handleSchedule}
              disabled={loadingAction || !scheduleDate || !scheduleTime}
              data-testid="schedule-confirm"
              className="flex-1 h-11 rounded-full bg-blue-500 text-white font-semibold hover:bg-blue-600 disabled:opacity-60"
            >{loadingAction ? 'Enviando...' : 'Propor horário'}</button>
          </div>
        </ModalShell>
      )}

      {activeModal === 'payment' && (
        <ModalShell title={pixCharge ? 'PIX gerado!' : 'Cobrar via PIX'} onClose={closePaymentModal}>
          {!pixCharge ? (
            <>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Valor (R$)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
                    placeholder="Ex: 150,00"
                    data-testid="pay-amount"
                    className="w-full h-11 px-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Descrição (opcional)</label>
                  <Textarea
                    value={payDescription}
                    onChange={(e) => setPayDescription(e.target.value.slice(0, 80))}
                    placeholder="Ex: instalação do chuveiro"
                    rows={2}
                    data-testid="pay-description"
                    className="resize-none border-gray-300 rounded-xl text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={closePaymentModal} className="flex-1 h-11 rounded-full border border-gray-300 font-medium hover:bg-gray-50">Cancelar</button>
                <button
                  onClick={handleGeneratePix}
                  disabled={loadingAction || !payAmount}
                  data-testid="pay-generate"
                  className="flex-1 h-11 rounded-full bg-green-500 text-white font-semibold hover:bg-green-600 disabled:opacity-60"
                >{loadingAction ? 'Gerando...' : 'Gerar PIX'}</button>
              </div>
            </>
          ) : (
            <div className="text-center">
              <img src={pixCharge.qr_code_base64} alt="QR PIX" className="w-48 h-48 mx-auto bg-white rounded-lg" data-testid="pix-charge-qr" />
              <p className="font-semibold text-green-700 mt-3 text-lg">R$ {parseFloat(payAmount.replace(',', '.')).toFixed(2).replace('.', ',')}</p>
              <p className="text-xs text-gray-500 mb-3">{payDescription || 'Pagamento de serviço'}</p>
              <button
                onClick={() => { copyToClipboard(pixCharge.brcode); toast.success('Copiado!'); }}
                data-testid="pix-charge-copy"
                className="w-full h-11 rounded-full bg-gray-900 text-white font-medium flex items-center justify-center gap-2 hover:bg-black"
              ><Copy size={16} /> Copiar PIX Copia e Cola</button>
              <button onClick={closePaymentModal} className="w-full h-11 mt-2 rounded-full border border-gray-300 font-medium hover:bg-gray-50">Fechar</button>
              <p className="text-[11px] text-gray-400 mt-3">PIX já foi enviado no chat</p>
            </div>
          )}
        </ModalShell>
      )}

      {activeModal === 'more' && (
        <ModalShell title="Sua transação com confiança" onClose={() => setActiveModal(null)}>
          <p className="text-xs text-gray-600 mb-5 leading-relaxed">
            Use nossas ferramentas para acompanhar toda a sua transação. E o melhor: é gratuito!
          </p>

          <h4 className="text-sm font-bold text-gray-900 mb-3">Prestação</h4>
          <div className="grid grid-cols-4 gap-3 mb-6">
            <TileOption icon={<ThumbsUp size={22} className="text-blue-600" />} bg="bg-blue-50" label="Boas práticas" onClick={() => { setActiveModal(null); toast.info('Boas práticas em breve'); }} />
            <TileOption icon={<Calendar size={22} className="text-blue-600" />} bg="bg-blue-50" label="Encontro" onClick={() => setActiveModal('schedule')} />
            <TileOption icon={<FileText size={22} className="text-blue-600" />} bg="bg-blue-50" label="Contrato" onClick={() => { setActiveModal(null); toast.info('Contrato em breve'); }} />
            <TileOption icon={<ClipboardList size={22} className="text-blue-600" />} bg="bg-blue-50" label="Vistoria" onClick={() => { setActiveModal(null); toast.info('Vistoria em breve'); }} />
          </div>

          <h4 className="text-sm font-bold text-gray-900 mb-3">Orçamentos e faturas</h4>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <TileOption icon={<FileText size={22} className="text-purple-600" />} bg="bg-purple-50" label="Fazer orçamento" onClick={() => { setActiveModal(null); toast.info('Orçamento em breve'); }} />
            <TileOption icon={<Receipt size={22} className="text-purple-600" />} bg="bg-purple-50" label="Fazer fatura" onClick={() => { setActiveModal(null); toast.info('Fatura em breve'); }} />
            <TileOption icon={<History size={22} className="text-purple-600" />} bg="bg-purple-50" label="Histórico" onClick={() => { setActiveModal(null); toast.info('Histórico em breve'); }} />
          </div>

          <h4 className="text-sm font-bold text-gray-900 mb-3">Pagamento</h4>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <TileOption icon={<Wallet size={22} className="text-emerald-600" />} bg="bg-emerald-50" label="Pagar" onClick={() => setActiveModal('payment')} />
            <TileOption icon={<CreditCard size={22} className="text-emerald-600" />} bg="bg-emerald-50" label="Cobrar" onClick={() => setActiveModal('payment')} />
            <TileOption icon={<Settings size={22} className="text-emerald-600" />} bg="bg-emerald-50" label="Gerenciar" onClick={() => { setActiveModal(null); toast.info('Gerenciar pagamentos em breve'); }} />
          </div>

          <h4 className="text-sm font-bold text-gray-900 mb-3">Avaliação</h4>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <TileOption icon={<StarIcon size={22} className="text-brand-coral" />} bg="bg-orange-50" label="Avaliar" onClick={openRating} />
            <TileOption icon={<StarIcon size={22} className="text-brand-coral" />} bg="bg-orange-50" label="Recomendar" onClick={() => { setActiveModal(null); toast.info('Recomendar em breve'); }} />
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-1">
            <MoreOption icon={<Share2 size={18} className="text-blue-500" />} label="Compartilhar conversa" onClick={handleShareConversation} />
            <MoreOption icon={<Pin size={18} className="text-brand-coral" />} label={isPinned ? 'Desafixar conversa' : 'Fixar conversa'} onClick={togglePin} />
            <MoreOption icon={<Archive size={18} className="text-gray-500" />} label={isArchived ? 'Desarquivar conversa' : 'Arquivar conversa'} onClick={toggleArchive} />
            <MoreOption icon={<Flag size={18} className="text-red-500" />} label="Denunciar usuário" danger onClick={handleReport} />
            <MoreOption icon={<Ban size={18} className="text-red-500" />} label={isBlocked ? 'Desbloquear usuário' : 'Bloquear usuário'} danger onClick={toggleBlock} />
          </div>
        </ModalShell>
      )}

      {activeModal === 'rate' && (
        <ModalShell title="Avaliar profissional" onClose={() => setActiveModal(null)}>
          <div className="flex justify-center gap-1 mb-4">
            {[1,2,3,4,5].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setRatingValue(n)}
                className="p-1"
                aria-label={`${n} estrelas`}
              >
                <StarIcon size={32} className={n <= ratingValue ? 'text-amber-500 fill-amber-500' : 'text-gray-300'} />
              </button>
            ))}
          </div>
          <Textarea
            value={ratingNote}
            onChange={(e) => setRatingNote(e.target.value.slice(0, 240))}
            placeholder="Conte como foi sua experiência (opcional)"
            rows={3}
            className="resize-none border-gray-300 rounded-xl text-sm"
          />
          <div className="flex gap-2 mt-5">
            <button onClick={() => setActiveModal(null)} className="flex-1 h-11 rounded-full border border-gray-300 font-medium hover:bg-gray-50">Cancelar</button>
            <button onClick={submitRating} disabled={!ratingValue} className="flex-1 h-11 rounded-full bg-amber-500 text-white font-semibold hover:bg-amber-600 disabled:opacity-60">Enviar avaliação</button>
          </div>
        </ModalShell>
      )}


      {/* ===== MOBILE BOTTOM NAV (only mobile) ===== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-2 py-2 flex items-end justify-around" data-testid="mobile-bottom-nav">
        <MobileNavItem icon={<HomeIcon size={22} />} label="Início" onClick={() => navigate('/home')} testid="mob-nav-home" />
        <MobileNavItem icon={<UsersIcon size={22} />} label="Voluntários" onClick={() => navigate('/volunteers')} testid="mob-nav-offer" />
        <button
          onClick={() => navigate('/home')}
          data-testid="mob-nav-demande"
          className="flex flex-col items-center -mt-5"
        >
          <div className="w-12 h-12 rounded-full bg-[#16a34a] text-white grid place-items-center shadow-md shadow-green-500/40">
            <Plus size={26} />
          </div>
          <span className="text-[11px] text-gray-500 mt-0.5">Demande</span>
        </button>
        <MobileNavItem icon={<MessageSquare size={22} />} label="Mensagens" active onClick={() => navigate('/chat')} testid="mob-nav-msg" />
      </nav>
    </div>
  );
}

const MobileNavItem = ({ icon, label, onClick, active, testid }) => (
  <button
    onClick={onClick}
    data-testid={testid}
    className={`flex flex-col items-center gap-0.5 px-2 py-1 min-w-[60px] ${active ? 'text-gray-900' : 'text-gray-500'}`}
  >
    {icon}
    <span className="text-[11px] font-medium">{label}</span>
  </button>
);

// ===== Helper components =====
const NavBtn = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    data-testid={`nav-${label.toLowerCase()}`}
    className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition ${
      active ? 'text-[#16a34a]' : 'text-gray-600 hover:text-gray-900'
    }`}
  >
    {icon}
    <span className="text-[11px] font-medium">{label}</span>
  </button>
);

const ActionBtn = ({ icon, label, onClick, testid }) => (
  <button
    onClick={onClick}
    data-testid={testid}
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:border-gray-400 hover:bg-gray-50 transition"
  >
    {icon}
    {label}
  </button>
);

const PanelLink = ({ icon, label, onClick, danger, testid }) => (
  <button
    onClick={onClick}
    data-testid={testid}
    className={`w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm transition ${
      danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
    }`}
  >
    <span className={danger ? 'text-red-500' : 'text-gray-500'}>{icon}</span>
    <span className="flex-1 text-left">{label}</span>
    <ChevronRight size={14} className="text-gray-300" />
  </button>
);

const ModalShell = ({ title, children, onClose }) => (
  <div
    className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
    onClick={onClose}
    data-testid="action-modal"
  >
    <div
      className="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl p-6 max-h-[90dvh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100" data-testid="action-modal-close">
          <XIcon size={20} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const MoreOption = ({ icon, label, onClick, danger }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition ${
      danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-800 hover:bg-gray-50'
    }`}
  >
    {icon}
    <span className="flex-1 text-left font-medium">{label}</span>
    <ChevronRight size={14} className="text-gray-300" />
  </button>
);

const TileOption = ({ icon, label, onClick, bg = 'bg-gray-50' }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-1.5 group"
  >
    <div className={`w-full aspect-square rounded-2xl ${bg} grid place-items-center group-hover:scale-105 transition`}>
      {icon}
    </div>
    <span className="text-[11px] text-gray-700 text-center leading-tight">{label}</span>
  </button>
);


