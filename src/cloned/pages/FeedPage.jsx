import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../ClonedAuthContext';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Heart, Share2, MessageSquare, MapPin, Globe, Camera, X, Home as HomeIcon, Users, Plus, BarChart3, MessageCircle, Settings, Film, Wrench, Bell, Menu } from 'lucide-react';
import VideoPlayer from '../components/VideoPlayer';
import { Dialog, DialogContent } from '../components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getStableDefaultAvatarUrl } from '../lib/authProfile';

// Local fallback store so the feed works even without auth/backend
const LOCAL_KEY = 'cloned_feed_posts_v1';
const loadLocalPosts = () => {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; }
};
const saveLocalPosts = (posts) => {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(posts.slice(0, 50))); } catch {}
};

const CATEGORY_OPTIONS = [
  { value: 'food', label: 'Alimentação' },
  { value: 'legal', label: 'Jurídico' },
  { value: 'health', label: 'Saúde' },
  { value: 'housing', label: 'Moradia' },
  { value: 'work', label: 'Trabalho' },
  { value: 'education', label: 'Educação' },
  { value: 'social', label: 'Social' },
  { value: 'clothes', label: 'Roupas' },
  { value: 'furniture', label: 'Móveis' },
  { value: 'transport', label: 'Transporte' },
  { value: 'repairs', label: 'Reparos' },
];

const PREVIEW_POSTS = [
  {
    id: 'preview-need-1',
    user_id: 'preview-migrant-1',
    type: 'need',
    category: 'housing',
    title: 'Procuro hospedagem temporária em Paris',
    description: 'Cheguei recentemente com minha família e precisamos de uma indicação segura de quarto ou acolhimento por alguns dias.',
    images: ['https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=900&q=85'],
    videos: [],
    budget: 'Até €35/noite',
    likes_count: 18,
    comments_count: 6,
    created_at: new Date(Date.now() - 1000 * 60 * 24).toISOString(),
    location: { address: 'Paris 18e, France', city: 'Paris' },
    user: { name: 'Mariana Silva', avatar: 'https://i.pravatar.cc/150?u=mariana-pertodemimservicos' },
  },
  {
    id: 'preview-offer-1',
    user_id: 'preview-helper-1',
    type: 'offer',
    category: 'legal',
    title: 'Orientação gratuita para documentação',
    description: 'Sou voluntário e posso ajudar com leitura de cartas administrativas, agendamento e dúvidas sobre regularização.',
    images: ['https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=900&q=85'],
    videos: [],
    budget: 'Voluntário',
    likes_count: 42,
    comments_count: 11,
    created_at: new Date(Date.now() - 1000 * 60 * 58).toISOString(),
    location: { address: 'Bibliothèque François-Mitterrand', city: 'Paris' },
    user: { name: 'Lucas Martin', avatar: 'https://i.pravatar.cc/150?u=lucas-pertodemimservicos' },
  },
];

