import React, { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../ClonedAuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import BottomNav from '../components/BottomNav';
import { User, Mail, Globe, LogOut, Edit, Check, Heart, MapPin, Shield, Sparkles, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getOrCreateSvcProfile, updateSvcProfile } from '../lib/authProfile';

const HELP_CATEGORIES = [
  { value: 'food', label: 'Alimentação', icon: '🍽️' },
  { value: 'legal', label: 'Jurídico', icon: '⚖️' },
  { value: 'health', label: 'Saúde', icon: '🏥' },
  { value: 'housing', label: 'Moradia', icon: '🏠' },
  { value: 'work', label: 'Trabalho', icon: '💼' },
  { value: 'education', label: 'Educação', icon: '📚' },
  { value: 'social', label: 'Social', icon: '🤝' },
  { value: 'clothes', label: 'Roupas', icon: '👕' },
  { value: 'furniture', label: 'Móveis', icon: '🪑' },
  { value: 'transport', label: 'Transporte', icon: '🚗' }
];

export default function ProfilePage() {
  const { user, logout, refreshUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCategoriesDialog, setShowCategoriesDialog] = useState(false);
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [useDisplayName, setUseDisplayName] = useState(user?.use_display_name || false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [savingCategories, setSavingCategories] = useState(false);
  const [activeTab, setActiveTab] = useState('presentation');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [avatarOverride, setAvatarOverride] = useState(null);
  const avatarInputRef = useRef(null);
  const photoInputRef = useRef(null);

  const avatarSrc = avatarOverride || user?.avatar_url;

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
      await updateSvcProfile(user.id, { categories: selectedCategories });
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
    return HELP_CATEGORIES.find(c => c.value === value) || { icon: '📝', label: value };
  };

  return (
    <div className="min-h-screen bg-background pb-20" data-testid="profile-page">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 glassmorphism">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-heading font-bold text-textPrimary">{t('profile')}</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Hero estilo AlloVoisins */}
        <div className="bg-white rounded-3xl shadow-card overflow-hidden mb-6">
          {/* Cover banner cinza/gradiente sutil */}
          <div className="relative h-20 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-400" />

          {/* Linha avatar + identidade */}
          <div className="px-6 sm:px-10 pb-6 -mt-14">
            <div className="flex flex-col sm:flex-row sm:items-end gap-5">
              {/* Avatar grande com online dot */}
              <div className="relative flex-shrink-0">
                <div className="w-32 h-32 rounded-full ring-4 ring-white shadow-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden">
                  {avatarSrc ? (
                    <img key={avatarSrc} src={avatarSrc} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={60} className="text-white" />
                  )}
                </div>
                <span className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 rounded-full border-[3px] border-white shadow" />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute top-1 right-1 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center border border-gray-100 hover:bg-gray-50 transition disabled:opacity-60"
                  title="Alterar foto de perfil"
                >
                  <Camera size={14} className="text-primary" />
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
              <div className="flex-1 min-w-0 pt-2 sm:pb-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                    {user?.role === 'helper' ? 'Profissional' : 'Particular'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-primary/10 text-primary rounded-md text-xs font-semibold">
                    <Shield size={11} /> Verificado
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-3xl font-heading font-bold text-textPrimary leading-tight" data-testid="user-name">
                    {user?.use_display_name && user?.display_name ? user.display_name : user?.name}
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
                      {HELP_CATEGORIES.map(cat => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => toggleCategory(cat.value)}
                          className={`p-3 rounded-xl border-2 transition-all text-left relative ${
                            selectedCategories.includes(cat.value)
                              ? 'bg-primary/10 border-primary shadow-md'
                              : 'bg-white border-gray-200 hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{cat.icon}</span>
                            <span className={`text-sm font-medium ${
                              selectedCategories.includes(cat.value) ? 'text-primary' : 'text-textPrimary'
                            }`}>
                              {cat.label}
                            </span>
                          </div>
                          {selectedCategories.includes(cat.value) && (
                            <div className="absolute top-2 right-2">
                              <Check size={14} className="text-primary" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>

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
