const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ZapiConfig = {
  zapi_instance_id?: string;
  zapi_instance_token?: string;
  zapi_client_token?: string;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizeImage = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) return null;
  const s = value.trim();
  if (s.startsWith("data:image") || /^https?:\/\//i.test(s)) return s;
  if (s.startsWith("<svg")) return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`;
  if (/^iVBOR[A-Za-z0-9+/=\s]+$/.test(s.slice(0, 60))) return `data:image/png;base64,${s.replace(/\s/g, "")}`;
  if (/^\/9j\/[A-Za-z0-9+/=\s]+$/.test(s.slice(0, 60))) return `data:image/jpeg;base64,${s.replace(/\s/g, "")}`;
  return null;
};

const pickQr = (payload: any) => {
  const candidates = [
    payload?.data?.value,
    payload?.data?.qrcode,
    payload?.data?.qrCode,
    payload?.data?.qr,
    payload?.data?.image,
    payload?.data?.base64,
    payload?.value,
    payload?.qrcode,
    payload?.qrCode,
    payload?.qr,
    payload?.image,
    payload?.base64,
    payload?.png,
    typeof payload === "string" ? payload : null,
  ];
  for (const candidate of candidates) {
    const image = normalizeImage(candidate);
    if (image) return image;
    if (typeof candidate === "string" && candidate.trim().length > 80) return candidate.trim();
  }
  return null;
};

const zapiRequest = async (cfg: ZapiConfig, path: string) => {
  const instance = String(cfg.zapi_instance_id || "").trim();
  const token = String(cfg.zapi_instance_token || "").trim();
  const clientToken = String(cfg.zapi_client_token || "").trim();
  if (!instance || !token) throw new Error("Preencha Instance ID e Instance Token da Z-API.");

  const headers: Record<string, string> = { Accept: "application/json" };
  if (clientToken) headers["Client-Token"] = clientToken;

  const res = await fetch(`https://api.z-api.io/instances/${instance}/token/${token}${path}`, { headers });
  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) throw new Error(typeof body === "string" ? body.slice(0, 240) : JSON.stringify(body).slice(0, 240));
  return body;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "qr");
    const config = (body.config || {}) as ZapiConfig;

    if (action === "status") {
      const status = await zapiRequest(config, "/status");
      const connected = Boolean(status?.connected || status?.smartphoneConnected || status?.session === "CONNECTED" || status?.status === "CONNECTED");
      return json({ provider: "zapi", connected, data: status, response: status });
    }

    const attempts = ["/qr-code/image", "/qr-code", "/qr"];
    const errors: string[] = [];
    for (const path of attempts) {
      try {
        const payload = await zapiRequest(config, path);
        const qr = pickQr(payload);
        const connected = Boolean(payload?.connected || payload?.data?.connected);
        if (qr || connected) return json({ provider: "zapi", connected, qr, data: payload });
      } catch (e) {
        errors.push(`${path}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return json({ provider: "zapi", connected: false, error: "QR não retornado pela Z-API", errors }, 502);
  } catch (e) {
    return json({ provider: "zapi", connected: false, error: e instanceof Error ? e.message : String(e) }, 400);
  }
});