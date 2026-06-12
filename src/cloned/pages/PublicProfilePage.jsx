import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ArrowLeft, MapPin, MessageCircle, Star, Users, Calendar, Phone, Video, UserPlus, UserMinus, X, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import MiniGoogleMap from '../components/MiniGoogleMap';
import VerifiedBadge from '../components/VerifiedBadge';
import { isFriend, addFriend, removeFriend } from '../lib/friends';
import ProfileStories from '../components/ProfileStories';

const TABS = [
  { id: 'presentation', label: 'Apresentação' },
  { id: 'photos', label: 'Fotos' },
  { id: 'reviews', label: 'Avaliações' },
  { id: 'activity', label: 'Atividade' },
];

export default function PublicProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('presentation');
  const [me, setMe] = useState(null);
  const [friend, setFriend] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data?.user || null));
  }, []);

  useEffect(() => {
    setFriend(isFriend(me?.id, userId));
    const onChange = () => setFriend(isFriend(me?.id, userId));
    window.addEventListener('svc:friends-change', onChange);
    return () => window.removeEventListener('svc:friends-change', onChange);
  }, [me?.id, userId]);

  const toggleFriend = () => {
    if (!me?.id) { toast.error('Faça login para adicionar amigos.'); return; }
    if (me.id === userId) { toast.error('Você não pode adicionar a si mesmo.'); return; }
    if (friend) {
      removeFriend(me.id, userId);
      toast.success('Amizade desfeita.');
    } else {
      addFriend(me.id, { user_id: userId, display_name: profile?.display_name, avatar_url: profile?.avatar_url });
      toast.success('Amigo adicionado!');
    }
  };

  const [generatingCover, setGeneratingCover] = useState(false);
  const generateCover = async () => {
    if (!me?.id || me.id !== userId) return;
    setGeneratingCover(true);
    try {
      const prompt = `Capa de perfil cinematográfica, abstrata e elegante para ${profile.display_name || 'um profissional'}${profile.categories?.length ? `, área: ${profile.categories.join(', ')}` : ''}, cores suaves, banner horizontal 16:9`;
      const { data, error } = await supabase.functions.invoke('generate-cover-image', { body: { prompt } });
      if (error) throw error;
      const url = data?.imageUrl || data?.url || data?.image_url;
      if (!url) throw new Error('Sem imagem retornada');
      await supabase.rpc('upsert_own_svc_profile', { _values: { cover_url: url } });
      setProfile((p) => ({ ...p, cover_url: url }));
      toast.success('Capa gerada!');
    } catch (e) {
      console.error('[cover] failed', e);
      toast.error('Falha ao gerar capa: ' + (e?.message || 'erro'));
    } finally {
      setGeneratingCover(false);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: p }, { data: pp }] = await Promise.all([
        supabase.from('svc_profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('svc_posts').select('*').eq('user_id', userId).eq('status', 'open').order('created_at', { ascending: false }).limit(50),
      ]);
      setProfile(p);
      setPosts(pp || []);
      setLoading(false);
    })();
  }, [userId]);

  const ringUser = async (kind) => {
    try {
      const { data: { user: me } } = await supabase.auth.getUser();
      if (!me) { toast.error('Faça login para chamar.'); return; }
      if (me.id === userId) { toast.error('Você não pode chamar a si mesmo.'); return; }
      const room = `pertodemim-${userId.toString().slice(0, 8)}-${Date.now().toString(36)}`;
      const { data: myProfile } = await supabase
        .from('svc_profiles').select('display_name, avatar_url').eq('user_id', me.id).maybeSingle();
      const { error } = await supabase.from('calls').insert({
        caller_id: me.id,
        receiver_id: userId,
        caller_name: myProfile?.display_name || me.email,
        caller_avatar: myProfile?.avatar_url || null,
        room,
        kind,
        status: 'ringing',
      });
      if (error) throw error;
      toast.success(`Chamando ${profile.display_name}…`);
      navigate(`/call/${room}?kind=${kind}`);
    } catch (e) {
      console.error('[call] failed', e);
      toast.error('Não foi possível iniciar a chamada.');
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Carregando…</div>;
  if (!profile) return <div className="p-12 text-center text-gray-500">Perfil não encontrado.</div>;

  const initial = (profile.display_name || '?').charAt(0).toUpperCase();
  const allPhotos = posts.flatMap((p) => p.photos || []).filter(Boolean);
  const registeredAt = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';
  const hasCoords = profile.lat && profile.lng;

  return (
    <div className="min-h-screen bg-[#f5f7fb] pb-20">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-700 hover:text-gray-900"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="font-semibold text-sm">Perfil</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto">
        {/* Cover (com geração por IA quando dono) */}
        <div className="relative h-32 sm:h-40 bg-gradient-to-b from-slate-200 to-slate-100 overflow-hidden">
          {profile.cover_url && (
            <img src={profile.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          {me?.id === userId && (
            <button
              onClick={generateCover}
              disabled={generatingCover}
              className="absolute top-2 right-2 z-10 px-3 py-1.5 bg-black/60 hover:bg-black/80 text-white text-xs font-medium rounded-full backdrop-blur-sm flex items-center gap-1.5 disabled:opacity-60"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {generatingCover ? 'Gerando…' : 'Gerar capa com IA'}
            </button>
          )}
        </div>

        {/* Identity */}
        <div className="bg-white">
          <div className="px-4 sm:px-8 pb-4 -mt-14 sm:-mt-16 flex flex-col sm:flex-row sm:items-end gap-4 overflow-visible">
            <div className="relative shrink-0 mx-auto sm:mx-0">
              <Avatar className="w-28 h-28 sm:w-32 sm:h-32 ring-4 ring-white shadow-md">
                <AvatarImage src={profile.avatar_url} className="object-cover" />
                <AvatarFallback className="text-2xl">{initial}</AvatarFallback>
              </Avatar>
              <span className="absolute bottom-2 right-2 w-4 h-4 rounded-full bg-green-500 ring-2 ring-white" />
            </div>
            <div className="flex-1 min-w-0 sm:pb-2 text-center sm:text-left overflow-visible">
              <div className="flex flex-col sm:flex-row sm:items-start items-center gap-1 sm:gap-2">
                <h2 className="font-bold text-xl sm:text-2xl break-words max-w-full inline-flex items-center gap-1.5">{profile.display_name}<VerifiedBadge size={18} /></h2>
                <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full sm:mt-1.5 capitalize">
                  {profile.role === 'helper' || profile.role === 'volunteer' ? 'Ofertante' : 'Particular'}
                </span>
              </div>
              {profile.city && (
                <p className="text-sm text-gray-600 flex items-center justify-center sm:justify-start gap-1 mt-1"><MapPin className="w-3.5 h-3.5" />{profile.city}</p>
              )}
              {me?.id === userId && (
                <div className="mt-2 relative z-[60] flex justify-center sm:justify-start overflow-visible pb-2">
                  <ProfileStories avatarSrc={profile.avatar_url} userName={profile.display_name || 'Você'} />
                </div>
              )}
              <p className="text-xs text-green-600 mt-0.5">● Online</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:self-end">
              <Button
                onClick={toggleFriend}
                variant={friend ? 'outline' : 'default'}
                className={friend ? '' : 'bg-primary hover:bg-primary/90'}
              >
                {friend ? (
                  <><UserMinus className="w-4 h-4 mr-1.5" /> Desfazer amizade</>
                ) : (
                  <><UserPlus className="w-4 h-4 mr-1.5" /> Adicionar amigo</>
                )}
              </Button>
              <Button
                onClick={() => navigate(`/servicos/chat?userId=${userId}`)}
                className="bg-green-600 hover:bg-green-700"
              >
                <MessageCircle className="w-4 h-4 mr-1.5" /> Enviar mensagem
              </Button>
              <Button variant="outline" onClick={() => ringUser('audio')} title="Ligar">
                <Phone className="w-4 h-4 mr-1.5" /> Ligar
              </Button>
              <Button variant="outline" onClick={() => ringUser('video')} title="Chamada de vídeo">
                <Video className="w-4 h-4 mr-1.5" /> Vídeo
              </Button>
            </div>
          </div>


          {/* Tabs */}
          <div className="border-t border-gray-100">
            <div className="px-4 sm:px-8 flex gap-1 sm:gap-6 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-3 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
                    tab === t.id
                      ? 'border-gray-900 text-gray-900 font-semibold'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-8 py-6">
          {tab === 'presentation' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 md:col-span-1 space-y-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-gray-800">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{Number(profile.rating) > 0 ? Number(profile.rating).toFixed(1) : '—'}/5</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Nenhuma avaliação</p>
                </div>
                <hr />
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-gray-800">
                    <Calendar className="w-4 h-4" />
                    <span className="font-semibold text-sm">{registeredAt}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">data de inscrição</p>
                </div>
                <hr />
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-gray-800">
                    <Users className="w-4 h-4" />
                    <span className="font-semibold">{posts.length}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">anúncios publicados</p>
                </div>
              </Card>

              <Card className="p-4 md:col-span-2 space-y-4">
                {profile.bio ? (
                  <p className="text-sm text-gray-800 italic">« {profile.bio} »</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">Sem apresentação.</p>
                )}
                {profile.categories?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {profile.categories.map((c) => (
                      <span key={c} className="text-xs px-2.5 py-1 bg-green-50 text-green-700 rounded-full capitalize">{c}</span>
                    ))}
                  </div>
                )}
                {hasCoords && (
                  <div className="rounded-xl overflow-hidden ring-1 ring-black/5 shadow-sm">
                    <MiniGoogleMap lat={profile.lat} lng={profile.lng} height={260} zoom={13} />
                  </div>
                )}
              </Card>
            </div>
          )}

          {tab === 'photos' && (
            allPhotos.length === 0 ? (
              <Card className="p-8 text-center text-sm text-gray-500">Nenhuma foto publicada.</Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {allPhotos.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setLightbox(url)}
                    className="group relative w-full aspect-square overflow-hidden rounded-lg ring-1 ring-black/5 bg-gray-100"
                  >
                    <img
                      src={url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      style={{ imageRendering: 'auto' }}
                    />
                  </button>
                ))}
              </div>
            )
          )}

          {tab === 'reviews' && (
            <Card className="p-8 text-center text-sm text-gray-500">Ainda não há avaliações.</Card>
          )}

          {tab === 'activity' && (
            posts.length === 0 ? (
              <Card className="p-8 text-center text-sm text-gray-500">Sem atividade recente.</Card>
            ) : (
              <ul className="space-y-2">
                {posts.map((p) => (
                  <Card key={p.id} className="p-3 flex gap-3">
                    {p.photos?.[0] && (
                      <img src={p.photos[0]} alt="" className="w-20 h-20 object-cover rounded-md shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{p.title}</p>
                      <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">{p.description}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </Card>
                ))}
              </ul>
            )
          )}
        </div>
      </main>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white p-2 rounded-full bg-white/10 hover:bg-white/20"
            onClick={() => setLightbox(null)}
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightbox}
            alt=""
            className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
            decoding="async"
          />
        </div>
      )}
    </div>
  );
}
