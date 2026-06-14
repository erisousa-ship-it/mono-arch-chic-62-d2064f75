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

async function startSock() {
  state.startingAt = Date.now();
  state.qr = null;
  state.qrDataUrl = null;
  state.connected = false;

  const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const sock = makeWASocket({
    auth: authState,
    logger,
    printQRInTerminal: false,
    browser: ["Kenia", "Chrome", "1.0"],
  });

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      state.qr = qr;
      try {
        state.qrDataUrl = await QRCode.toDataURL(qr, { width: 320, margin: 2 });
      } catch (e) {
        state.qrDataUrl = null;
      }
    }
    if (connection === "open") {
      state.connected = true;
      state.qr = null;
      state.qrDataUrl = null;
    }
    if (connection === "close") {
      state.connected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) {
        setTimeout(() => startSock().catch(() => {}), 2000);
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
    { id: "baileys-backend", ok: true, label: "Backend Baileys ativo", msg: "Serviço WhatsApp publicado e respondendo.", hint: state.connected ? "WhatsApp conectado." : "Gere/escaneie o QR Code para conectar." },
  ] });
});

app.post("/api/whatsapp/test-connection", auth, (_req, res) => {
  res.json({ connected: state.connected, provider: "baileys", state: state.connected ? "open" : state.qrDataUrl ? "qr" : "connecting" });
});

app.get("/api/whatsapp/baileys/status", auth, (_req, res) => {
  res.json({
    connected: state.connected,
    state: state.connected ? "open" : state.qrDataUrl ? "qr" : "connecting",
    hasQr: !!state.qrDataUrl,
    startingAt: state.startingAt,
  });
});

app.get("/api/whatsapp/qr", auth, (_req, res) => {
  res.json({ qr: state.qrDataUrl, raw: state.qr });
});

app.get("/api/whatsapp/baileys/qr", auth, (_req, res) => {
  res.json({ qr: state.qrDataUrl, raw: state.qr, state: state.connected ? "open" : state.qrDataUrl ? "qr" : "connecting" });
});

app.post("/api/whatsapp/baileys/restart", auth, async (_req, res) => {
  try {
    try { state.sock?.end?.(new Error("restart")); } catch {}
    await startSock();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/whatsapp/baileys/reconnect", auth, async (_req, res) => {
  try {
    try { state.sock?.end?.(new Error("reconnect")); } catch {}
    await startSock();
    res.json({ ok: true, connected: state.connected, state: state.connected ? "open" : "connecting" });
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