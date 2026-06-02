import React, { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../ClonedAuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import BottomNav from '../components/BottomNav';
import { User, Mail, Globe, LogOut, Edit, Check, Heart, MapPin, Shield, Sparkles, Camera, HandHeart, ArrowRight, Image as ImageIcon, Wand2, Loader2, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getOrCreateSvcProfile, updateSvcProfile } from '../lib/authProfile';
import ServicesMap from '../components/ServicesMap';
import VerifiedBadge from '../components/VerifiedBadge';
import ProfileStories from '../components/ProfileStories';
import { CUSTOM_CATEGORY_VALUE, WORK_SERVICE_CATEGORIES, getWorkCategoryInfo } from '../lib/serviceCategories';
import { useUserLocation } from '../lib/userLocation';

const HELP_CATEGORIES = WORK_SERVICE_CATEGORIES;

export default function ProfilePage() {
  const { user, logout, refreshUser } = useContext(AuthContext);
  const { location: sharedLocation, setManualLocation, refreshAuto } = useUserLocation();
  const [locInput, setLocInput] = useState('');
  const [locatingShared, setLocatingShared] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCategoriesDialog, setShowCategoriesDialog] = useState(false);
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [useDisplayName, setUseDisplayName] = useState(user?.use_display_name || false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [customHelpCategory, setCustomHelpCategory] = useState('');
  const [savingCategories, setSavingCategories] = useState(false);
  const [activeTab, setActiveTab] = useState('presentation');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [avatarOverride, setAvatarOverride] = useState(null);
  const [coverOverride, setCoverOverride] = useState(null);
  const [showCoverDialog, setShowCoverDialog] = useState(false);
  const [coverPrompt, setCoverPrompt] = useState('');
  const [generatingCover, setGeneratingCover] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const [helpRequests, setHelpRequests] = useState([]);
  const [requestedCategories, setRequestedCategories] = useState([]);
  const [radiusKm, setRadiusKm] = useState(() => {
    const v = parseInt(localStorage.getItem('svc_radius_km') || '25', 10);
    return Number.isFinite(v) ? v : 25;
  });
  const serviceRole = user?.service_role || user?.role;
  const isVolunteer = serviceRole === 'volunteer' || serviceRole === 'helper';
  const profilePostTypeFilter = isVolunteer ? 'needs' : 'offers';
  const interestCategories = React.useMemo(
    () => Array.from(new Set([...(selectedCategories || []), ...(requestedCategories || [])])).filter((c) => c && c !== CUSTOM_CATEGORY_VALUE),
    [selectedCategories, requestedCategories]
  );

  const avatarSrc = avatarOverride || user?.avatar_url;
  const coverSrc = coverOverride || user?.cover_url;

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setUploadingCover(true);
    try {
      const path = `${user.id}/cover`;
      const { error: upErr } = await supabase.storage.from('svc-photos').upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('svc-photos').getPublicUrl(path);
      const newUrl = `${pub.publicUrl}?v=${Date.now()}`;
      await updateSvcProfile(user.id, { cover_url: newUrl });
      setCoverOverride(newUrl);
      await refreshUser?.();
      toast.success('Capa atualizada!');
      setShowCoverDialog(false);
    } catch (err) {
      toast.error(err?.message || 'Erro ao enviar capa');
    } finally {
      setUploadingCover(false);
      e.target.value = '';
    }
  };

  const generateCoverWithAI = async () => {
    if (!coverPrompt.trim() || !user?.id) {
      toast.error('Descreva a capa que você quer');
      return;
    }
    setGeneratingCover(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-cover-image', {
        body: { prompt: coverPrompt },
      });
      if (error) throw error;
      if (!data?.b64_json) throw new Error('Sem imagem');
      const blob = await (await fetch(`data:image/png;base64,${data.b64_json}`)).blob();
      const path = `${user.id}/cover.png`;
      const { error: upErr } = await supabase.storage.from('svc-photos').upload(path, blob, { upsert: true, contentType: 'image/png' });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('svc-photos').getPublicUrl(path);
      const newUrl = `${pub.publicUrl}?v=${Date.now()}`;
      await updateSvcProfile(user.id, { cover_url: newUrl });
      setCoverOverride(newUrl);
      await refreshUser?.();
      toast.success('Capa gerada com IA!');
      setShowCoverDialog(false);
      setCoverPrompt('');
    } catch (err) {
      toast.error(err?.message || 'Erro ao gerar imagem');
    } finally {
      setGeneratingCover(false);
    }
  };

  const fetchHelpRequests = React.useCallback(async () => {
    if (!user?.id) return;
    const cats = interestCategories;
    if (cats.length === 0) { setHelpRequests([]); return; }
    let query = supabase
      .from('svc_posts')
      .select('id, title, description, address, lat, lng, created_at, post_type, category_slug, user_id')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(80);
    query = isVolunteer ? query.neq('post_type', 'volunteer') : query.eq('post_type', 'volunteer');
    query = query.in('category_slug', cats);
    const { data, error } = await query;
    if (error) {
      console.warn('svc_posts profile fetch error', error);
      setHelpRequests([]);
      return;
    }
    let rows = data || [];
    // Distance filter (haversine) — only when user has location and posts have lat/lng
    const uLat = user?.lat;
    const uLng = user?.lng;
    if (uLat != null && uLng != null && radiusKm > 0) {
      const R = 6371;
      const toRad = (x) => (x * Math.PI) / 180;
      rows = rows.filter((p) => {
        if (p.lat == null || p.lng == null) return true; // keep unknown-location posts
        const dLat = toRad(p.lat - uLat);
        const dLng = toRad(p.lng - uLng);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(uLat)) * Math.cos(toRad(p.lat)) * Math.sin(dLng / 2) ** 2;
        const d = 2 * R * Math.asin(Math.sqrt(a));
        return d <= radiusKm;
      });
    }
    const selected = new Set(cats);
    setHelpRequests(rows.filter((p) => selected.has(p.category_slug)));
  }, [user?.id, user?.lat, user?.lng, interestCategories, radiusKm, isVolunteer]);

  useEffect(() => {
    fetchHelpRequests();
  }, [fetchHelpRequests]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data, error } = await supabase
        .from('svc_posts')
        .select('category_slug')
        .eq('user_id', user.id)
        .neq('post_type', 'volunteer')
        .eq('status', 'open');
      if (error) {
        console.warn('user requested categories fetch error', error);
        return;
      }
      setRequestedCategories(Array.from(new Set((data || []).map((p) => p.category_slug).filter(Boolean))));
    })();
  }, [user?.id]);

  // Realtime: refresh when new job posts appear
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('profile-svc-posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'svc_posts' }, () => fetchHelpRequests())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'svc_posts' }, () => fetchHelpRequests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, fetchHelpRequests]);

  const [helpFilter, setHelpFilter] = useState('all');
  const groupedHelp = React.useMemo(() => {
    const groups = {};
    helpRequests.forEach((p) => {
      const cats = [p.category_slug || 'reformas'];
      cats.forEach((c) => {
        if (!groups[c]) groups[c] = [];
        groups[c].push(p);
      });
    });
    return groups;
  }, [helpRequests]);

  const fetchPhotos = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase.storage
      .from('svc-photos')
      .list(`${user.id}/gallery`, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
    if (error) return;
    const urls = (data || []).filter(f => f.name && !f.name.startsWith('.')).map(f => {
      const { data: u } = supabase.storage.from('svc-photos').getPublicUrl(`${user.id}/gallery/${f.name}`);
      return { name: f.name, url: u.publicUrl };
    });
    setPhotos(urls);
  };

  useEffect(() => { fetchPhotos(); }, [user?.id]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setUploadingAvatar(true);
    try {
      const path = `${user.id}/avatar`;
      const { error: upErr } = await supabase.storage.from('svc-photos').upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('svc-photos').getPublicUrl(path);
      const newUrl = `${pub.publicUrl}?v=${Date.now()}`;
      await updateSvcProfile(user.id, { avatar_url: newUrl });
      setAvatarOverride(newUrl);
      await refreshUser?.();
      toast.success('Foto de perfil atualizada!');
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Erro ao enviar foto');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setUploadingPhoto(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/gallery/photo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('svc-photos').upload(path, file);
      if (upErr) throw upErr;
      toast.success('Foto adicionada!');
      fetchPhotos();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar foto');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const deletePhoto = async (name) => {
    if (!user?.id) return;
    const { error } = await supabase.storage.from('svc-photos').remove([`${user.id}/gallery/${name}`]);
    if (error) toast.error('Erro ao excluir');
    else { toast.success('Foto removida'); fetchPhotos(); }
  };

  useEffect(() => {
    fetchUserProfile();
    setDisplayName(user?.display_name || user?.name || '');
  }, [user?.id]);

  const fetchUserProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const profile = await getOrCreateSvcProfile(session.user);
      setSelectedCategories(profile?.categories || []);
      setDisplayName(profile?.display_name || user?.name || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const saveDisplayName = async () => {
    try {
      if (!user?.id) return;
      await updateSvcProfile(user.id, { display_name: displayName });
      await refreshUser?.();
      toast.success('Nome fictício atualizado!');
      setShowEditDialog(false);
    } catch (error) {
      toast.error('Erro ao atualizar');
    }
  };

  const toggleCategory = (category) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const saveCategories = async () => {
    setSavingCategories(true);
    try {
      if (!user?.id) return;
      let categoriesToSave = selectedCategories;
      if (selectedCategories.includes(CUSTOM_CATEGORY_VALUE)) {
        const name = customHelpCategory.trim();
        if (!name) {
          toast.error('Escreva sua categoria');
          setSavingCategories(false);
          return;
        }
        const { data: createdSlug, error: categoryError } = await supabase.rpc('ensure_svc_category', { _name: name });
        if (categoryError) throw categoryError;
        categoriesToSave = [...selectedCategories.filter((category) => category !== CUSTOM_CATEGORY_VALUE), createdSlug || 'outros'];
      }
      await updateSvcProfile(user.id, { categories: categoriesToSave });
      setSelectedCategories(categoriesToSave);
      setCustomHelpCategory('');
      await refreshUser?.();
      toast.success('Categorias atualizadas!');
      setShowCategoriesDialog(false);
    } catch (error) {
      toast.error('Erro de conexão');
    } finally {
      setSavingCategories(false);
    }
  };

  const getCategoryInfo = (value) => {
    return getWorkCategoryInfo(value);
  };

  return (
    <div className="min-h-screen bg-background pb-20" data-testid="profile-page">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 glassmorphism">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-heading font-bold text-textPrimary">{t('profile')}</h1>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="rounded-full text-red-600 border-red-200 hover:bg-red-50"
            data-testid="logout-button-top"
          >
            <LogOut size={16} className="mr-1.5" />
            Sair
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Hero estilo AlloVoisins */}
        <div className="bg-white rounded-3xl shadow-card overflow-hidden mb-6">
          {/* Cover banner com upload / IA */}
          <div
            className="relative h-40 sm:h-52 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-400 bg-cover bg-center group"
            style={coverSrc ? { backgroundImage: `url(${coverSrc})` } : undefined}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
            <button
              type="button"
              onClick={() => setShowCoverDialog(true)}
              className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-textPrimary text-xs font-semibold shadow-md backdrop-blur transition"
              data-testid="edit-cover-btn"
            >
              <Camera size={14} />
              {coverSrc ? 'Trocar capa' : 'Adicionar capa'}
            </button>
          </div>

          <Dialog open={showCoverDialog} onOpenChange={setShowCoverDialog}>
            <DialogContent className="rounded-3xl max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ImageIcon size={20} className="text-primary" /> Imagem de capa
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploadingCover}
                  className="w-full p-4 rounded-2xl border-2 border-dashed border-gray-200 hover:border-primary hover:bg-primary/5 transition flex items-center gap-3 text-left disabled:opacity-50"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {uploadingCover ? <Loader2 size={20} className="text-primary animate-spin" /> : <ImageIcon size={20} className="text-primary" />}
                  </div>
                  <div>
                    <p className="font-semibold text-textPrimary text-sm">Enviar do dispositivo</p>
                    <p className="text-xs text-textMuted">PNG ou JPG até 5MB</p>
                  </div>
                </button>
                <input ref={coverInputRef} type="file" accept="image/*" hidden onChange={handleCoverUpload} />

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-textMuted">ou</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Wand2 size={18} className="text-primary" />
                    <p className="font-semibold text-textPrimary text-sm">Criar com IA</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Reformas', prompt: 'reformas e construção civil, ferramentas, andaimes' },
                      { label: 'Pintura', prompt: 'pintura de paredes, rolos, latas de tinta coloridas' },
                      { label: 'Elétrica', prompt: 'instalação elétrica, fios, painel de energia' },
                      { label: 'Hidráulica', prompt: 'encanamento, tubulações, chave de grifa' },
                      { label: 'Marcenaria', prompt: 'marcenaria, madeira, serra e bancada de carpinteiro' },
                      { label: 'Pedreiro', prompt: 'pedreiro, alvenaria, tijolos e colher de pedreiro' },
                      { label: 'Limpeza', prompt: 'limpeza profissional, produtos e ambiente brilhando' },
                      { label: 'Jardinagem', prompt: 'jardinagem, plantas verdes, ferramentas de jardim' },
                      { label: 'Transporte', prompt: 'transporte e frete, caminhão de mudança' },
                      { label: 'Mecânica', prompt: 'mecânica automotiva, oficina, ferramentas' },
                    ].map((cat) => (
                      <button
                        key={cat.label}
                        type="button"
                        onClick={() => setCoverPrompt(cat.prompt)}
                        disabled={generatingCover}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                          coverPrompt === cat.prompt
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-textPrimary border-gray-200 hover:border-primary/50'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-textMuted">Não encontrou? Escreva sua própria categoria:</p>
                  <Input
                    placeholder="Ex: confeitaria artesanal, bolos decorados"
                    value={coverPrompt}
                    onChange={(e) => setCoverPrompt(e.target.value)}
                    disabled={generatingCover}
                    className="rounded-xl"
                  />
                  <Button
                    onClick={generateCoverWithAI}
                    disabled={generatingCover || !coverPrompt.trim()}
                    className="w-full rounded-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  >
                    {generatingCover ? (
                      <><Loader2 size={16} className="mr-2 animate-spin" /> Gerando... (10-20s)</>
                    ) : (
                      <><Wand2 size={16} className="mr-2" /> Gerar capa</>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Linha avatar + identidade */}
          <div className="px-6 sm:px-10 pb-6 -mt-14">
            <div className="flex flex-col sm:flex-row sm:items-end gap-5 overflow-visible">
              {/* Avatar grande com online dot */}
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full ring-4 ring-white shadow-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden">
                  {avatarSrc ? (
                    <img key={avatarSrc} src={avatarSrc} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={60} className="text-white" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full shadow-lg flex items-center justify-center border-2 border-white hover:bg-primary/90 transition disabled:opacity-60"
                  title="Alterar foto de perfil"
                  data-testid="change-avatar-btn"
                >
                  <Camera size={18} className="text-white" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>

              {/* Identidade */}
              <div className="flex-1 min-w-0 pt-2 sm:pb-1 overflow-visible">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                    {user?.role === 'helper' ? 'Profissional' : 'Particular'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-primary/10 text-primary rounded-md text-xs font-semibold">
                    <Shield size={11} /> Verificado
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-3xl font-heading font-bold text-textPrimary leading-tight flex items-center gap-1.5" data-testid="user-name">
                    {user?.use_display_name && user?.display_name ? user.display_name : user?.name}
                    <VerifiedBadge size={22} />
                  </h2>
                  <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                    <DialogTrigger asChild>
                      <button className="p-1.5 hover:bg-gray-100 rounded-full transition-all">
                        <Edit size={16} className="text-primary" />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="rounded-3xl">
                      <DialogHeader>
                        <DialogTitle>Nome Fictício (Privacidade)</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Nome Fictício</Label>
                          <Input
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Ex: Maria S., João A."
                            className="rounded-xl mt-2"
                          />
                          <p className="text-xs text-textMuted mt-2">
                            Este nome aparecerá nos posts em vez do seu nome real
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={useDisplayName}
                            onChange={(e) => setUseDisplayName(e.target.checked)}
                            className="w-5 h-5 rounded border-gray-300"
                          />
                          <Label>Usar nome fictício nos posts</Label>
                        </div>
                        <Button
                          onClick={saveDisplayName}
                          className="w-full rounded-full py-6 bg-primary hover:bg-primary-hover"
                        >
                          Salvar
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {user?.display_name && (
                  <p className="text-textSecondary font-semibold mt-1" data-testid="user-display-name">
                    {user.display_name}
                  </p>
                )}
                {user?.location && (
                  <p className="text-textSecondary flex items-center gap-1 mt-0.5">
                    <MapPin size={14} /> {user.location}
                  </p>
                )}
                {/* Bolinha única: Stories + Ao vivo (abaixo do nome/assinatura) */}
                <div className="mt-3 relative z-[60] overflow-visible pb-2">
                  <ProfileStories avatarSrc={avatarSrc} userName={user?.display_name || user?.name || 'Você'} />
                </div>
                <p className="text-green-600 text-sm font-medium flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full" /> Em linha
                </p>
              </div>
            </div>
          </div>


          {/* Tabs */}
          <div className="border-t border-gray-100 px-6 sm:px-10">
            <div className="flex gap-8 -mb-px overflow-x-auto">
              {[
                { id: 'presentation', label: 'Apresentação' },
                { id: 'photos', label: 'Fotos' },
                { id: 'reviews', label: 'Avaliações' },
                { id: 'activity', label: 'Atividade' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-textPrimary'
                      : 'border-transparent text-textMuted hover:text-textPrimary'
                  }`}
                  data-testid={`profile-tab-${tab.id}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Meus pedidos de trabalho */}
        <div className="bg-gradient-to-br from-rose-50 via-white to-orange-50 rounded-3xl shadow-card p-6 mb-6 border border-rose-100" data-testid="my-requests-panel">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-textPrimary flex items-center gap-2 text-lg">
                  {isVolunteer ? <HandHeart size={22} className="text-rose-500" /> : <Briefcase size={22} className="text-rose-500" />}
                  {isVolunteer ? 'Pedidos próximos para ajudar' : 'Propostas de emprego do seu interesse'}
                  {!isVolunteer && <span className="inline-block animate-bounce">💼</span>}
                </h3>
                <p className="text-xs text-textMuted mt-1">
                  {helpRequests.length} {isVolunteer ? 'pedido' : 'proposta'}{helpRequests.length !== 1 ? 's' : ''} · mapa conectado ao buscador por categoria e localização
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <Button
                  onClick={() => setShowCategoriesDialog(true)}
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  data-testid="change-interests-btn"
                >
                  Mudar categorias
                </Button>
                <Button
                  onClick={() => navigate('/offer-services')}
                  className="rounded-full bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white shadow-md"
                  size="sm"
                  data-testid="new-request-btn"
                >
                  Novo pedido <ArrowRight size={14} className="ml-1" />
                </Button>
              </div>
            </div>

            {/* Radius selector */}
            <div className="mb-4 p-3 rounded-2xl bg-white border border-rose-100 flex items-center gap-3">
              <MapPin size={16} className="text-rose-500 shrink-0" />
              <label className="text-xs font-semibold text-textSecondary whitespace-nowrap">
                Raio: <span className="text-rose-600">{radiusKm} km</span>
              </label>
              <input
                type="range"
                min={1}
                max={100}
                step={1}
                value={radiusKm}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setRadiusKm(v);
                  localStorage.setItem('svc_radius_km', String(v));
                }}
                className="flex-1 accent-rose-500"
                data-testid="radius-slider"
              />
            </div>

            {/* Filtro por categoria */}
            {Object.keys(groupedHelp).length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
                <button
                  onClick={() => setHelpFilter('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition ${
                    helpFilter === 'all'
                      ? 'bg-textPrimary text-white border-textPrimary'
                      : 'bg-white text-textSecondary border-gray-200 hover:border-primary'
                  }`}
                >
                  Todos · {helpRequests.length}
                </button>
                {Object.entries(groupedHelp).map(([cat, items]) => {
                  const info = getCategoryInfo(cat);
                  const active = helpFilter === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setHelpFilter(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition flex items-center gap-1 ${
                        active
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-textSecondary border-gray-200 hover:border-primary'
                      }`}
                    >
                      <span>{info.icon}</span> {info.label} · {items.length}
                    </button>
                  );
                })}
              </div>
            )}

            {helpRequests.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(helpFilter === 'all' ? helpRequests : groupedHelp[helpFilter] || []).map((p) => {
                  const cat = p.category_slug || 'reformas';
                  const info = getCategoryInfo(cat);
                  const isOffer = p.post_type === 'volunteer';
                  return (
                    <div key={p.id} className="p-4 rounded-2xl bg-white border border-gray-100 hover:border-rose-300 hover:shadow-md transition group">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-100 to-orange-100 flex items-center justify-center text-xl flex-shrink-0">
                          {info.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-textPrimary text-sm truncate flex items-center gap-1">
                              {p.title} {isOffer && <VerifiedBadge size={14} title="Proposta verificada" />}
                            </p>
                            <span className="text-[10px] uppercase tracking-wide text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                              <span className="inline-block animate-pulse">{isOffer ? '💼' : '🤝'}</span> {isOffer ? 'Oferta' : 'Pedido'} · {info.label}
                            </span>
                          </div>
                          {p.description && (
                            <p className="text-xs text-textSecondary mt-1 line-clamp-2">{p.description}</p>
                          )}
                          {p.address && (
                            <p className="text-xs text-textMuted mt-2 flex items-center gap-1">
                              <MapPin size={12} /> <span className="truncate">{p.address}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-textMuted bg-white/60 rounded-2xl">
                <HandHeart size={32} className="mx-auto mb-2 text-rose-300" />
                {isVolunteer ? 'Nenhum pedido encontrado para suas categorias.' : 'Nenhuma proposta de emprego encontrada para as categorias que você solicitou.'}
              </div>
            )}

            <div className="mt-5 mb-3 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <div className="flex-1 flex items-center gap-2 bg-white rounded-full border border-gray-200 px-3 py-1.5">
                <MapPin size={16} className="text-primary" />
                <Input
                  value={locInput}
                  onChange={(e) => setLocInput(e.target.value)}
                  placeholder={sharedLocation?.address || 'Digite endereço ou "lat,lng"'}
                  className="border-0 focus-visible:ring-0 h-8 px-0 text-sm"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const v = locInput.trim();
                  if (!v) return;
                  const m = v.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
                  if (m) {
                    setManualLocation({ lat: parseFloat(m[1]), lng: parseFloat(m[2]), source: 'manual' });
                    toast.success('📍 Localização atualizada');
                  } else {
                    try {
                      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(v)}`);
                      const d = await r.json();
                      if (d?.[0]) {
                        setManualLocation({ lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon), address: d[0].display_name, source: 'manual' });
                        toast.success(`📍 ${d[0].display_name}`);
                      } else toast.error('Endereço não encontrado');
                    } catch { toast.error('Falha ao buscar endereço'); }
                  }
                }}
                className="rounded-full"
              >
                Salvar
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  setLocatingShared(true);
                  const loc = await refreshAuto({ forceBrowser: true, silent: false });
                  setLocatingShared(false);
                  if (loc) toast.success('📍 Localização do celular atualizada');
                  else toast.error('Não foi possível obter localização');
                }}
                disabled={locatingShared}
                className="rounded-full bg-primary hover:bg-primary/90"
              >
                {locatingShared ? <Loader2 size={14} className="animate-spin" /> : 'Usar GPS'}
              </Button>
            </div>
            <div className="mt-2">
              <ServicesMap height={320} showHelpRequests={true} postTypeFilter={profilePostTypeFilter} categories={interestCategories} radiusKm={radiusKm} userLocation={sharedLocation || { lat: user?.lat, lng: user?.lng }} userId={user?.id} showSearchJobs={!isVolunteer} />
            </div>
          </div>

        {/* Mural de fotos (grande, sempre visível) */}
        <div className="bg-white rounded-3xl shadow-card p-6 mb-6" data-testid="photo-mural">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-textPrimary flex items-center gap-2 text-lg">
                <Camera size={20} className="text-primary" />
                Meu mural
              </h3>
              <p className="text-xs text-textMuted mt-1">
                {photos.length} foto{photos.length !== 1 ? 's' : ''} · mostre seu trabalho
              </p>
            </div>
            <Button
              size="sm"
              disabled={uploadingPhoto}
              onClick={() => photoInputRef.current?.click()}
              className="rounded-full bg-primary hover:bg-primary-hover"
            >
              <Camera size={16} className="mr-1" />
              {uploadingPhoto ? 'Enviando...' : 'Adicionar'}
            </Button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>

          {photos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 auto-rows-[140px] sm:auto-rows-[170px]">
              {photos.map((p, i) => {
                // Padrão: a cada 7, uma foto grande (2x2)
                const big = i % 7 === 0;
                return (
                  <div
                    key={p.name}
                    className={`group relative rounded-2xl overflow-hidden bg-gray-100 ${
                      big ? 'col-span-2 row-span-2' : ''
                    }`}
                  >
                    <img src={p.url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />
                    <button
                      onClick={() => deletePhoto(p.name)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white text-sm opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                      title="Remover"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-14 border-2 border-dashed border-gray-200 rounded-2xl">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                <Camera size={26} className="text-primary" />
              </div>
              <p className="text-sm text-textMuted mb-3">
                Seu mural está vazio. Adicione fotos das suas realizações.
              </p>
              <Button
                size="sm"
                onClick={() => photoInputRef.current?.click()}
                className="rounded-full bg-primary hover:bg-primary-hover"
              >
                <Camera size={14} className="mr-1" /> Adicionar primeira foto
              </Button>
            </div>
          )}
        </div>

        {/* Tab: Apresentação */}
        {activeTab === 'presentation' && (
          <div className="bg-white rounded-3xl p-6 shadow-card space-y-6" data-testid="tab-presentation">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-textSecondary">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail size={16} className="text-primary" />
                </div>
                <span className="text-sm" data-testid="user-email">{user?.email}</span>
              </div>
              {user?.languages && user.languages.length > 0 && (
                <div className="flex items-center gap-3 text-textSecondary">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Globe size={16} className="text-primary" />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {user.languages.map(lang => (
                      <span key={lang} className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium">
                        {lang.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Seção de Categorias de Ajuda */}
            <div className="border-t border-gray-100 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-textPrimary flex items-center gap-2">
                  <Heart size={20} className="text-primary" />
                  Categorias que você ajuda
                </h3>
                <Dialog open={showCategoriesDialog} onOpenChange={setShowCategoriesDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-full">
                      <Edit size={16} className="mr-1" />
                      Editar
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        🤝 Categorias de Ajuda
                      </DialogTitle>
                      <p className="text-sm text-textSecondary">
                        Selecione as categorias em que você pode oferecer ajuda
                      </p>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-3 my-4">
                      {HELP_CATEGORIES.map(cat => {
                        const categoryValue = cat.value === 'outros' ? CUSTOM_CATEGORY_VALUE : cat.value;
                        const selected = selectedCategories.includes(categoryValue);
                        return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => toggleCategory(categoryValue)}
                          className={`p-3 rounded-xl border-2 transition-all text-left relative ${
                            selected
                              ? 'bg-primary/10 border-primary shadow-md'
                              : 'bg-white border-gray-200 hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{cat.icon}</span>
                            <span className={`text-sm font-medium ${selected ? 'text-primary' : 'text-textPrimary'}`}>
                              {cat.label}
                            </span>
                          </div>
                          {selected && (
                            <div className="absolute top-2 right-2">
                              <Check size={14} className="text-primary" />
                            </div>
                          )}
                        </button>
                        );
                      })}
                    </div>

                    {selectedCategories.includes(CUSTOM_CATEGORY_VALUE) && (
                      <Input
                        value={customHelpCategory}
                        onChange={(e) => setCustomHelpCategory(e.target.value)}
                        placeholder="Escreva sua categoria. Ex: soldador, confeiteiro"
                        maxLength={40}
                        className="rounded-xl mb-4"
                      />
                    )}

                    {selectedCategories.length > 0 && (
                      <div className="p-3 bg-green-50 rounded-xl border border-green-200 mb-4">
                        <p className="text-sm text-green-700 flex items-center gap-2">
                          <Check size={16} />
                          {selectedCategories.length} categoria{selectedCategories.length > 1 ? 's' : ''} selecionada{selectedCategories.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    )}

                    <Button
                      onClick={saveCategories}
                      disabled={savingCategories}
                      className="w-full rounded-full py-6 bg-primary hover:bg-primary-hover"
                    >
                      {savingCategories ? 'Salvando...' : 'Salvar Categorias'}
                    </Button>
                  </DialogContent>
                </Dialog>
              </div>

              {selectedCategories.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedCategories.map(cat => {
                    const info = getCategoryInfo(cat);
                    return (
                      <span
                        key={cat}
                        className="px-3 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium flex items-center gap-1"
                      >
                        {info.icon} {info.label}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    Você ainda não selecionou categorias. Clique em "Editar" para escolher.
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 pt-6">
              <h3 className="font-bold text-textPrimary mb-2">Sobre</h3>
              <p className="text-textSecondary leading-relaxed">
                {user?.bio || 'Adicione uma breve descrição sobre você para que outros membros conheçam melhor seu perfil.'}
              </p>
            </div>
          </div>
        )}

        {/* Tab: Fotos */}
        {activeTab === 'photos' && (
          <div className="bg-white rounded-3xl p-6 shadow-card" data-testid="tab-photos">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-textPrimary">Minhas fotos</h3>
              <Button
                size="sm"
                disabled={uploadingPhoto}
                onClick={() => photoInputRef.current?.click()}
                className="rounded-full bg-primary hover:bg-primary-hover"
              >
                <Camera size={16} className="mr-1" />
                {uploadingPhoto ? 'Enviando...' : 'Adicionar'}
              </Button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
            {photos.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {photos.map(p => (
                  <div key={p.name} className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                    <img src={p.url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => deletePhoto(p.name)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs opacity-0 group-hover:opacity-100 transition"
                      title="Remover"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                  <Camera size={22} className="text-primary" />
                </div>
                <p className="text-sm text-textMuted">
                  Você ainda não publicou fotos. Clique em "Adicionar" para começar.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab: Avaliações */}
        {activeTab === 'reviews' && (
          <div className="bg-white rounded-3xl p-6 shadow-card" data-testid="tab-reviews">
            <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
              <div className="text-center">
                <div className="text-4xl font-bold text-textPrimary">0.0</div>
                <div className="flex items-center gap-0.5 justify-center text-amber-400 mt-1">
                  {'★★★★★'.split('').map((s,i) => <span key={i} className="text-gray-300">★</span>)}
                </div>
                <p className="text-xs text-textMuted mt-1">0 avaliações</p>
              </div>
              <div className="flex-1 space-y-1">
                {[5,4,3,2,1].map(n => (
                  <div key={n} className="flex items-center gap-2 text-xs">
                    <span className="w-3 text-textMuted">{n}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400" style={{ width: '0%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="py-10 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-amber-50 flex items-center justify-center">
                <Sparkles size={22} className="text-amber-500" />
              </div>
              <p className="text-sm font-semibold text-textPrimary">Ainda sem avaliações</p>
              <p className="text-xs text-textMuted mt-1">
                As avaliações que você receber aparecerão aqui.
              </p>
            </div>
          </div>
        )}

        {/* Tab: Atividade */}
        {activeTab === 'activity' && (
          <div className="bg-white rounded-3xl p-6 shadow-card" data-testid="tab-activity">
            <h3 className="font-bold text-textPrimary mb-4">Atividade recente</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User size={16} className="text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-textPrimary">Perfil criado</p>
                  <p className="text-xs text-textMuted">Bem-vindo(a) à plataforma!</p>
                </div>
              </div>
              <div className="py-8 text-center text-textMuted text-sm">
                Nenhuma outra atividade ainda.
              </div>
            </div>
          </div>
        )}

        <ChangePasswordCard />

        <div className="bg-white rounded-3xl p-6 shadow-card mt-6">
          <Button
            data-testid="logout-button"
            onClick={handleLogout}
            variant="outline"
            className="w-full rounded-full py-6 text-red-600 border-red-200 hover:bg-red-50"
          >
            <LogOut size={20} className="mr-2" />
            Sair
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function ChangePasswordCard() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 1) {
      toast.error('Digite uma senha');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Senha alterada com sucesso');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.message || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-card mt-6">
      <h3 className="font-semibold text-textPrimary mb-4 flex items-center gap-2">
        <Shield size={18} /> Alterar senha
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          type="password"
          placeholder="Nova senha"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="Confirmar nova senha"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <Button type="submit" disabled={loading} className="w-full rounded-full">
          {loading ? 'Salvando...' : 'Salvar nova senha'}
        </Button>
      </form>
    </div>
  );
}