// Jataí-style PostCard rendering PertoDeMimServicos posts
const PostCard = ({ post, onChat }) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes_count || 0);
  const navigate = useNavigate();

  const handleRespond = () => {
    if (onChat && post.user_id) {
      navigate(`/direct-chat/${post.user_id}`);
    } else {
      toast.info('Abrindo conversa...');
    }
  };

  const displayName = post.user?.name || 'Usuário';
  const avatarFallback = displayName.charAt(0).toUpperCase();
  const avatarUrl = post.user?.avatar || `https://i.pravatar.cc/150?u=${post.user_id || displayName}`;
  const description = post.description || post.title || '';
  const time = post.created_at ? new Date(post.created_at).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'agora';
  const images = Array.isArray(post.images) ? post.images.filter(Boolean) : [];
  const videos = Array.isArray(post.videos) ? post.videos.filter(Boolean) : [];
  const budget = post.budget;
  const location = post.location?.address || post.location?.city || 'Paris';

  return (
    <Card className="p-0 mb-3 hover:shadow-md transition-shadow border border-gray-200" data-testid="post-card">
      <div className="flex items-center justify-between px-3 pt-2 pb-1.5">
        <div className="flex items-center gap-1.5 text-[10px] text-gray-700">
          <Globe className="w-3 h-3" />
          <span className="font-medium">Demanda pública</span>
        </div>
        <span className="text-[10px] text-gray-500">postado às {time}</span>
      </div>

      <div className="px-3 pb-3">
        <div className="flex items-start space-x-2.5 mb-2">
          <Avatar className="w-9 h-9">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback>{avatarFallback}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm mb-1.5">{displayName}</h3>
            {post.title && <p className="text-xs font-medium text-gray-900 mb-1">{post.title}</p>}
            <p className="text-xs text-gray-800 leading-relaxed">{description}</p>

            {images.length > 0 && (
              <div className={`mt-2 mb-2 ${images.length === 1 ? '' : 'grid grid-cols-2 gap-2'}`}>
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    data-testid={`post-card-img-${idx}`}
                    className={`relative overflow-hidden rounded-md border border-gray-200 bg-gray-50 ${images.length === 1 ? 'max-h-[500px]' : 'aspect-square'}`}
                  >
                    <img
                      src={img}
                      alt={`Mídia ${idx + 1}`}
                      className={`w-full h-full ${images.length === 1 ? 'object-contain' : 'object-cover'}`}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                ))}
              </div>
            )}

            {videos.length > 0 && (
              <div className="mt-2 mb-2 space-y-2">
                {videos.map((vid, idx) => (
                  <VideoPlayer
                    key={idx}
                    src={vid}
                    testid={`post-card-video-${idx}`}
                  />
                ))}
              </div>
            )}

            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-gray-600">
              <MapPin className="w-3 h-3" />
              <span>{location}</span>
            </div>
            {budget && (
              <p className="text-[10px] text-gray-700 mt-0.5">
                Orçamento: <span className="font-semibold">{budget}</span>
              </p>
            )}
            <p className="text-[10px] text-gray-600 mt-0.5">
              Categoria: <span className="font-medium capitalize">{post.category || 'geral'}</span>
            </p>
          </div>
        </div>

        <div className="text-right text-[10px] text-gray-500 mb-1.5">{likeCount} curtidas</div>
        <div className="text-right text-[10px] text-gray-500 mb-2">{post.comments_count || 0} respostas</div>

        <div className="flex items-center justify-start gap-3 pt-2 border-t border-gray-100">
          <button
            onClick={() => { setLiked(!liked); setLikeCount(p => liked ? p - 1 : p + 1); }}
            className={`flex items-center gap-1.5 text-xs transition-colors ${liked ? 'text-red-500' : 'text-gray-600 hover:text-red-500'}`}
            data-testid="post-like-btn"
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-red-500' : ''}`} />
            <span>Curtir</span>
          </button>
          <button
            onClick={() => toast.success('Recomendado!')}
            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>Recomendar</span>
          </button>
          <button
            onClick={handleRespond}
            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-green-600 transition-colors"
            data-testid="post-respond-btn"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Responder</span>
          </button>
        </div>
      </div>
    </Card>
  );
};

