import express from "express";
import cors from "cors";
import pino from "pino";
import QRCode from "qrcode";
import fs from "fs/promises";
import {
  default as makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} from "@whiskeysockets/baileys";

const PORT = process.env.PORT || 10000;
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || "";
const REQUIRE_INTERNAL_TOKEN = process.env.REQUIRE_INTERNAL_TOKEN === "true";
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
  status: "starting",
  me: null,
  lastError: null,
  startingAt: 0,
  startingPromise: null,
};

let whatsappConfig = { provider: "baileys", bot_enabled: true };

function auth(req, res, next) {
  if (!REQUIRE_INTERNAL_TOKEN || !INTERNAL_TOKEN) return next();
  if (req.headers["x-internal-token"] !== INTERNAL_TOKEN) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

async function startSock({ force = false } = {}) {
  if (state.startingPromise && !force) return state.startingPromise;
  if (force) {
    try { state.sock?.end?.(new Error("restart")); } catch {}
  }

  state.startingAt = Date.now();
  state.qr = null;
  state.qrDataUrl = null;
  state.connected = false;
  state.status = "connecting";
  state.me = null;
  state.lastError = null;

  state.startingPromise = (async () => {
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
        state.status = "qr";
        state.qr = qr;
        try {
          state.qrDataUrl = await QRCode.toDataURL(qr, { width: 320, margin: 2, errorCorrectionLevel: "M" });
        } catch (e) {
          state.qrDataUrl = null;
          state.lastError = e?.message || String(e);
        }
      }
      if (connection === "open") {
        state.connected = true;
        state.status = "open";
        state.me = sock.user || null;
        state.qr = null;
        state.qrDataUrl = null;
      }
      if (connection === "close") {
        state.connected = false;
        const code = lastDisconnect?.error?.output?.statusCode;
        state.status = code === DisconnectReason.loggedOut ? "logged_out" : "close";
        state.lastError = lastDisconnect?.error?.message || null;
        state.startingPromise = null;
        if (code !== DisconnectReason.loggedOut) {
          setTimeout(() => startSock({ force: true }).catch(() => {}), 2000);
        }
      }
    });

    state.sock = sock;
    return sock;
  })().finally(() => {
    if (state.status !== "open") state.startingPromise = null;
  });

  return state.startingPromise;
}

app.get("/api", (_req, res) => res.json({ ok: true, service: "kenia-whatsapp" }));

app.get("/api/whatsapp/config", auth, (_req, res) => res.json(whatsappConfig));

app.put("/api/whatsapp/config", auth, (req, res) => {
  whatsappConfig = { ...whatsappConfig, ...(req.body || {}), provider: "baileys" };
  res.json(whatsappConfig);
});

app.get("/api/whatsapp/diagnostics", auth, (_req, res) => res.json({
  ok: true,
  checks: [
    { id: "baileys-service", ok: true, label: "Backend Baileys ativo", msg: "Serviço pronto para gerar QR Code." },
    { id: "baileys-session", ok: state.connected || !!state.qrDataUrl, label: "Sessão WhatsApp", msg: state.connected ? "WhatsApp conectado." : "Aguardando leitura do QR Code." },
  ],
}));

app.get("/api/whatsapp/baileys/status", auth, (_req, res) => {
  res.json({
    ok: true,
    connected: state.connected,
    state: state.status,
    hasQr: !!state.qrDataUrl,
    me: state.me,
    last_error: state.lastError,
    startingAt: state.startingAt,
  });
});

app.get("/api/whatsapp/qr", auth, (_req, res) => {
  res.json({ ok: true, connected: state.connected, qr: state.qrDataUrl, qrcode: state.qrDataUrl, qrCode: state.qrDataUrl, raw: state.qr, state: state.status });
});

app.get("/api/whatsapp/baileys/qr", auth, (_req, res) => {
  res.json({ ok: true, connected: state.connected, qr: state.qrDataUrl, qrcode: state.qrDataUrl, qrCode: state.qrDataUrl, raw: state.qr, state: state.status });
});

app.get("/api/whatsapp/qr/image", auth, (_req, res) => {
  res.json({ ok: true, connected: state.connected, qr: state.qrDataUrl, raw: state.qr, state: state.status });
});

app.post("/api/whatsapp/test-connection", auth, (_req, res) => {
  res.json({ connected: state.connected, provider: "baileys", state: state.status, hasQr: !!state.qrDataUrl });
});

const restartHandler = async (_req, res) => {
  try {
    await startSock({ force: true });
    res.json({ ok: true, connected: state.connected, state: state.status, hasQr: !!state.qrDataUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

app.post("/api/whatsapp/baileys/restart", auth, restartHandler);
app.post("/api/whatsapp/baileys/reconnect", auth, restartHandler);

const logoutHandler = async (_req, res) => {
  try {
    try { await state.sock?.logout?.(); } catch {}
    try { state.sock?.end?.(new Error("logout")); } catch {}
    await fs.rm(AUTH_DIR, { recursive: true, force: true });
    state.connected = false;
    state.qr = null;
    state.qrDataUrl = null;
    state.me = null;
    state.status = "logged_out";
    state.startingPromise = null;
    await startSock({ force: true });
    res.json({ ok: true, connected: false, state: state.status });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

app.post("/api/whatsapp/logout", auth, logoutHandler);
app.post("/api/whatsapp/baileys/logout", auth, logoutHandler);

app.listen(PORT, () => {
  console.log(`Kenia WhatsApp backend on :${PORT}`);
  startSock().catch((e) => console.error("startSock failed", e));
});