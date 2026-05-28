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
  const [role, setRole] = useState('migrant'); // migrant = Procuro / helper = Ofereço
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

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
    setName('');
    setLocation('');
    setAvatarFile(null);
    setAvatarPreview(null);
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
    if (password.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres');
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
        let profile = await getOrCreateSvcProfile(data.user, { display_name: name, role, city: location });
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
        toast.success('Verifique seu email para confirmar a conta');
        setMode('login');
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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto relative"
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
          /* ============ SIGNUP ============ */
          <div className="p-8 pt-6">
            <button
              type="button"
              onClick={() => setMode('login')}
              className="flex items-center gap-1 text-sm text-primary hover:opacity-80 mb-4"
              data-testid="signup-back"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>

            <h2 className="text-2xl font-bold text-center mb-5">Criar conta</h2>

            {/* role toggle */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                type="button"
                onClick={() => setRole('migrant')}
                className={`flex flex-col items-center justify-center py-4 rounded-xl border-2 transition-all ${
                  role === 'migrant'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                data-testid="role-procuro"
              >
                <Search className="w-6 h-6 mb-1.5" />
                <span className="text-sm font-medium">Procuro serviço</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('helper')}
                className={`flex flex-col items-center justify-center py-4 rounded-xl border-2 transition-all ${
                  role === 'helper'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                data-testid="role-ofereco"
              >
                <Wrench className="w-6 h-6 mb-1.5" />
                <span className="text-sm font-medium">Ofereço serviço</span>
              </button>
            </div>

            {/* avatar uploader */}
            <div className="flex flex-col items-center mb-5">
              <p className="text-sm text-gray-700 mb-2">Foto de perfil</p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative w-24 h-24 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden hover:bg-gray-200 transition-colors"
                data-testid="avatar-pick"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-gray-400" />
                )}
                <span className="absolute bottom-0 right-0 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow">
                  <Plus className="w-4 h-4" />
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

            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="text-sm text-gray-700">Nome completo</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="mt-1 w-full h-11 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  data-testid="signup-name"
                />
              </div>
              <div>
                <label className="text-sm text-gray-700">Email</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="mt-1 w-full h-11 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  data-testid="signup-email"
                />
              </div>
              <div>
                <label className="text-sm text-gray-700">Senha</label>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="mt-1 w-full h-11 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  data-testid="signup-password"
                />
              </div>
              <div>
                <label className="text-sm text-gray-700">Sua localização</label>
                <div className="relative mt-1">
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder={locating ? 'Detectando...' : 'Ex: São Paulo, SP'}
                    className="w-full h-11 pl-4 pr-11 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 mt-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-semibold rounded-lg flex items-center justify-center transition-colors"
                data-testid="signup-submit"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continuar'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