export default function FeedPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, token } = useContext(AuthContext);

  const [posts, setPosts] = useState([]);
  const [showBanner, setShowBanner] = useState(true);
  const [loadingPost, setLoadingPost] = useState(false);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalMode, setModalMode] = useState('need'); // 'need' (Demanda pública) | 'offer' (Serviço voluntário)

  // Form fields
  const [postDescription, setPostDescription] = useState('');
  const [postAddress, setPostAddress] = useState('');
  const [detectingAddress, setDetectingAddress] = useState(false);

  const detectAddress = React.useCallback(() => {
    if (!navigator.geolocation) return;
    setDetectingAddress(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const d = await r.json();
          setPostAddress(d.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        } catch {
          setPostAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        }
        setDetectingAddress(false);
      },
      () => setDetectingAddress(false),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  useEffect(() => { detectAddress(); }, [detectAddress]);
  const [postBudget, setPostBudget] = useState('Sob orçamento');
  const [postCategory, setPostCategory] = useState('social');
  const [selectedPhotos, setSelectedPhotos] = useState([]); // [{id, dataUrl}]
  const [selectedVideos, setSelectedVideos] = useState([]); // [{id, dataUrl}]

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const authed = !!session?.session;

      // 1) local posts always shown
      const local = loadLocalPosts();

      // 2) supabase posts when authenticated
      let remote = [];
      if (authed) {
        const { data: svc } = await supabase
          .from('svc_posts')
          .select('*')
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(50);
        const ids = Array.from(new Set((svc ?? []).map(p => p.user_id)));
        let profMap = {};
        if (ids.length) {
          const { data: profs } = await supabase
            .from('svc_profiles')
            .select('user_id, display_name, avatar_url')
            .in('user_id', ids);
          (profs ?? []).forEach(p => { profMap[p.user_id] = p; });
        }
        remote = (svc ?? []).map(p => ({
          id: p.id,
          user_id: p.user_id,
          type: p.post_type === 'volunteer' ? 'offer' : 'need',
          category: p.category_slug || 'social',
          title: p.title,
          description: p.description,
          images: p.photos || [],
          videos: [],
          budget: p.budget_range,
          likes_count: 0,
          comments_count: 0,
          created_at: p.created_at,
          location: { address: p.address || 'Paris', city: 'Paris' },
          user: {
            name: profMap[p.user_id]?.display_name || 'Usuário',
            avatar: profMap[p.user_id]?.avatar_url,
          },
        }));
      }

      const combined = [...local, ...remote];
      setPosts(combined.length ? combined : PREVIEW_POSTS);
    } catch (e) {
      console.error('Failed to fetch posts', e);
      const local = loadLocalPosts();
      setPosts(local.length ? [...local, ...PREVIEW_POSTS] : PREVIEW_POSTS);
    }
  };

  const openModal = (mode) => {
    setModalMode(mode);
    setPostDescription('');
    setPostBudget(mode === 'need' ? 'Sob orçamento' : 'A combinar');
    setPostCategory('social');
    setSelectedPhotos([]);
    setSelectedVideos([]);
    setShowCreateModal(true);
  };

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (selectedPhotos.length + files.length > 3) {
      toast.error('Máximo 3 fotos');
      e.target.value = '';
      return;
    }
    files.forEach((file) => {
      if (file.size > 5_000_000) {
        toast.error(`${file.name}: máx. 5MB`);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedPhotos((prev) => [
          ...prev,
          { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, dataUrl: reader.result },
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleVideoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (selectedVideos.length + files.length > 1) {
      toast.error('Máximo 1 vídeo');
      e.target.value = '';
      return;
    }
    files.forEach((file) => {
      if (file.size > 4_000_000) {
        toast.error(`Vídeo muito grande (${(file.size / 1_000_000).toFixed(1)}MB). Máximo 4MB.`);
        e.target.value = '';
        return;
      }
      const mime = (file.type || '').toLowerCase();
      if (mime.includes('quicktime') || file.name.toLowerCase().endsWith('.mov')) {
        toast.error('Formato MOV não roda em todos os navegadores. Use MP4.');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedVideos((prev) => [
          ...prev,
          { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, dataUrl: reader.result },
        ]);
        toast.success('Vídeo adicionado!');
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removePhoto = (id) => setSelectedPhotos((prev) => prev.filter((p) => p.id !== id));
  const removeVideo = (id) => setSelectedVideos((prev) => prev.filter((v) => v.id !== id));

  const handlePostSubmit = async () => {
    if (!postDescription.trim()) {
      toast.error('Adicione uma descrição');
      return;
    }
    setLoadingPost(true);
    try {
      const newPost = {
        id: `local-${Date.now()}`,
        user_id: user?.id || 'local-user',
        type: modalMode,
        category: postCategory,
        title: postDescription.slice(0, 60),
        description: postDescription,
        images: selectedPhotos.map((p) => p.dataUrl),
        videos: selectedVideos.map((v) => v.dataUrl),
        budget: postBudget,
        likes_count: 0,
        comments_count: 0,
        created_at: new Date().toISOString(),
        location: { address: postAddress, city: 'Paris' },
        user: { name: user?.name || 'Você', avatar: user?.avatar },
      };

      // Try to persist to Supabase if logged in
      const { data: session } = await supabase.auth.getSession();
      if (session?.session) {
        const uid = session.session.user.id;
        const { error } = await supabase.from('svc_posts').insert({
          user_id: uid,
          title: newPost.title,
          description: newPost.description,
          photos: newPost.images.filter(u => u && !u.startsWith('data:')),
          budget_range: postBudget || null,
          category_slug: postCategory || null,
          address: postAddress || null,
          post_type: modalMode === 'offer' ? 'volunteer' : 'paid',
          status: 'open',
        });
        if (error) console.warn('svc_posts insert failed, keeping local only:', error.message);
      }

      // Optimistic local persistence so the post always appears
      const local = loadLocalPosts();
      const updated = [newPost, ...local];
      saveLocalPosts(updated);
      setPosts((prev) => [newPost, ...prev]);

      toast.success(modalMode === 'need' ? 'Sua demanda foi publicada!' : 'Seu serviço foi publicado!');
      setShowCreateModal(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      console.error(e);
      toast.error('Erro ao publicar');
    } finally {
      setLoadingPost(false);
    }
  };


  const userAvatar = user?.avatar_url || user?.avatar || getStableDefaultAvatarUrl(user);
  const userInitial = (user?.name || 'U').charAt(0).toUpperCase();

  return (
    <div
      className="min-h-screen bg-gray-50 pb-20 lg:pb-0"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}
      data-testid="feed-page"
    >
      {/* Top Navigation - Jataí Style */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-[1200px] mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            {/* Mobile: Jataí Região logo (left) */}
            <div className="flex items-center gap-2 lg:hidden">
              <div className="w-9 h-9 rounded-xl grid place-items-center text-white font-extrabold text-lg" style={{ background: 'linear-gradient(135deg,#22c55e 0%,#f97316 100%)' }}>
                W
              </div>
              <span className="text-base font-extrabold leading-tight">
                <span className="text-green-500">PertoDeMim</span>
                <span className="text-orange-500">Servicos</span>
              </span>
            </div>

            {/* Mobile right cluster: bell + avatar + menu */}
            <div className="flex items-center gap-3 lg:hidden">
              <button className="relative" data-testid="notifications-btn" onClick={() => toast.info('Notificações em breve')}>
                <Bell className="w-6 h-6 text-gray-800" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              </button>
              <button onClick={() => navigate('/profile')} data-testid="mobile-avatar" className="rounded-full ring-2 ring-green-400">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={userAvatar} />
                  <AvatarFallback>{userInitial}</AvatarFallback>
                </Avatar>
              </button>
              <button data-testid="mobile-menu" onClick={() => navigate('/profile')} className="text-gray-700">
                <Menu className="w-6 h-6" />
              </button>
            </div>

            {/* Desktop: Logo (PertoDeMimServicos unchanged) */}
            <div className="hidden lg:flex items-center justify-center lg:justify-start">
              <span className="text-base font-bold">
                <span className="text-green-500">PertoDeMim</span>
                <span className="text-orange-500">Servicos</span>
              </span>
              <p className="hidden lg:block text-[10px] text-gray-500 ml-2">Paris (France)</p>
            </div>

            {/* Desktop: Navigation */}
            <nav className="hidden lg:flex flex-1 items-center justify-center gap-6 xl:gap-8 mx-4">
              <button onClick={() => navigate('/home')} className="flex flex-col items-center text-gray-700 hover:text-gray-900 transition-colors">
                <HomeIcon className="w-5 h-5 mb-0.5" />
                <span className="text-[10px]">Início</span>
              </button>
              <button onClick={() => navigate('/volunteers')} className="flex flex-col items-center text-gray-700 hover:text-gray-900 transition-colors">
                <Users className="w-5 h-5 mb-0.5" />
                <span className="text-[10px]">Voluntários</span>
              </button>
              <button
                onClick={() => openModal('need')}
                className="flex flex-col items-center text-green-600 -mt-1"
                data-testid="nav-publish-desktop"
              >
                <div className="w-11 h-11 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-green-600 transition-colors">
                  <Plus className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <span className="text-[10px] mt-1">Publicar</span>
              </button>
              <button onClick={() => navigate('/housing')} className="flex flex-col items-center text-gray-700 hover:text-gray-900 transition-colors">
                <BarChart3 className="w-5 h-5 mb-0.5" />
                <span className="text-[10px]">Moradia</span>
              </button>
              <button onClick={() => navigate('/assinatura')} className="flex flex-col items-center text-gray-700 hover:text-gray-900 transition-colors" data-testid="nav-assinatura-desktop">
                <BarChart3 className="w-5 h-5 mb-0.5" />
                <span className="text-[10px]">Assinatura</span>
              </button>
              {user?.role === 'admin' && (
                <button onClick={() => navigate('/admin')} className="flex flex-col items-center text-gray-700 hover:text-gray-900 transition-colors">
                  <Settings className="w-5 h-5 mb-0.5" />
                  <span className="text-[10px]">Dashboard</span>
                </button>
              )}
              <button onClick={() => navigate('/chat')} className="flex flex-col items-center text-gray-700 hover:text-gray-900 transition-colors">
                <MessageCircle className="w-5 h-5 mb-0.5" />
                <span className="text-[10px]">Mensagens</span>
              </button>
            </nav>

            {/* Desktop: User Avatar */}
            <button
              onClick={() => navigate('/profile')}
              className="hidden lg:flex items-center space-x-2 cursor-pointer hover:bg-gray-50 px-3 py-1 rounded-lg transition-colors"
              data-testid="desktop-avatar"
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={userAvatar} />
                <AvatarFallback>{userInitial}</AvatarFallback>
              </Avatar>
              <div className="text-xs">
                <p className="font-medium">{user?.name || 'Usuário'}</p>
              </div>
            </button>

            
          </div>
        </div>

        {/* Mobile-only: Location pill */}
        <div className="lg:hidden px-4 pb-2">
          <button
            onClick={() => navigate('/profile')}
            data-testid="location-pill"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition"
          >
            <MapPin className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs text-gray-700">
              {user?.location?.address || user?.location?.city || 'Jataí, Goiás'}
            </span>
          </button>
        </div>
      </header>

      {/* Premium Banner (mobile = "Torne-se Premier!", desktop = "Apoio Solidário") */}
      {showBanner && (
        <>
          {/* Mobile Premium banner (matches IMG_7748) */}
          <div className="lg:hidden bg-orange-50 px-5 py-4 relative">
            <button
              onClick={() => setShowBanner(false)}
              className="absolute top-2 right-3 text-gray-500 hover:text-gray-900"
              data-testid="close-banner-mobile"
            >
              <X className="w-4 h-4" />
            </button>
            <p className="text-[13px] text-orange-400 italic text-center font-medium leading-tight pr-6">
              Acesse novamente ferramentas e serviços exclusivos:
              <br />
              <span className="font-bold not-italic">torne-se Premier!</span>
            </p>
            <div className="flex justify-center mt-3">
              <button
                onClick={() => navigate('/assinatura')}
                data-testid="premium-cta-mobile"
                className="bg-[#ff8d83] hover:bg-[#ff7268] text-white font-semibold rounded-full px-8 h-10 shadow-sm text-sm"
              >
                Assinar novamente
              </button>
            </div>
          </div>

          {/* Desktop banner (unchanged) */}
          <div className="hidden lg:block bg-gradient-to-r from-[#FFB6A3] to-[#FFA08A] px-4 py-3 relative">
            <button
              onClick={() => setShowBanner(false)}
              className="absolute top-1 right-2 text-gray-700 hover:text-gray-900"
              data-testid="close-banner"
            >
              <X className="w-4 h-4" />
            </button>
            <p className="text-xs text-gray-800 text-center font-medium mb-2 pr-6">
              Encontre apoio solidário ou ofereça seus serviços para a comunidade migrante!
            </p>
            <div className="flex justify-center">
              <Button
                onClick={() => navigate('/assinatura')}
                className="bg-white hover:bg-gray-50 text-gray-800 font-semibold rounded-full px-6 h-9 shadow-sm text-sm"
                data-testid="banner-cta"
              >
                Assinatura
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="max-w-[1200px] mx-auto px-3 lg:px-4 py-3">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column - Posts */}
          <div className="lg:col-span-7">
            {posts.length === 0 ? (
              <Card className="p-6 text-center text-gray-500">Nenhuma demanda ainda. Seja o primeiro a publicar!</Card>
            ) : (
              posts.map((post) => <PostCard key={post.id} post={post} onChat />)
            )}
          </div>

          {/* Right Sidebar - Post Creation + Monetization */}
          <div className="lg:col-span-5 space-y-3">
            <Card id="post-create-card" className="p-4 bg-gray-50 border border-gray-200">
              <h3 className="font-medium text-sm mb-3">Olá, {user?.name?.split(' ')[0] || ''}</h3>

              <div className="mb-3">
                <label className="text-xs font-semibold mb-1 block">Descrição da sua solicitação</label>
                <textarea
                  value={postDescription}
                  onChange={(e) => setPostDescription(e.target.value)}
                  placeholder="Descreva sua necessidade em detalhes..."
                  className="w-full h-20 text-xs bg-white border border-gray-300 rounded-md p-2 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                  data-testid="feed-post-description"
                />
              </div>

              <div className="mb-3">
                <h4 className="text-xs font-semibold mb-1">Adicione fotos</h4>
                <p className="text-[10px] text-gray-600 mb-2 leading-relaxed">
                  Aumente suas chances em 25% ilustrando sua necessidade.
                </p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[0, 1, 2].map((index) => {
                    const photo = selectedPhotos[index];
                    return (
                      <div key={index} className="relative aspect-square">
                        {photo ? (
                          <>
                            <img
                              src={photo.dataUrl}
                              alt="Preview"
                              className="w-full h-full object-cover rounded-lg border-2 border-gray-300"
                            />
                            <button
                              onClick={() => removePhoto(photo.id)}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg"
                              data-testid={`remove-feed-photo-${index}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <label
                            className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-green-400 hover:bg-white transition-all bg-white"
                            data-testid={`feed-photo-slot-${index}`}
                          >
                            <Camera className="w-5 h-5 text-gray-400" />
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoSelect}
                              className="hidden"
                              data-testid={`feed-photo-input-${index}`}
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mb-3">
                <label className="text-xs font-semibold mb-1 block">Endereço</label>
                <div className="flex gap-2">
                  <Input
                    value={postAddress}
                    onChange={(e) => setPostAddress(e.target.value)}
                    placeholder={detectingAddress ? 'Detectando...' : 'Endereço completo'}
                    className="h-8 text-xs bg-white border-gray-300 flex-1"
                    data-testid="feed-post-address"
                  />
                  <button type="button" onClick={detectAddress} disabled={detectingAddress} className="text-xs text-orange-500 font-semibold hover:underline disabled:opacity-50 whitespace-nowrap">
                    {detectingAddress ? '...' : '📍 Detectar'}
                  </button>
                </div>
              </div>

              <Button
                onClick={handlePostSubmit}
                disabled={loadingPost}
                className="w-full bg-green-500 hover:bg-green-600 text-white rounded-full h-9 font-semibold shadow-sm text-sm"
                data-testid="feed-publish-button"
              >
                {loadingPost ? 'Publicando...' : 'Publicar minha solicitação'}
              </Button>
            </Card>

            <Card className="p-4 bg-white border border-gray-200">
              <h3 className="font-bold text-base mb-2">Arredonde seus fins de mês</h3>
              <p className="text-xs text-gray-700 mb-3 leading-relaxed">
                Responda às solicitações publicadas perto de você e ajude pessoas que precisam.
              </p>
              <Button
                onClick={() => navigate('/volunteers')}
                className="w-full bg-[#FF9B8A] hover:bg-[#FF8A79] text-white rounded-full h-9 font-semibold shadow-sm text-sm"
                data-testid="monetize-cta"
              >
                Oferecer meus serviços
              </Button>
            </Card>

            <Card className="p-4 bg-white border border-gray-200">
              <h3 className="font-bold text-base mb-2">🏡 Moradia Solidária</h3>
              <p className="text-xs text-gray-700 mb-3 leading-relaxed">
                Encontre ou ofereça hospedagem para migrantes em Paris.
              </p>
              <Button
                onClick={() => navigate('/housing')}
                className="w-full bg-green-500 hover:bg-green-600 text-white rounded-full h-9 font-semibold shadow-sm text-sm"
                data-testid="housing-cta"
              >
                Ver Hospedagens
              </Button>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation - Jataí Região Style (matches IMG_7748) */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 pt-2 pb-2 flex items-end justify-around z-50 lg:hidden"
        data-testid="bottom-navigation"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
      >
        <button onClick={() => navigate('/home')} className="flex flex-col items-center gap-0.5 p-1 min-w-[56px]" data-testid="nav-home">
          <HomeIcon className="w-6 h-6 text-[#8b5cf6]" strokeWidth={2} />
          <span className="text-[11px] text-[#8b5cf6] font-semibold">Accueil</span>
        </button>

        <button onClick={() => navigate('/volunteers')} className="flex flex-col items-center gap-0.5 p-1 min-w-[56px] relative" data-testid="nav-volunteers">
          <div className="relative">
            <Users className="w-6 h-6 text-gray-500" />
            <span className="absolute -top-2 -right-3 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">999+</span>
          </div>
          <span className="text-[11px] text-gray-600">Ofertantes</span>
        </button>

        <button
          onClick={() => openModal('need')}
          className="flex flex-col items-center gap-0.5 p-1 min-w-[56px] relative"
          data-testid="nav-publish-center"
        >
          <div className="w-14 h-14 -mt-7 bg-[#8b5cf6] rounded-full flex items-center justify-center shadow-lg shadow-orange-500/40 hover:bg-[#7c3aed] transition-colors">
            <Plus className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
        </button>

        <button onClick={() => navigate('/assinatura')} className="flex flex-col items-center gap-0.5 p-1 min-w-[56px] relative" data-testid="nav-abonnement">
          <div className="relative">
            <BarChart3 className="w-6 h-6 text-gray-500" />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-bold w-4 h-4 grid place-items-center rounded-full leading-none">1</span>
          </div>
          <span className="text-[11px] text-gray-600">Assinatura</span>
        </button>

        <button onClick={() => navigate('/chat')} className="flex flex-col items-center gap-0.5 p-1 min-w-[56px] relative" data-testid="nav-chat">
          <div className="relative">
            <MessageCircle className="w-6 h-6 text-gray-500" />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-bold w-4 h-4 grid place-items-center rounded-full leading-none">2</span>
          </div>
          <span className="text-[11px] text-gray-600">Mensagens</span>
        </button>
      </div>

      {/* ============ DEMANDA PUBLICA MODAL ============ */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent
          className="max-w-md p-0 overflow-hidden rounded-2xl border-2 border-blue-500 max-h-[90vh] overflow-y-auto"
          data-testid="demanda-modal"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-lg">
                <span className="inline-flex w-7 h-7 rounded-full bg-gray-100 items-center justify-center">
                  <MapPin className="w-4 h-4 text-gray-700" />
                </span>
                Demanda pública
              </div>
            </div>

            {/* Toggle: demanda paga vs ajuda voluntária */}
            <div className="flex gap-2 mb-5 bg-gray-100 p-1 rounded-full">
              <button
                onClick={() => setModalMode('need')}
                data-testid="mode-demanda"
                className={`flex-1 text-sm font-semibold py-2 px-3 rounded-full transition ${
                  modalMode === 'need' ? 'bg-white text-gray-900 shadow' : 'text-gray-500'
                }`}
              >
                Demanda paga
              </button>
              <button
                onClick={() => { setShowCreateModal(false); navigate('/volunteers'); }}
                data-testid="ajuda-voluntaria-btn"
                className="flex-1 text-sm font-semibold py-2 px-3 rounded-full text-orange-600 hover:bg-orange-50"
              >
                Ajuda Voluntária
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Descreva sua necessidade</label>
              <textarea
                value={postDescription}
                onChange={(e) => setPostDescription(e.target.value.slice(0, 250))}
                placeholder="Olá,"
                rows={4}
                className="w-full text-sm border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                data-testid="modal-description"
              />
              <p className="text-[11px] text-gray-400 mt-1">{postDescription.length}/250 min</p>
            </div>

            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-1">Adicione fotos</h4>
              <p className="text-[11px] text-gray-500 mb-3">
                Aumente suas chances de fazer negócio em 25% ilustrando sua necessidade.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((i) => {
                  const photo = selectedPhotos[i];
                  return (
                    <div key={i} className="aspect-square relative">
                      {photo ? (
                        <>
                          <img src={photo.dataUrl} alt="" className="w-full h-full object-cover rounded-xl border-2 border-gray-300" />
                          <button
                            onClick={() => removePhoto(photo.id)}
                            className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 text-white rounded-full grid place-items-center shadow"
                            data-testid={`modal-remove-photo-${i}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <label
                          className="w-full h-full border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition"
                          data-testid={`modal-photo-slot-${i}`}
                        >
                          <Camera className="w-6 h-6 text-gray-400" />
                          <span className="text-[10px] text-gray-400 mt-1">Adicionar</span>
                          <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-1">Adicione um vídeo</h4>
              <p className="text-[11px] text-gray-500 mb-3">
                Opcional · MP4/WebM até 4MB · Não suporta MOV do iPhone.
              </p>
              {selectedVideos.length > 0 ? (
                <div className="relative">
                  <VideoPlayer
                    src={selectedVideos[0].dataUrl}
                    className="max-h-48"
                    testid="modal-video-preview"
                  />
                  <button
                    onClick={() => removeVideo(selectedVideos[0].id)}
                    className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 text-white rounded-full grid place-items-center shadow"
                    data-testid="modal-remove-video"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label
                  className="w-full h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition"
                  data-testid="modal-video-slot"
                >
                  <Film className="w-6 h-6 text-gray-400" />
                  <span className="text-[11px] text-gray-500 mt-1">Adicionar vídeo (MP4)</span>
                  <input type="file" accept="video/mp4,video/webm" onChange={handleVideoSelect} className="hidden" />
                </label>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Endereço</label>
              <div className="flex gap-2">
                <Input
                  value={postAddress}
                  onChange={(e) => setPostAddress(e.target.value)}
                  className="h-10 text-sm rounded-xl border-gray-300 flex-1"
                  placeholder={detectingAddress ? 'Detectando localização...' : 'Endereço completo'}
                  data-testid="modal-address"
                />
                <button type="button" onClick={detectAddress} disabled={detectingAddress} className="px-3 text-sm text-orange-500 font-semibold hover:underline disabled:opacity-50 whitespace-nowrap">
                  {detectingAddress ? '...' : '📍 Detectar'}
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Orçamento</label>
              <select
                value={postBudget}
                onChange={(e) => setPostBudget(e.target.value)}
                data-testid="modal-budget"
                className="w-full h-10 text-sm border border-gray-300 rounded-xl px-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Selecione</option>
                <option value="Sob orçamento">Sob orçamento</option>
                <option value="Até R$ 100">Até R$ 100</option>
                <option value="R$ 100 - 300">R$ 100 - R$ 300</option>
                <option value="R$ 300 - 500">R$ 300 - R$ 500</option>
                <option value="R$ 500 - 1000">R$ 500 - R$ 1000</option>
                <option value="Acima de R$ 1000">Acima de R$ 1.000</option>
                <option value="A combinar">A combinar</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Categoria</label>
              <select
                value={postCategory}
                onChange={(e) => setPostCategory(e.target.value)}
                data-testid="modal-category"
                className="w-full h-10 text-sm border border-gray-300 rounded-xl px-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Selecione</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <Button
              onClick={handlePostSubmit}
              disabled={loadingPost || !postDescription.trim()}
              data-testid="modal-submit"
              className="w-full bg-green-500 hover:bg-green-600 text-white rounded-full h-12 font-bold shadow disabled:opacity-50"
            >
              {loadingPost ? 'Publicando...' : 'Postar minha demanda'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
