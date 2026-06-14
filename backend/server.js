import express from "express";
import cors from "cors";
import pino from "pino";
import QRCode from "qrcode";
import {
  default as makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
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

app.get("/api/whatsapp/baileys/status", auth, (_req, res) => {
  res.json({
    connected: state.connected,
    hasQr: !!state.qrDataUrl,
    startingAt: state.startingAt,
  });
});

app.get("/api/whatsapp/qr", auth, (_req, res) => {
  res.json({ qr: state.qrDataUrl, raw: state.qr });
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