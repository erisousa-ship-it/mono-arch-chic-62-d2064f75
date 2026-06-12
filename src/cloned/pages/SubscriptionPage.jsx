import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../ClonedAuthContext';
import {
  MapPin, Eye, Edit2, Star, Globe, MessageSquare, ChevronRight,
  Home as HomeIcon, Users as UsersIcon, Plus, BarChart3, Bell,
  LayoutDashboard, FileText, Receipt, CreditCard, Folder, Package,
  Settings as SettingsIcon, Check, Copy, X as XIcon, ClipboardList
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { getStableDefaultAvatarUrl } from '../lib/authProfile';
import { supabase } from '@/integrations/supabase/client';


const NAV_DESKTOP = [
  { label: 'Acolhida', icon: HomeIcon, route: '/home' },
  { label: 'Voluntários', icon: UsersIcon, route: '/volunteers' },
  { label: 'Assinatura', icon: BarChart3, route: '/assinatura', active: true },
  { label: 'Mensagens', icon: MessageSquare, route: '/chat' },
];

const SIDEBAR = [
  {
    section: 'Meu perímetro de intervenção',
    items: [
      { label: 'Ver as demandas', icon: ClipboardList, key: 'demandas', route: '/home' },
      { label: 'Gerenciar meu perímetro', icon: MapPin, key: 'perimetro' },
    ],
  },
  {
    section: 'Minha visibilidade',
    items: [
      { label: 'Ver minha página de perfil', icon: Eye, key: 'view-profile', route: '/profile' },
      { label: 'Modificar minha página de perfil', icon: Edit2, key: 'edit-profile', route: '/profile?edit=1' },
      { label: 'Gerenciar meus comentários', icon: Star, key: 'reviews' },
      { label: 'Meu referenciamento Google', icon: Globe, key: 'seo' },
      { label: 'Meus suportes de comunicação', icon: MessageSquare, key: 'support' },
    ],
  },
  {
    section: 'Minha empresa',
    pro: true,
    items: [
      { label: 'Painel de controle', icon: LayoutDashboard, key: 'dash' },
      { label: 'Orçamentos', icon: FileText, key: 'budgets' },
      { label: 'Faturas', icon: Receipt, key: 'invoices' },
      { label: 'Cobranças', icon: CreditCard, key: 'charges' },
      { label: 'Diretório de clientes', icon: Folder, key: 'clients' },
      { label: 'Catálogo de artigos', icon: Package, key: 'catalog' },
      { label: 'Parâmetros', icon: SettingsIcon, key: 'params' },
    ],
  },
];

const ITEM_LABEL = Object.fromEntries(
  SIDEBAR.flatMap((s) => s.items.map((i) => [i.key, i.label]))
);
const PRO_KEYS = new Set(
  SIDEBAR.filter((s) => s.pro).flatMap((s) => s.items.map((i) => i.key))
);

export default function SubscriptionPage() {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState('perimetro');
  const [radius, setRadius] = useState(2);
  const [services, setServices] = useState(4);
  const [objects, setObjects] = useState(3);
  const [notifications, setNotifications] = useState(true);
  const [currentAddress, setCurrentAddress] = useState('Detectando sua localização...');
  const [locating, setLocating] = useState(false);

  const detectLocation = React.useCallback(() => {
    if (!navigator.geolocation) {
      setCurrentAddress('Geolocalização não suportada');
      return;
    }
    setLocating(true);
    setCurrentAddress('Detectando sua localização...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const d = await r.json();
          setCurrentAddress(d.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } catch {
          setCurrentAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
        setLocating(false);
      },
      () => {
        setCurrentAddress('Permissão de localização negada');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  useEffect(() => { detectLocation(); }, [detectLocation]);

  // Subscription state
  const [subStatus, setSubStatus] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pixData, setPixData] = useState(null);
  const [loadingPix, setLoadingPix] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [customPix, setCustomPix] = useState('');
  const [savedPix, setSavedPix] = useState('');
  const [savingPix, setSavingPix] = useState(false);

  useEffect(() => {
    fetchStatus();
    loadCustomPix();
  }, []);

  const fetchStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from('svc_subscriptions')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (data) {
        setSubStatus({
          status: data.status,
          active: data.status === 'active',
          in_trial: data.status === 'trial',
          trial_ends_at: data.trial_ends_at,
        });
      }
    } catch (e) { console.error(e); }
  };

  const loadCustomPix = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from('svc_profiles')
        .select('pix_brcode')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (data?.pix_brcode) {
        setCustomPix(data.pix_brcode);
        setSavedPix(data.pix_brcode);
      }
    } catch (e) { console.error(e); }
  };

  const saveCustomPix = async () => {
    setSavingPix(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Faça login primeiro'); return; }
      const value = customPix.trim() || null;
      const { error } = await supabase.rpc('upsert_own_svc_profile', {
        _values: { pix_brcode: value },
      });
      if (error) throw error;
      setSavedPix(value || '');
      toast.success(value ? 'Sua chave PIX foi salva!' : 'Chave PIX removida.');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar chave PIX');
    } finally { setSavingPix(false); }
  };

  // ---- BR Code PIX fixo (estático) ----
  const FIXED_BRCODE =
    '00020126580014BR.GOV.BCB.PIX01363ef11200-bebf-4d88-930c-48e84b11cfc4520400005303986540535.905802BR592551.965.652 ERI JONHSON DE6009SAO PAULO610805409000622505219uC1rHtH0iT8qxs19tl986304B464';

  const startSubscription = async () => {
    setLoadingPix(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Faça login primeiro'); return; }

      const amount = 35.9;
      const txid = `JRT${Date.now().toString(36).toUpperCase()}`.slice(0, 25);
      const brcode = (savedPix && savedPix.trim()) || FIXED_BRCODE;

      const trialEnds = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      try {
        const { data: existing } = await supabase
          .from('svc_subscriptions').select('id').eq('user_id', session.user.id).maybeSingle();
        if (existing) {
          await supabase.from('svc_subscriptions').update({
            pix_brcode: brcode, pix_txid: txid, status: 'pix',
            amount_brl: amount, expires_at: expires,
          }).eq('id', existing.id);
        } else {
          await supabase.from('svc_subscriptions').insert({
            user_id: session.user.id, pix_brcode: brcode, pix_txid: txid,
            status: 'pix', amount_brl: amount, trial_ends_at: trialEnds, expires_at: expires,
          });
        }
      } catch (dbErr) { console.warn('[PIX] salvar sub:', dbErr); }

      setPixData({
        brcode,
        amount,
        trial_ends_at: trialEnds,
        qr_code_base64: `https://api.qrserver.com/v1/create-qr-code/?size=360x360&ecc=M&qzone=3&data=${encodeURIComponent(brcode)}`,
      });
      setShowPaymentModal(true);
      toast.success('Você ganhou 3 dias grátis!');
      fetchStatus();
    } catch (e) {
      console.error('[PIX] erro:', e);
      toast.error(e?.message || 'Erro ao gerar PIX');
    } finally { setLoadingPix(false); }
  };

  const confirmPayment = async () => {
    setConfirming(true);
    try {
      toast.success('Pagamento declarado! Aguardando confirmação do administrador.');
      setShowPaymentModal(false);
      fetchStatus();
    } finally { setConfirming(false); }
  };

  const copyBrcode = () => {
    if (pixData?.brcode) {
      navigator.clipboard.writeText(pixData.brcode);
      toast.success('Código PIX copiado!');
    }
  };

  const avatarUrl = user?.avatar_url || user?.avatar || getStableDefaultAvatarUrl(user);

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-0" data-testid="subscription-page">
      {/* Top Navbar (desktop) */}
      <header className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/home')} className="text-2xl font-bold">
            <span className="text-[#16a34a]">Jataí</span>{' '}
            <span className="text-amber-500">Região</span>{' '}
            <span className="text-gray-900">Trabalho</span>
          </button>
          <nav className="flex items-center gap-1">
            {NAV_DESKTOP.map((n) => (
              <button
                key={n.label}
                onClick={() => navigate(n.route)}
                data-testid={`nav-${n.label.toLowerCase()}`}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 ${n.active ? 'text-[#16a34a]' : 'text-gray-600'}`}
              >
                <n.icon size={18} />
                <span className="text-[11px] font-medium">{n.label}</span>
              </button>
            ))}
          </nav>
          <button onClick={() => navigate('/profile')} className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200">
            <img src={avatarUrl} alt="me" className="w-full h-full object-cover" />
          </button>
        </div>
      </header>

      {/* Page heading */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-8 pb-4 border-b border-gray-100">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Assinatura</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Encontre todos os serviços inclusos na sua assinatura {subStatus?.active ? 'Premium' : 'Standard'}.
        </p>
      </div>

      {/* 3-column layout */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 grid grid-cols-12 gap-6">

        {/* LEFT SIDEBAR */}
        <aside className="col-span-12 md:col-span-3" data-testid="sub-sidebar">
          <div className="bg-white rounded-2xl border border-gray-200 p-2">
            {SIDEBAR.map((sec) => (
              <div key={sec.section} className="mb-4">
                <h3 className="px-3 pt-3 pb-2 text-sm font-bold text-gray-900 flex items-center gap-2">
                  {sec.section}
                  {sec.pro && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-200 text-orange-800">PRO</span>
                  )}
                </h3>
                <div className="space-y-0.5">
                  {sec.items.map((it) => {
                    const isActive = activeItem === it.key;
                    return (
                      <button
                        key={it.key}
                        data-testid={`sub-item-${it.key}`}
                        onClick={() => {
                          setActiveItem(it.key);
                          if (it.route) {
                            navigate(it.route);
                          } else if (PRO_KEYS.has(it.key) && !subStatus?.active) {
                            toast.info(`${it.label} — disponível no plano PRO`);
                          }
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition ${
                          isActive ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <it.icon size={16} className={isActive ? 'text-orange-500' : 'text-gray-500'} />
                        <span className="flex-1">{it.label}</span>
                        <ChevronRight size={14} className="text-gray-300" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>


        {/* CENTER PANEL */}
        <main className="col-span-12 md:col-span-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8" data-testid="sub-center-panel">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">{ITEM_LABEL[activeItem] || 'Assinatura'}</h2>
            {activeItem !== 'perimetro' && (
              <div className="text-sm text-gray-600">
                {PRO_KEYS.has(activeItem) && !subStatus?.active ? (
                  <div className="rounded-xl border border-dashed border-orange-300 bg-orange-50 p-4">
                    Este recurso faz parte do plano <strong>PRO</strong>. Assine para desbloquear.
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-200 p-4">
                    Em breve: <strong>{ITEM_LABEL[activeItem]}</strong>.
                  </div>
                )}
              </div>
            )}
            {activeItem === 'perimetro' && (<>

            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">Gerenciar meu perímetro</h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Meu raio de intervenção:</label>
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={16} className="text-gray-500" />
                  <span className="text-sm flex-1">{currentAddress}</span>
                  <button
                    type="button"
                    onClick={detectLocation}
                    disabled={locating}
                    className="text-xs text-orange-500 font-semibold hover:underline disabled:opacity-50"
                  >
                    {locating ? 'Buscando...' : 'Atualizar'}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    data-testid="radius-slider"
                    className="flex-1 accent-orange-500 h-1"
                  />
                  <span className="text-orange-500 font-semibold text-sm min-w-[40px] text-right">{radius}km</span>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Meus domínios de intervenção:</label>
              <div className="space-y-2">
                <div className="rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between">
                  <span className="text-sm">Serviços ({services})</span>
                  <ChevronRight size={16} className="text-gray-400 rotate-90" />
                </div>
                <div className="rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between">
                  <span className="text-sm">Objetos ({objects})</span>
                  <ChevronRight size={16} className="text-gray-400 rotate-90" />
                </div>
              </div>
            </div>

            <button
              onClick={() => setNotifications(!notifications)}
              data-testid="toggle-notifications"
              className="w-full mt-4 mb-6 rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Bell size={16} className="text-gray-500" />
                <span className="text-sm">Notificações {notifications ? 'ativadas' : 'desativadas'}</span>
              </div>
              <Check size={18} className={notifications ? 'text-green-500' : 'text-gray-300'} />
            </button>

            <Button
              data-testid="modify-perimeter-btn"
              onClick={() => toast.success('Perímetro modificado!')}
              className="w-full bg-gray-900 hover:bg-black text-white rounded-full h-12 font-semibold"
            >
              Modificar meu perímetro
            </Button>
            </>)}

            {/* Custom PIX key for receiving payments — always visible */}
            <div className="mt-8 pt-6 border-t border-gray-200" data-testid="custom-pix-section">
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Minha chave PIX (área de pagamento)
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Cole seu PIX Copia e Cola (BR Code) para receber pagamentos dos seus clientes.
                Se vazio, será usado o PIX padrão da plataforma.
              </p>
              <textarea
                value={customPix}
                onChange={(e) => setCustomPix(e.target.value)}
                placeholder="00020126..."
                rows={3}
                data-testid="custom-pix-input"
                className="w-full text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
              <Button
                onClick={saveCustomPix}
                disabled={savingPix || customPix === savedPix}
                data-testid="save-custom-pix-btn"
                className="mt-3 bg-orange-500 hover:bg-orange-600 text-white rounded-full h-10 px-6 font-semibold disabled:opacity-50"
              >
                {savingPix ? 'Salvando...' : 'Salvar minha chave PIX'}
              </Button>
            </div>
          </div>
        </main>


        {/* RIGHT: UPGRADE CARD */}
        <aside className="col-span-12 md:col-span-3">
          <div
            className="rounded-2xl p-6 text-white shadow-lg overflow-hidden relative"
            style={{ background: 'linear-gradient(135deg, #ff8c42 0%, #ff6b9d 100%)' }}
            data-testid="upgrade-card"
          >
            <h3 className="text-2xl font-bold leading-tight mb-5">
              Passe para a velocidade superior!
            </h3>
            <ul className="space-y-3 mb-6">
              {[
                'Responder às demandas ilimitadas',
                'Publicar até 50 fotos das minhas realizações',
                'Aumentar a visibilidade do meu perfil',
              ].map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm">
                  <Check size={18} className="text-white shrink-0 mt-0.5" strokeWidth={3} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            {subStatus?.in_trial && (
              <div className="bg-white/20 rounded-lg px-3 py-2 mb-3 text-xs">
                ✓ Você está em trial gratuito (até {new Date(subStatus.trial_ends_at).toLocaleDateString('pt-BR')})
              </div>
            )}
            {subStatus?.status === 'pending_verification' && (
              <div className="bg-white/20 rounded-lg px-3 py-2 mb-3 text-xs">
                ⏳ Pagamento em verificação
              </div>
            )}
            {subStatus?.status === 'active' && (
              <div className="bg-white/20 rounded-lg px-3 py-2 mb-3 text-xs">
                ⭐ Assinatura ativa
              </div>
            )}

            <Button
              data-testid="subscribe-btn"
              onClick={startSubscription}
              disabled={loadingPix || subStatus?.status === 'active'}
              className="w-full bg-white text-orange-600 hover:bg-orange-50 rounded-full h-12 font-bold shadow-md disabled:opacity-60"
            >
              {loadingPix ? 'Gerando PIX...' :
                subStatus?.status === 'active' ? 'Assinatura ativa' :
                  'Eu me inscrevo'}
            </Button>
            <p className="text-center text-xs text-white/90 mt-3">
              3 dias grátis · A partir de R$ 35,90 / mês
            </p>
          </div>
        </aside>
      </div>

      {/* ===== PAYMENT MODAL (PIX QR CODE) ===== */}
      {showPaymentModal && pixData && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowPaymentModal(false)}
          data-testid="pix-modal"
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100"
              data-testid="close-pix-modal"
            >
              <XIcon size={20} />
            </button>

            <div className="text-center mb-4">
              <div className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full mb-3">
                3 DIAS GRÁTIS
              </div>
              <h3 className="text-xl font-bold text-gray-900">Pagar com PIX</h3>
              <p className="text-sm text-gray-500 mt-1">
                R$ {pixData.amount.toFixed(2).replace('.', ',')} / mês
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                Trial até {new Date(pixData.trial_ends_at).toLocaleDateString('pt-BR')}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4 flex flex-col items-center">
              <img
                src={pixData.qr_code_base64}
                alt="QR Code PIX"
                className="w-56 h-56 bg-white rounded-lg"
                data-testid="pix-qr-image"
              />
              <p className="text-xs text-gray-500 mt-3 text-center">
                Escaneie no app do seu banco para pagar
              </p>
            </div>

            <div className="mb-4">
              <label className="text-xs font-medium text-gray-600 mb-1 block">PIX Copia e Cola</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={pixData.brcode}
                  className="flex-1 text-[10px] bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-mono"
                  data-testid="pix-brcode-input"
                />
                <button
                  onClick={copyBrcode}
                  data-testid="copy-pix-btn"
                  className="px-3 rounded-lg bg-gray-900 text-white hover:bg-black text-xs font-medium flex items-center gap-1"
                >
                  <Copy size={14} /> Copiar
                </button>
              </div>
            </div>

            <Button
              onClick={confirmPayment}
              disabled={confirming}
              data-testid="confirm-payment-btn"
              className="w-full bg-green-600 hover:bg-green-700 text-white rounded-full h-12 font-bold"
            >
              {confirming ? 'Enviando...' : 'Já paguei'}
            </Button>
            <p className="text-[11px] text-center text-gray-400 mt-2">
              Após o pagamento, sua conta será ativada em até 1h.
            </p>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-2 py-2 flex items-end justify-around" data-testid="mobile-bottom-nav-sub">
        <button onClick={() => navigate('/home')} className="flex flex-col items-center gap-0.5 px-2 py-1 min-w-[60px] text-gray-500">
          <HomeIcon size={22} />
          <span className="text-[11px] font-medium">Início</span>
        </button>
        <button onClick={() => navigate('/volunteers')} className="flex flex-col items-center gap-0.5 px-2 py-1 min-w-[60px] text-gray-500">
          <UsersIcon size={22} />
          <span className="text-[11px] font-medium">Voluntários</span>
        </button>
        <button onClick={() => navigate('/home')} className="flex flex-col items-center -mt-5">
          <div className="w-12 h-12 rounded-full bg-[#16a34a] text-white grid place-items-center shadow-md shadow-green-500/40">
            <Plus size={26} />
          </div>
          <span className="text-[11px] text-gray-500 mt-0.5">Demande</span>
        </button>
        <button onClick={() => navigate('/chat')} className="flex flex-col items-center gap-0.5 px-2 py-1 min-w-[60px] text-gray-500">
          <MessageSquare size={22} />
          <span className="text-[11px] font-medium">Mensagens</span>
        </button>
      </nav>
    </div>
  );
}
