import { useEffect, useRef, useState, useCallback } from "react";
import QRCode from "qrcode";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Input } from "@/kenia/components/ui/input";
import { Label } from "@/kenia/components/ui/label";
import { Badge } from "@/kenia/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle2, XCircle, Loader2, QrCode, LogOut, RefreshCw, AlertTriangle, Smartphone,
} from "lucide-react";

const LS_BASE = "wa_conn_base_url";
const LS_TOKEN = "wa_conn_token";

// Endpoints reais do backend Kenia (backend/server.js)
const EP_STATUS = "/api/whatsapp/baileys/status";
const EP_QR = "/api/whatsapp/baileys/qr";
const EP_RESTART = "/api/whatsapp/baileys/restart";
const EP_LOGOUT = "/api/whatsapp/baileys/logout";

const DEFAULT_BASE = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/api\/?$/, "");

const normalizeQrImage = async (raw) => {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim();
  if (s.startsWith("data:image") || /^https?:\/\//i.test(s)) return s;
  if (s.startsWith("<svg")) return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`;
  if (/^iVBOR[A-Za-z0-9+/=\s]+$/.test(s.slice(0, 60))) return `data:image/png;base64,${s.replace(/\s/g, "")}`;
  if (/^\/9j\/[A-Za-z0-9+/=\s]+$/.test(s.slice(0, 60))) return `data:image/jpeg;base64,${s.replace(/\s/g, "")}`;
  if (/^PHN2Zy[A-Za-z0-9+/=\s]+$/.test(s.slice(0, 80))) return `data:image/svg+xml;base64,${s.replace(/\s/g, "")}`;
  if (s.length >= 80 && (/^\d@/.test(s) || (s.includes("@") && s.includes(",")))) {
    return QRCode.toDataURL(s, { type: "image/png", width: 320, margin: 2, errorCorrectionLevel: "M" });
  }
  return null;
};

const pickQrImage = async (data) => {
  const candidates = [
    data?.qr, data?.qrcode, data?.qrCode, data?.image, data?.base64, data?.png, data?.dataURL,
    data?.data?.value, data?.data?.qrcode, data?.data?.qrCode, data?.data?.qr, data?.data?.image, data?.data?.base64,
    typeof data === "string" ? data : null,
  ];
  for (const candidate of candidates) {
    const image = await normalizeQrImage(candidate);
    if (image) return image;
  }
  return null;
};

export default function WhatsAppConnection() {
  const [baseUrl, setBaseUrl] = useState(() => localStorage.getItem(LS_BASE) || DEFAULT_BASE);
  const [token, setToken] = useState(() => localStorage.getItem(LS_TOKEN) || "");
  const [status, setStatus] = useState(null); // { connected, ... }
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [lostAlert, setLostAlert] = useState(false);
  const prevConnectedRef = useRef(false);

  const headers = useCallback(
    () => ({ "x-internal-token": token, "Content-Type": "application/json" }),
    [token]
  );

  const callApi = useCallback(
    async (path, method = "GET") => {
      if (!baseUrl) throw new Error("Configure a URL base do backend.");
      const cleanBase = baseUrl.trim().replace(/\/+$/, "").replace(/\/api$/, "");
      const url = `${cleanBase}${path}`;
      const res = await fetch(url, { method, headers: headers() });
      const ct = res.headers.get("content-type") || "";
      const raw = ct.includes("application/json") ? await res.json() : await res.text();
      if (!res.ok) {
        if (typeof raw === "string" && /Cannot (POST|GET)/i.test(raw)) {
          throw new Error(`Endpoint ${method} ${path} não existe no backend (${res.status}). Verifique se a URL base aponta para o servidor Kenia WhatsApp.`);
        }
        throw new Error(typeof raw === "string" ? raw.slice(0, 180) : raw?.error || `HTTP ${res.status}`);
      }
      return raw;
    },
    [baseUrl, headers]
  );

  const fetchStatus = useCallback(async () => {
    try {
      const data = await callApi(EP_STATUS, "GET");
      const connected = !!(data?.connected ?? data?.state?.connected ?? data?.ready);
      setStatus({ ...(data || {}), connected });
      return { ...(data || {}), connected };
    } catch (e) {
      setStatus({ connected: false, error: e.message });
      return null;
    }
  }, [callApi]);

  const fetchQr = useCallback(async () => {
    try {
      const data = await callApi(EP_QR, "GET");
      const qrVal = await pickQrImage(data);
      if (qrVal) setQr(qrVal);
      else setQr(null);
      return { qr: qrVal };
    } catch {
      return null;
    }
  }, [callApi]);

  const saveConfig = () => {
    if (!/^https?:\/\//i.test(baseUrl.trim())) {
      toast.error("URL base inválida. Use o endereço completo do backend, ex.: https://meu-backend.onrender.com");
      return;
    }
    localStorage.setItem(LS_BASE, baseUrl.trim());
    localStorage.setItem(LS_TOKEN, token);
    toast.success("Configuração salva");
  };

  const generateQr = async () => {
    if (!baseUrl) {
      toast.error("Informe a URL base do backend primeiro");
      return;
    }
    if (!/^https?:\/\//i.test(baseUrl)) {
      toast.error("URL base inválida — deve começar com http(s)://");
      return;
    }
    setRestarting(true);
    setQr(null);
    try {
      await callApi(EP_RESTART, "POST");
      toast.success("Reinício solicitado — aguardando QR...");
      let got = null;
      for (let i = 0; i < 15 && !got?.qr; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        got = await fetchQr();
      }
      if (!got?.qr) toast.warning("QR ainda não disponível. Verifique se o backend Baileys está rodando e tente novamente.");
    } catch (e) {
      toast.error(`Falha ao reiniciar: ${e.message}`);
    } finally {
      setRestarting(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm("Deseja realmente desconectar o WhatsApp?")) return;
    setLoggingOut(true);
    try {
      await callApi(EP_LOGOUT, "POST");
      toast.success("WhatsApp desconectado");
      setStatus({ connected: false });
      setQr(null);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoggingOut(false);
    }
  };


  // Polling QR a cada 5s enquanto desconectado
  useEffect(() => {
    if (!baseUrl) return;
    if (status?.connected) return;
    fetchQr();
    const t = setInterval(fetchQr, 5000);
    return () => clearInterval(t);
  }, [baseUrl, token, status?.connected, fetchQr]);

  // Monitor de status a cada 30s
  useEffect(() => {
    if (!baseUrl) return;
    fetchStatus();
    const t = setInterval(async () => {
      const s = await fetchStatus();
      if (s && !s.connected && prevConnectedRef.current) {
        setLostAlert(true);
        toast.warning("A sessão do WhatsApp foi perdida. Gere um novo QR Code.");
      }
      if (s) prevConnectedRef.current = !!s.connected;
    }, 30000);
    return () => clearInterval(t);
  }, [baseUrl, token, fetchStatus]);

  // Quando conectado, limpa QR
  useEffect(() => {
    if (status?.connected) {
      setQr(null);
      setLostAlert(false);
    }
  }, [status?.connected]);

  const renderStatusBadge = () => {
    if (!status) return <Badge variant="outline"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Conectando</Badge>;
    if (status.connected) return <Badge className="bg-emerald-600"><CheckCircle2 className="w-3 h-3 mr-1" />Conectado ✅</Badge>;
    return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Desconectado ❌</Badge>;
  };

  const manualRefresh = async () => {
    setLoading(true);
    await fetchStatus();
    if (!status?.connected) await fetchQr();
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs tracking-widest uppercase text-gold-600 font-semibold">Admin</div>
          <h1 className="font-display font-bold text-2xl flex items-center gap-2">
            <Smartphone className="w-6 h-6" /> WhatsApp Connection
          </h1>
        </div>
        <Button variant="outline" onClick={manualRefresh} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Atualizar
        </Button>
      </div>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold">Configuração do Backend (Baileys)</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>URL base</Label>
            <Input
              placeholder="https://seu-backend.com"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </div>
          <div>
            <Label>x-internal-token</Label>
            <Input
              type="password"
              placeholder="seu token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={saveConfig} className="bg-nude-900 hover:bg-nude-800">Salvar configuração</Button>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Status</h3>
          {renderStatusBadge()}
        </div>

        {lostAlert && !status?.connected && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5" />
            A sessão do WhatsApp foi perdida. Gere um novo QR Code.
          </div>
        )}

        {status?.connected ? (
          <div className="p-4 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900">
            WhatsApp conectado com sucesso
          </div>
        ) : (
          <div className="space-y-3">
            {status && !status.connected && (
              <div className="text-xs text-nude-600 bg-nude-50 border border-nude-200 rounded-md p-3 space-y-1">
                <div>Estado: <strong>{status.state || "—"}</strong></div>
                <div>QR disponível no backend: <strong>{status.hasQr ? "sim" : "não"}</strong></div>
                {status.secondsWaiting ? <div>Aguardando há {status.secondsWaiting}s</div> : null}
                {status.last_error && <div className="text-red-700">Último erro: {status.last_error}</div>}
                {status.error && <div className="text-red-700">Falha ao consultar backend: {status.error}</div>}
              </div>
            )}
            <Button onClick={generateQr} disabled={restarting || !baseUrl}>
              {restarting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando...</> : <><QrCode className="w-4 h-4 mr-2" />Gerar Novo QR Code</>}
            </Button>
            {qr && (
              <div className="flex flex-col items-center gap-2 p-4 border rounded-md bg-white">
                <img src={qr} alt="WhatsApp QR Code" className="w-64 h-64" />
                <p className="text-xs text-nude-500">Escaneie no WhatsApp → Dispositivos conectados</p>
              </div>
            )}
          </div>
        )}

        {status?.connected && (
          <Button variant="destructive" onClick={disconnect} disabled={loggingOut}>
            {loggingOut ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
            Desconectar WhatsApp
          </Button>
        )}
      </Card>
    </div>
  );
}
