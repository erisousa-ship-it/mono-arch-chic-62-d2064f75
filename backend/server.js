import express from "express";
import cors from "cors";
import pino from "pino";
import QRCode from "qrcode";
import { rm } from "fs/promises";
import {
  default as makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";

const PORT = process.env.PORT || 10000;
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || "";
const AUTH_DIR = process.env.AUTH_DIR || "./auth_session";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const logger = pino({ level: "warn" });

const state = {
  sock: null,
  qr: null,
  qrDataUrl: null,
  connected: false,
  startingAt: 0,
  lastError: null,
  qrAttempts: 0,
  config: { provider: "baileys", bot_enabled: true },
};

let startSeq = 0;
let reconnectTimer = null;
let qrWatchdogTimer = null;

const connectionState = () => {
  if (state.connected) return "open";
  if (state.qrDataUrl) return "qr";
  if (state.lastError) return "offline";
  return "connecting";
};

const stopSock = (reason = "restart") => {
  try { state.sock?.end?.(new Error(reason)); } catch {}
  state.sock = null;
};

const resetAuthSession = async () => {
  stopSock("reset-auth-session");
  await rm(AUTH_DIR, { recursive: true, force: true });
};

const scheduleStart = (opts = {}) => {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => startSock(opts).catch((e) => { state.lastError = e.message; }), opts.delay || 2000);
};

function auth(req, res, next) {
  if (!INTERNAL_TOKEN) return next();
  if (req.headers["x-internal-token"] !== INTERNAL_TOKEN) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

async function startSock({ clearAuth = false } = {}) {
  const seq = ++startSeq;
  if (clearAuth) await resetAuthSession();
  else stopSock("new-start");
  if (qrWatchdogTimer) clearTimeout(qrWatchdogTimer);
  state.startingAt = Date.now();
  state.qr = null;
  state.qrDataUrl = null;
  state.connected = false;
  state.lastError = null;
  if (clearAuth) state.qrAttempts = 0;

  const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    auth: authState,
    version,
    logger,
    printQRInTerminal: false,
    browser: ["Kenia", "Chrome", "1.0"],
  });

  qrWatchdogTimer = setTimeout(() => {
    if (seq === startSeq && !state.connected && !state.qrDataUrl) {
      state.qrAttempts += 1;
      if (state.qrAttempts >= 2) {
        state.lastError = "O Baileys não gerou QR automaticamente. Clique em Nova sessão / QR limpo para recriar a sessão.";
        stopSock("qr-timeout");
        return;
      }
      startSock({ clearAuth: true }).catch((e) => { state.lastError = e.message; });
    }
  }, 25000);

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", async (update) => {
    if (seq !== startSeq) return;
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      state.qr = qr;
      state.lastError = null;
      state.qrAttempts = 0;
      try {
        state.qrDataUrl = await QRCode.toDataURL(qr, { width: 320, margin: 2 });
      } catch (e) {
        state.qrDataUrl = null;
      }
    }
    if (connection === "open") {
      state.connected = true;
      state.lastError = null;
      state.qr = null;
      state.qrDataUrl = null;
      if (qrWatchdogTimer) clearTimeout(qrWatchdogTimer);
    }
    if (connection === "close") {
      state.connected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      state.lastError = lastDisconnect?.error?.message || `Conexão fechada (${code || "sem código"})`;
      if (code !== DisconnectReason.loggedOut) {
        scheduleStart({ delay: 2000, clearAuth: code === DisconnectReason.badSession || code === DisconnectReason.connectionReplaced });
      } else {
        scheduleStart({ delay: 1000, clearAuth: true });
      }
    }
  });

  state.sock = sock;
}

app.get("/api", (_req, res) => res.json({ ok: true, service: "kenia-whatsapp" }));

app.get("/api/whatsapp/config", auth, (_req, res) => {
  res.json(state.config);
});

app.put("/api/whatsapp/config", auth, (req, res) => {
  state.config = { ...state.config, ...(req.body || {}), provider: "baileys" };
  res.json(state.config);
});

app.get("/api/whatsapp/diagnostics", auth, (_req, res) => {
  res.json({ ok: true, static_mode: false, checks: [
    { id: "baileys-backend", ok: true, label: "Backend Baileys ativo", msg: "Serviço WhatsApp publicado e respondendo.", hint: state.connected ? "WhatsApp conectado." : state.qrDataUrl ? "QR Code disponível para leitura." : "Se ficar inicializando por mais de 30s, gere uma nova sessão." },
  ] });
});

app.post("/api/whatsapp/test-connection", auth, (_req, res) => {
  res.json({ connected: state.connected, provider: "baileys", state: connectionState(), error: state.lastError });
});

app.get("/api/whatsapp/baileys/status", auth, (_req, res) => {
  const secondsWaiting = state.startingAt ? Math.floor((Date.now() - state.startingAt) / 1000) : 0;
  res.json({
    connected: state.connected,
    state: connectionState(),
    hasQr: !!state.qrDataUrl,
    startingAt: state.startingAt,
    secondsWaiting,
    last_error: state.lastError,
  });
});

app.get("/api/whatsapp/qr", auth, (_req, res) => {
  res.json({ qr: state.qrDataUrl, raw: state.qr, state: connectionState(), last_error: state.lastError });
});

app.get("/api/whatsapp/baileys/qr", auth, (_req, res) => {
  res.json({ qr: state.qrDataUrl, raw: state.qr, state: connectionState(), last_error: state.lastError });
});

app.post("/api/whatsapp/baileys/restart", auth, async (_req, res) => {
  try {
    await startSock();
    res.json({ ok: true, connected: state.connected, state: connectionState(), qr: state.qrDataUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/whatsapp/baileys/reconnect", auth, async (_req, res) => {
  try {
    await startSock();
    res.json({ ok: true, connected: state.connected, state: connectionState(), qr: state.qrDataUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/whatsapp/baileys/reset-session", auth, async (_req, res) => {
  try {
    await startSock({ clearAuth: true });
    res.json({ ok: true, connected: false, state: connectionState(), qr: state.qrDataUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/whatsapp/baileys/logout", auth, async (_req, res) => {
  try {
    try { await state.sock?.logout?.(); } catch {}
    state.connected = false;
    state.qr = null;
    state.qrDataUrl = null;
    await startSock();
    res.json({ ok: true, connected: false, state: "connecting" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/whatsapp/logout", auth, async (_req, res) => {
  try {
    try { await state.sock?.logout?.(); } catch {}
    state.connected = false;
    state.qr = null;
    state.qrDataUrl = null;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Kenia WhatsApp backend on :${PORT}`);
  startSock().catch((e) => console.error("startSock failed", e));
});