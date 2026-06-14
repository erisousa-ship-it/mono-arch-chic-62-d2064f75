import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { api, DEFAULT_PROMPT } from "@/kenia/lib/api";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Input } from "@/kenia/components/ui/input";
import { Label } from "@/kenia/components/ui/label";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/kenia/components/ui/select";
import { Progress } from "@/kenia/components/ui/progress";
import { Badge } from "@/kenia/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/kenia/contexts/AuthContext";
import {
  Scale, ArrowRight, ArrowLeft, CheckCircle2, Zap,
  Building2, MessageSquare, Sparkles, Loader2, QrCode,
} from "lucide-react";

const normalizeQrImage = async (raw, blockedValues = []) => {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s || blockedValues.includes(s)) return null;
  if (s.startsWith("data:image") || /^https?:\/\//i.test(s)) return s;
  if (s.startsWith("<svg")) return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`;
  if (/^iVBOR[A-Za-z0-9+/=\s]+$/.test(s.slice(0, 60))) return `data:image/png;base64,${s.replace(/\s/g, "")}`;
  if (/^\/9j\/[A-Za-z0-9+/=\s]+$/.test(s.slice(0, 60))) return `data:image/jpeg;base64,${s.replace(/\s/g, "")}`;
  if (/^PHN2Zy[A-Za-z0-9+/=\s]+$/.test(s.slice(0, 80))) return `data:image/svg+xml;base64,${s.replace(/\s/g, "")}`;

  const looksLikeWhatsAppPairingPayload = s.length >= 80 && (/^\d@/.test(s) || (s.includes("@") && s.includes(",")));
  if (!looksLikeWhatsAppPairingPayload) return null;

  return QRCode.toDataURL(s, { type: "image/png", width: 320, margin: 2, errorCorrectionLevel: "M" });
};

const pickQrImage = async (data, blockedValues = []) => {
  const candidates = [
    data?.qr, data?.qrcode, data?.qrCode, data?.image, data?.base64, data?.png, data?.dataURL,
    data?.data?.value, data?.data?.qrcode, data?.data?.qrCode, data?.data?.qr, data?.data?.image, data?.data?.base64,
    typeof data === "string" ? data : null,
  ];
  for (const candidate of candidates) {
    const image = await normalizeQrImage(candidate, blockedValues);
    if (image) return image;
  }
  return null;
};

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({
    office_name: "", oab: user?.oab || "",
    main_area: "Trabalhista",
    bot_prompt: DEFAULT_PROMPT,
  });
  const [zapi, setZapi] = useState({
    zapi_instance_id: "", zapi_instance_token: "", zapi_client_token: "",
  });
  const [qrImg, setQrImg] = useState(null);
  const [checking, setChecking] = useState(false);
  const [connected, setConnected] = useState(false);
  const [saving, setSaving] = useState(false);

  const applyQrResponse = async (qrData = {}) => {
    const qr = await pickQrImage(qrData, [zapi.zapi_instance_id, zapi.zapi_instance_token, zapi.zapi_client_token].filter(Boolean));
    if (qr) setQrImg(qr);
    if (qrData?.connected) {
      setConnected(true);
      setQrImg(null);
    }
    return Boolean(qr || qrData?.connected);
  };

  const fetchAnyQr = async () => {
    try {
      const { data: baileysQr } = await api.get("/whatsapp/baileys/qr");
      if (await applyQrResponse(baileysQr)) return true;
    } catch {}
    try {
      const { data: qrData } = await api.get("/whatsapp/qr");
      return applyQrResponse(qrData);
    } catch {
      return false;
    }
  };

  useEffect(() => {
    api.get("/whatsapp/config").then(r => {
      const c = r.data || {};
      setZapi({
        zapi_instance_id: c.zapi_instance_id || "",
        zapi_instance_token: c.zapi_instance_token || "",
        zapi_client_token: c.zapi_client_token || "",
      });
      if (c.bot_prompt) setData(d => ({ ...d, bot_prompt: c.bot_prompt }));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (step !== 3 || connected) return;
    const refreshQr = async () => {
      try {
        const { data: status } = await api.get("/whatsapp/baileys/status");
        if (status?.connected) {
          setConnected(true);
          setQrImg(null);
          return;
        }
        await fetchAnyQr();
      } catch {}
    };
    refreshQr();
    const timer = window.setInterval(refreshQr, 10000);
    return () => window.clearInterval(timer);
  }, [step, connected]);

  const saveStep1 = async () => {
    if (!data.office_name) { toast.error("Informe o nome do escritório"); return; }
    setStep(2);
  };

  const saveStep2 = async () => {
    setStep(3);
  };

  const saveWhatsApp = async () => {
    setSaving(true);
    try {
      await api.put("/whatsapp/config", {
        provider: "baileys", ...zapi,
        bot_enabled: true, bot_prompt: data.bot_prompt,
      });
      toast.success("Configuração WhatsApp salva");
      await api.post("/whatsapp/baileys/reconnect").catch(() => api.post("/whatsapp/baileys/restart").catch(() => null));
      if (!(await fetchAnyQr())) toast.info("Aguardando o QR Code do WhatsApp...");
    } catch {
      toast.error("Erro ao salvar WhatsApp");
    } finally {
      setSaving(false);
    }
  };

  const checkConnection = async () => {
    setChecking(true);
    try {
      const { data: r } = await api.post("/whatsapp/test-connection");
      if (r.connected) {
        setConnected(true);
        setQrImg(null);
        toast.success("WhatsApp conectado!");
      } else {
        toast.warning("Ainda não conectado. Escaneie o QR e tente de novo.");
      }
    } catch {
      toast.error("Erro ao verificar");
    } finally {
      setChecking(false);
    }
  };

  const finish = async () => {
    try {
      localStorage.setItem("onboarding_done", "1");
      localStorage.setItem("office_info", JSON.stringify(data));
      await api.post("/seed/demo").catch(() => {});
      toast.success("Onboarding concluído!");
      navigate("/app");
    } catch {
      navigate("/app");
    }
  };

  const progress = (step / 4) * 100;

  return (
    <div className="min-h-screen bg-nude-50 flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-2.5 mb-4 sm:mb-6">
          <div className="w-9 h-9 rounded-md bg-nude-900 grid place-items-center shrink-0">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <div className="font-display font-bold text-lg sm:text-xl truncate">Espírito Santo<span className="text-gold-600">.</span></div>
        </div>

        <Card className="p-4 sm:p-8 border-nude-200 shadow-sm">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2 text-xs text-nude-500">
              <span className="tracking-widest uppercase font-semibold">Passo {step} de 4</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>

          {step === 1 && (
            <div className="space-y-4" data-testid="onboarding-step-1">
              <div>
                <Badge className="bg-gold-100 text-gold-800 hover:bg-gold-100 mb-3">
                  <Building2 className="w-3 h-3 mr-1" /> Escritório
                </Badge>
                <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-tight break-words">Conte sobre seu escritório</h1>
                <p className="text-nude-500 mt-2">Vamos personalizar o Espírito Santo para você.</p>
              </div>
              <div>
                <Label>Nome do escritório *</Label>
                <Input placeholder="Ex: Silva & Associados" value={data.office_name} onChange={e => setData({ ...data, office_name: e.target.value })} className="h-11" data-testid="ob-office" />
              </div>
              <div>
                <Label>OAB (opcional)</Label>
                <Input placeholder="123456/SP" value={data.oab} onChange={e => setData({ ...data, oab: e.target.value })} className="h-11" />
              </div>
              <div className="pt-2 flex justify-end">
                <Button onClick={saveStep1} className="bg-nude-900 hover:bg-nude-800 h-11 px-6" data-testid="ob-next-1">
                  Continuar <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4" data-testid="onboarding-step-2">
              <div>
                <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 mb-3">
                  <Sparkles className="w-3 h-3 mr-1" /> Área
                </Badge>
                <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-tight break-words">Qual sua área principal?</h1>
                <p className="text-nude-500 mt-2">A IA será treinada para captar leads dessa área.</p>
              </div>
              <div>
                <Label>Área de atuação</Label>
                <Select value={data.main_area} onValueChange={v => setData({ ...data, main_area: v })}>
                  <SelectTrigger className="h-11" data-testid="ob-area"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Trabalhista", "Família", "Previdenciário/INSS", "Criminal", "Cível", "Empresarial", "Tributário", "Bancário", "Consumidor", "Multiárea"].map(a => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prompt do robô de atendimento</Label>
                <Textarea rows={4} value={data.bot_prompt} onChange={e => setData({ ...data, bot_prompt: e.target.value })} data-testid="ob-prompt" />
                <div className="text-xs text-nude-500 mt-1">Personalidade e instruções do atendente IA que conversa com seus leads no WhatsApp.</div>
              </div>
              <div className="pt-2 flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-2 w-4 h-4" /> Voltar</Button>
                <Button onClick={saveStep2} className="bg-nude-900 hover:bg-nude-800 h-11 px-6" data-testid="ob-next-2">
                  Continuar <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4" data-testid="onboarding-step-3">
              <div>
                <Badge className="bg-gold-100 text-gold-800 hover:bg-gold-100 mb-3">
                  <MessageSquare className="w-3 h-3 mr-1" /> WhatsApp
                </Badge>
                <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-tight break-words">Conecte seu WhatsApp</h1>
                <p className="text-nude-500 mt-2">Conexão direta por QR Code. A sessão fica salva e reconecta automaticamente.</p>
              </div>
              <div className="bg-nude-50 border border-nude-200 rounded-md p-4 text-sm text-nude-600">
                Abra o WhatsApp no celular, vá em <strong>Aparelhos conectados</strong> e escaneie o QR abaixo. Se o código expirar, ele será renovado sem apagar a sessão.
              </div>
              {!qrImg && (
                <Button onClick={saveWhatsApp} disabled={saving} className="w-full bg-gold-600 hover:bg-gold-700 h-11" data-testid="ob-save-wa">
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Buscando...</> : <><QrCode className="w-4 h-4 mr-2" />Mostrar QR Code</>}
                </Button>
              )}
              {qrImg && (
                <div className="text-center space-y-3">
                  <div className="inline-block p-3 bg-white border-2 border-nude-200 rounded-md">
                    <img src={qrImg} alt="QR" className="w-52 h-52" />
                  </div>
                  <div className="text-xs text-nude-500">Abra o WhatsApp → Aparelhos Conectados → Escanear</div>
                  <Button onClick={checkConnection} disabled={checking} variant="outline" className="h-11">
                    {checking ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verificando...</> : <><Zap className="w-4 h-4 mr-2" />Verificar conexão</>}
                  </Button>
                  {connected && (
                    <div className="flex items-center justify-center gap-2 text-gold-600 font-medium">
                      <CheckCircle2 className="w-5 h-5" /> Conectado!
                    </div>
                  )}
                </div>
              )}
              <div className="pt-2 flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="mr-2 w-4 h-4" /> Voltar</Button>
                <Button onClick={() => setStep(4)} className="bg-nude-900 hover:bg-nude-800 h-11 px-6" data-testid="ob-next-3">
                  Próximo <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5 text-center" data-testid="onboarding-step-4">
              <div className="w-16 h-16 rounded-full bg-gold-100 grid place-items-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-gold-600" />
              </div>
              <div>
                <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-tight break-words">Tudo pronto!</h1>
                <p className="text-nude-500 mt-2">Seu painel está configurado. Vamos ao painel!</p>
              </div>
              <div className="bg-nude-50 border border-nude-200 rounded-md p-4 text-left space-y-2 text-sm">
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-gold-600" /> Escritório: <strong>{data.office_name}</strong></div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-gold-600" /> Área principal: <strong>{data.main_area}</strong></div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-gold-600" /> WhatsApp configurado</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-gold-600" /> Robô IA ativo</div>
              </div>
              <Button onClick={finish} className="w-full bg-nude-900 hover:bg-nude-800 h-11" data-testid="ob-finish">
                Ir para o painel <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          )}
        </Card>

        <div className="text-center mt-4 text-[11px] sm:text-xs text-nude-400 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-2">
          <span>🔒 API Oficial Meta compatível</span>
          <span className="hidden sm:inline">•</span>
          <span>LGPD compliant</span>
          <span className="hidden sm:inline">•</span>
          <span>Setup em 5 min</span>
        </div>
      </div>
    </div>
  );
}
