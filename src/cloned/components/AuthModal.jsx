import React, { useContext, useEffect, useRef, useState } from 'react';
import { X, ArrowLeft, Search, Wrench, Camera, Plus, Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AuthContext } from '../ClonedAuthContext';
import { getOrCreateSvcProfile, normalizeAuthUser, updateSvcProfile } from '../lib/authProfile';

/**
 * AuthModal — modal de login/cadastro inspirado nas referências
 * (servivizinhos). Usa Supabase Auth e atualiza o AuthContext local.
 *
 * props:
 *   open: boolean
 *   onClose: () => void
 *   mode: 'login' | 'signup'  (estado inicial)
 *   onModeChange?: (mode) => void
 */
export default function AuthModal({ open, onClose, mode = 'login', onModeChange }) {
  const { login, refreshUser } = useContext(AuthContext);

  // login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // signup fields
  const [role, setRole] = useState('migrant');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [location, setLocation] = useState('');
  const [mobile, setMobile] = useState('');
  const [serviceWanted, setServiceWanted] = useState('');
  const [topics, setTopics] = useState([]);
  const [urgentItems, setUrgentItems] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  const name = `${firstName} ${lastName}`.trim();


  const detectLocation = React.useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=pt-BR`
          );
          const data = await res.json();
          const addr = data.address || {};
          const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
          const state = addr.state_code || addr.state || '';
          const formatted = [city, state].filter(Boolean).join(', ') || data.display_name || '';
          if (formatted) setLocation(formatted);
        } catch {
          toast.error('Não foi possível obter o endereço');
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        toast.error('Permita o acesso à localização');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    if (open && mode === 'signup' && !location) {
      detectLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  if (!open) return null;

  const setMode = (m) => onModeChange?.(m);

  const resetSignup = () => {
    setFirstName('');
    setLastName('');
    setLocation('');
    setMobile('');
    setServiceWanted('');
    setTopics([]);
    setUrgentItems('');
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const VOLUNTEER_TOPICS = [
    'Distribuição de alimentos',
    'Roupas e agasalhos',
    'Apoio jurídico',
    'Aulas de idioma',
    'Saúde / primeiros socorros',
    'Transporte',
    'Acolhimento / abrigo',
    'Tradução',
    'Apoio psicológico',
    'Cuidado infantil',
  ];

  const HELP_TOPICS = [
    'Alimentos',
    'Roupas',
    'Abrigo',
    'Medicamentos',
    'Documentação',
    'Trabalho',
    'Transporte',
    'Apoio jurídico',
    'Apoio psicológico',
    'Material escolar',
  ];

  const toggleTopic = (t) => {
    setTopics((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };


  const handleAvatarPick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const profile = await getOrCreateSvcProfile(data.user);
      await login(data.session?.access_token, normalizeAuthUser(data.user, profile));
      await refreshUser?.();
      toast.success('Bem-vindo de volta!');
      onClose?.();
    } catch (err) {
      toast.error(err.message || 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (password.length < 1) {
      toast.error('Digite uma senha');
      return;
    }
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/home`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { display_name: name, role, location },
        },
      });
      if (error) throw error;

      if (data.session) {
        let profile = await getOrCreateSvcProfile(data.user, {
          display_name: name,
          role,
          city: location,
          categories: (role === 'volunteer' || role === 'needs_help')
            ? topics
            : (serviceWanted ? [serviceWanted.trim()] : []),
          bio: role === 'needs_help' && urgentItems ? `Precisa urgentemente de: ${urgentItems}` : undefined,
        });
        if (avatarFile && data.user) {
          const path = `${data.user.id}/avatar`;
          const { error: upErr } = await supabase.storage
            .from('svc-photos')
            .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
          if (!upErr) {
            const { data: pub } = supabase.storage.from('svc-photos').getPublicUrl(path);
            profile = await updateSvcProfile(data.user.id, { avatar_url: `${pub.publicUrl}?v=${Date.now()}` });
          }
        }
        await login(data.session.access_token, normalizeAuthUser(data.user, profile));
        await refreshUser?.();
        toast.success('Conta criada!');
        onClose?.();
      } else {
        // Auto-confirm está ativo: faz login imediato para evitar e-mail de confirmação
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        const profile = await getOrCreateSvcProfile(signInData.user, {
          display_name: name,
          role,
          city: location,
        });
        await login(signInData.session?.access_token, normalizeAuthUser(signInData.user, profile));
        await refreshUser?.();
        toast.success('Conta criada!');
        onClose?.();
        resetSignup();
      }
    } catch (err) {
      toast.error(err.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      data-testid="auth-modal"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[92vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
          data-testid="auth-modal-close"
        >
          <X className="w-5 h-5" />
        </button>

        {mode === 'login' ? (
          /* ============ LOGIN ============ */
          <div className="p-8 pt-10">
            <h2 className="text-2xl font-bold text-center mb-6">Entrar</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full h-12 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                data-testid="login-email"
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                className="w-full h-12 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                data-testid="login-password"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-semibold rounded-lg flex items-center justify-center transition-colors"
                data-testid="login-submit"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar'}
              </button>
            </form>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className="block mx-auto mt-6 text-sm text-gray-600 hover:text-gray-900"
              data-testid="switch-to-signup"
            >
              Não tem conta? <span className="font-semibold">Criar conta</span>
            </button>
          </div>
        ) : (
          /* ============ SIGNUP (AlloVoisins-style compact) ============ */
          <div className="px-6 pt-5 pb-6">
            <button
              type="button"
              onClick={() => setMode('login')}
              className="absolute top-4 left-4 p-1 rounded-full hover:bg-gray-100 text-gray-500"
              data-testid="signup-back"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* role toggle */}
            <div className="grid grid-cols-2 gap-2 mt-2 mb-4">
              {[
                { key: 'migrant', label: 'Procuro serviço' },
                { key: 'helper', label: 'Ofereço serviço' },
                { key: 'volunteer', label: 'Sou voluntário' },
                { key: 'needs_help', label: 'Preciso de ajuda' },
              ].map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => { setRole(r.key); setTopics([]); }}
                  className={`text-xs font-medium py-1.5 rounded-full border transition ${
                    role === r.key
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                  data-testid={`role-${r.key}`}
                >
                  {r.label}
                </button>
              ))}
            </div>


            {/* avatar (opcional, discreto) */}
            <div className="flex justify-center mb-4">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative w-16 h-16 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden hover:bg-gray-200 transition-colors"
                data-testid="avatar-pick"
                aria-label="Adicionar foto"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-5 h-5 text-gray-400" />
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow">
                  <Plus className="w-3 h-3" />
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleAvatarPick}
              />
            </div>

            <form onSubmit={handleSignup} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Prénom"
                  className="h-11 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  data-testid="signup-firstname"
                />
                <input
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Nom"
                  className="h-11 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  data-testid="signup-lastname"
                />
              </div>

              <div className="relative">
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={locating ? 'Detectando...' : 'Adresse postale'}
                  className="w-full h-11 pl-3 pr-10 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  data-testid="signup-location"
                />
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={locating}
                  title="Usar minha localização"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-md bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center"
                  data-testid="signup-locate"
                >
                  {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                </button>
              </div>

              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Mobile"
                className="w-full h-11 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                data-testid="signup-mobile"
              />

              {(role === 'migrant' || role === 'helper') && (
                <input
                  value={serviceWanted}
                  onChange={(e) => setServiceWanted(e.target.value)}
                  placeholder={role === 'migrant' ? 'Serviço que procura (ex: pedreiro, garçom)' : 'Serviço que oferece (ex: eletricista)'}
                  className="w-full h-11 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  data-testid="signup-service-wanted"
                />
              )}

              {role === 'volunteer' && (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1.5">Como você pode ajudar?</p>
                  <div className="flex flex-wrap gap-1.5">
                    {VOLUNTEER_TOPICS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTopic(t)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition ${
                          topics.includes(t)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {role === 'needs_help' && (
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1.5">Do que você precisa urgentemente?</p>
                    <div className="flex flex-wrap gap-1.5">
                      {HELP_TOPICS.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => toggleTopic(t)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition ${
                            topics.includes(t)
                              ? 'border-red-500 bg-red-50 text-red-600'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={urgentItems}
                    onChange={(e) => setUrgentItems(e.target.value)}
                    placeholder="Objetos/itens específicos que precisa (ex: fralda P, leite, cobertor)"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  />
                </div>
              )}


              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail"
                className="w-full h-11 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                data-testid="signup-email"
              />

              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                className="w-full h-11 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                data-testid="signup-password"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 mt-1 bg-gray-900 hover:bg-black disabled:opacity-60 text-white font-semibold rounded-full flex items-center justify-center transition-colors text-sm"
                data-testid="signup-submit"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "M'inscrire"}
              </button>

              <p className="text-center text-[11px] text-gray-400 mt-1">Étape 2/2</p>
            </form>
          </div>

        )}
      </div>
    </div>
  );
}
