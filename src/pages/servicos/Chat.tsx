import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Home, Users, Plus, MessageCircle, User, Loader2, Star, Image as ImageIcon, Mic, MapPin, Square, X } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { toast } from '@/hooks/use-toast';

type Conversation = {
  id: string;
  user_a: string;
  user_b: string;
  last_message_at: string | null;
};
type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
};
type Profile = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  rating: number;
  role: string;
};

export default function ServicosChat() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const startWith = params.get('with'); // user_id to auto-open

  const [me, setMe] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async (myId: string) => {
    const { data } = await supabase
      .from('svc_conversations')
      .select('*')
      .or(`user_a.eq.${myId},user_b.eq.${myId}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });
    const convs = (data ?? []) as Conversation[];
    setConversations(convs);
    const otherIds = convs.map((c) => (c.user_a === myId ? c.user_b : c.user_a));
    if (otherIds.length) {
      const { data: profs } = await supabase
        .from('svc_profiles')
        .select('user_id, display_name, avatar_url, bio, city, rating, role')
        .in('user_id', otherIds);
      const map: Record<string, Profile> = {};
      (profs ?? []).forEach((p: any) => (map[p.user_id] = p));
      setProfiles((prev) => ({ ...prev, ...map }));
    }
    return convs;
  }, []);

  // Init
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/servicos/auth', { replace: true });
        return;
      }
      setMe(session.user.id);
      const convs = await loadConversations(session.user.id);

      if (startWith && startWith !== session.user.id) {
        const { data: convId, error } = await supabase.rpc('svc_get_or_create_conversation', {
          _other_user: startWith,
        });
        if (error) {
          toast({ title: 'Erro ao abrir conversa', description: error.message, variant: 'destructive' });
        } else if (convId) {
          await loadConversations(session.user.id);
          setActiveId(convId as string);
        }
      } else if (convs.length) {
        setActiveId(convs[0].id);
      }
      setLoading(false);
    })();
  }, [navigate, startWith, loadConversations]);

  // Load messages for active conversation + realtime
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    let mounted = true;
    supabase
      .from('svc_messages')
      .select('*')
      .eq('conversation_id', activeId)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (mounted) setMessages((data ?? []) as Message[]); });

    const channel = supabase
      .channel(`svc_msg_${activeId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'svc_messages',
        filter: `conversation_id=eq.${activeId}`,
      }, (payload) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === (payload.new as Message).id)) return prev;
          return [...prev, payload.new as Message];
        });
      })
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const insertMessage = async (payload: Partial<Message>) => {
    if (!me || !activeId) return;
    const { error } = await supabase.from('svc_messages').insert({
      conversation_id: activeId, sender_id: me, ...payload,
    });
    if (error) toast({ title: 'Erro ao enviar', description: error.message, variant: 'destructive' });
    if (me) loadConversations(me);
  };

  const send = async () => {
    if (!me || !activeId || !text.trim()) return;
    setSending(true);
    const content = text.trim();
    setText('');
    await insertMessage({ content });
    setSending(false);
  };

  const uploadAndSend = async (file: Blob, mediaType: 'image' | 'audio', ext: string) => {
    if (!me || !activeId) return;
    setSending(true);
    try {
      const path = `${me}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('svc-chat').upload(path, file, {
        contentType: file.type || (mediaType === 'image' ? 'image/jpeg' : 'audio/webm'),
      });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('svc-chat').getPublicUrl(path);
      await insertMessage({ media_url: data.publicUrl, media_type: mediaType });
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) uploadAndSend(f, 'image', f.name.split('.').pop() ?? 'jpg');
  };

  // Audio recording
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await uploadAndSend(blob, 'audio', 'webm');
        setRecording(false);
      };
      rec.start();
      mediaRecRef.current = rec;
      setRecording(true);
    } catch (err: any) {
      toast({ title: 'Microfone bloqueado', description: err.message, variant: 'destructive' });
    }
  };

  const stopRecording = () => mediaRecRef.current?.stop();

  const sendLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: 'Geolocalização não suportada', variant: 'destructive' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => insertMessage({ lat: pos.coords.latitude, lng: pos.coords.longitude, media_type: 'location' }),
      (err) => toast({ title: 'Localização negada', description: err.message, variant: 'destructive' }),
    );
  };



  const otherUserId = (c: Conversation) => (c.user_a === me ? c.user_b : c.user_a);
  const activeConv = conversations.find((c) => c.id === activeId);
  const activeOther = activeConv ? profiles[otherUserId(activeConv)] : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SEOHead title="Mensagens — PertoDeMimServicos" description="Conversas diretas." />

      {/* Header */}
      <header className="bg-green-600 text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate('/servicos/home')} className="flex items-center gap-2">
            <ArrowLeft className="w-5 h-5 md:hidden" />
            <h1 className="text-lg font-bold">Jataí Região Trabalho</h1>
          </button>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <button onClick={() => navigate('/servicos/home')} className="hover:underline">Acolhida</button>
            <a className="hover:underline cursor-pointer">Ofertantes</a>
            <a className="hover:underline cursor-pointer">Assinatura</a>
            <span className="font-semibold underline">Mensagens</span>
          </nav>
          <div className="w-10" />
        </div>
      </header>

      {/* 3-col layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto md:px-4 md:py-4 md:grid md:grid-cols-[280px_1fr_280px] md:gap-4 flex">
        {/* Sidebar conversas */}
        <aside className={`bg-white md:rounded-2xl md:shadow-sm overflow-hidden ${activeId ? 'hidden md:flex' : 'flex'} flex-col w-full`}>
          <div className="p-3 border-b font-semibold text-gray-700">Conversas</div>
          <ul className="flex-1 overflow-y-auto">
            {conversations.length === 0 && (
              <li className="p-6 text-sm text-gray-500 text-center">
                Nenhuma conversa. Abra um perfil em "Ofertantes" para iniciar.
              </li>
            )}
            {conversations.map((c) => {
              const oid = otherUserId(c);
              const p = profiles[oid];
              return (
                <li key={c.id}>
                  <button
                    onClick={() => setActiveId(c.id)}
                    className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 border-l-4 ${
                      activeId === c.id ? 'border-green-600 bg-green-50' : 'border-transparent'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold overflow-hidden flex-shrink-0">
                      {p?.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (p?.display_name?.[0] ?? '?').toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium truncate">{p?.display_name ?? 'Usuário'}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {c.last_message_at ? new Date(c.last_message_at).toLocaleString('pt-BR') : 'Nova conversa'}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Chat */}
        <section className={`bg-white md:rounded-2xl md:shadow-sm flex-col w-full ${activeId ? 'flex' : 'hidden md:flex'}`}>
          {activeConv ? (
            <>
              <div className="p-3 border-b flex items-center gap-3">
                <button onClick={() => setActiveId(null)} className="md:hidden">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold overflow-hidden">
                  {activeOther?.avatar_url ? (
                    <img src={activeOther.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (activeOther?.display_name?.[0] ?? '?').toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{activeOther?.display_name ?? 'Usuário'}</p>
                  {activeOther?.city && <p className="text-xs text-gray-500">{activeOther.city}</p>}
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50 min-h-[300px]">
                {messages.map((m) => {
                  const mine = m.sender_id === me;
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-3 py-2 rounded-2xl ${
                        mine ? 'bg-green-600 text-white rounded-br-sm' : 'bg-white border rounded-bl-sm'
                      }`}>
                        {m.media_type === 'image' && m.media_url && (
                          <a href={m.media_url} target="_blank" rel="noreferrer">
                            <img src={m.media_url} alt="" className="rounded-lg max-w-[240px] max-h-[240px] object-cover mb-1" />
                          </a>
                        )}
                        {m.media_type === 'audio' && m.media_url && (
                          <audio controls src={m.media_url} className="max-w-[240px]" />
                        )}
                        {m.media_type === 'location' && m.lat != null && m.lng != null && (
                          <a
                            href={`https://www.google.com/maps?q=${m.lat},${m.lng}`}
                            target="_blank" rel="noreferrer"
                            className={`flex items-center gap-1 text-sm underline ${mine ? 'text-white' : 'text-green-700'}`}
                          >
                            <MapPin className="w-4 h-4" /> Localização
                          </a>
                        )}
                        {m.content && (
                          <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                        )}
                        <p className={`text-[10px] mt-0.5 ${mine ? 'text-green-100' : 'text-gray-400'}`}>
                          {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {messages.length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-8">Diga olá 👋</p>
                )}
              </div>

              <form onSubmit={(e) => { e.preventDefault(); send(); }} className="p-3 border-t flex gap-2 items-center">
                <label className="cursor-pointer text-gray-500 hover:text-green-600 p-2" title="Enviar foto">
                  <ImageIcon className="w-5 h-5" />
                  <input type="file" accept="image/*" className="hidden" onChange={onPickImage} disabled={sending} />
                </label>
                <button
                  type="button"
                  onClick={sendLocation}
                  disabled={sending}
                  title="Enviar localização"
                  className="text-gray-500 hover:text-green-600 p-2"
                >
                  <MapPin className="w-5 h-5" />
                </button>
                {recording ? (
                  <button
                    type="button"
                    onClick={stopRecording}
                    title="Parar gravação"
                    className="text-red-600 animate-pulse p-2"
                  >
                    <Square className="w-5 h-5 fill-red-600" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={sending}
                    title="Gravar áudio"
                    className="text-gray-500 hover:text-green-600 p-2"
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                )}
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={recording ? 'Gravando áudio...' : 'Mensagem...'}
                  disabled={sending || recording}
                />
                <Button type="submit" disabled={sending || !text.trim()} className="bg-green-600 hover:bg-green-700">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-8">
              Selecione uma conversa
            </div>
          )}
        </section>

        {/* Perfil lateral */}
        <aside className={`hidden md:flex bg-white rounded-2xl shadow-sm flex-col overflow-hidden ${activeOther ? '' : 'opacity-50'}`}>
          {activeOther ? (
            <>
              <div className="p-6 text-center border-b">
                <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center text-green-700 text-2xl font-bold overflow-hidden">
                  {activeOther.avatar_url ? (
                    <img src={activeOther.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    activeOther.display_name?.[0]?.toUpperCase() ?? '?'
                  )}
                </div>
                <h3 className="mt-3 font-bold">{activeOther.display_name}</h3>
                <p className="text-xs text-gray-500 capitalize">{activeOther.role}</p>
                {activeOther.city && <p className="text-xs text-gray-500 mt-1">📍 {activeOther.city}</p>}
                <div className="flex items-center justify-center gap-1 mt-2 text-sm">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>{Number(activeOther.rating ?? 0).toFixed(1)}</span>
                </div>
              </div>
              {activeOther.bio && (
                <div className="p-4 text-sm text-gray-700">
                  <p className="font-semibold mb-1">Sobre</p>
                  <p className="whitespace-pre-wrap">{activeOther.bio}</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400 p-6">
              Sem perfil selecionado
            </div>
          )}
        </aside>
      </div>

      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t flex items-center justify-around h-16 z-50">
        <button onClick={() => navigate('/servicos/home')} className="flex flex-col items-center text-gray-500 text-xs">
          <Home className="w-5 h-5 mb-0.5" />Início
        </button>
        <button className="flex flex-col items-center text-gray-500 text-xs">
          <Users className="w-5 h-5 mb-0.5" />Ofertantes
        </button>
        <button
          onClick={() => navigate('/servicos/home')}
          className="flex flex-col items-center text-white text-xs bg-green-600 rounded-full w-14 h-14 -mt-8 shadow-lg"
        >
          <Plus className="w-7 h-7" />
        </button>
        <button className="flex flex-col items-center text-green-600 text-xs">
          <MessageCircle className="w-5 h-5 mb-0.5" />Mensagens
        </button>
        <button className="flex flex-col items-center text-gray-500 text-xs">
          <User className="w-5 h-5 mb-0.5" />Perfil
        </button>
      </nav>
    </div>
  );
}
