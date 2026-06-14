import express from "express";
import cors from "cors";
import pino from "pino";
import QRCode from "qrcode";
import fs from "node:fs/promises";
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
  qrGeneratedAt: 0,
  connected: false,
  connectionState: "starting",
  startingAt: 0,
  lastError: null,
  me: null,
  runId: 0,
  restartTimer: null,
};

let startPromise = null;

function auth(req, res, next) {
  if (!INTERNAL_TOKEN) return next();
  if (req.headers["x-internal-token"] !== INTERNAL_TOKEN) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

async function startSock() {
  if (startPromise) return startPromise;

  startPromise = startSockInternal();
  try {
    return await startPromise;
  } finally {
    startPromise = null;
  }
}

async function stopSock(reason = "restart") {
  if (state.restartTimer) {
    clearTimeout(state.restartTimer);
    state.restartTimer = null;
  }
  const sock = state.sock;
  state.sock = null;
  if (!sock) return;
  try { sock.ev?.removeAllListeners?.("connection.update"); } catch {}
  try { sock.ev?.removeAllListeners?.("creds.update"); } catch {}
  try { sock.end?.(new Error(reason)); } catch {}
}

async function resetAuthDir() {
  await stopSock("reset auth");
  await fs.rm(AUTH_DIR, { recursive: true, force: true });
}

function scheduleRestart(runId) {
  if (runId !== state.runId || state.restartTimer) return;
  state.restartTimer = setTimeout(() => {
    state.restartTimer = null;
    startSock().catch((e) => {
      state.lastError = e?.message || String(e);
      console.error("Baileys restart failed", e);
    });
  }, 2000);
}

function qrExpiresInSeconds() {
  if (!state.qrGeneratedAt) return null;
  return Math.max(0, 60 - Math.floor((Date.now() - state.qrGeneratedAt) / 1000));
}

async function startSockInternal() {
  state.runId += 1;
  const runId = state.runId;

  await stopSock("new socket");
  await fs.mkdir(AUTH_DIR, { recursive: true });

  state.startingAt = Date.now();
  state.qr = null;
  state.qrDataUrl = null;
  state.qrGeneratedAt = 0;
  state.connected = false;
  state.connectionState = "connecting";
  state.lastError = null;
  state.me = null;

  const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const sock = makeWASocket({
    auth: authState,
    logger,
    printQRInTerminal: false,
    browser: ["Kenia", "Chrome", "1.0"],
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", async (update) => {
    if (runId !== state.runId) return;
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      state.qr = qr;
      state.qrGeneratedAt = Date.now();
      state.connectionState = "qr";
      try {
        state.qrDataUrl = await QRCode.toDataURL(qr, { width: 320, margin: 2 });
      } catch (e) {
        state.qrDataUrl = null;
        state.lastError = e?.message || String(e);
      }
    }
    if (connection === "open") {
      state.connected = true;
      state.connectionState = "open";
      state.me = sock.user || null;
      state.qr = null;
      state.qrDataUrl = null;
      state.qrGeneratedAt = 0;
      state.lastError = null;
    }
    if (connection === "close") {
      state.connected = false;
      state.connectionState = "close";
      const code = lastDisconnect?.error?.output?.statusCode;
      state.lastError = lastDisconnect?.error?.message || (code ? `Disconnect ${code}` : "Conexão encerrada");
      if (code !== DisconnectReason.loggedOut) {
        scheduleRestart(runId);
      } else {
        state.connectionState = "logged_out";
      }
    }
  });

  state.sock = sock;
}

app.get("/api", (_req, res) => res.json({ ok: true, service: "kenia-whatsapp" }));

function statusPayload() {
  const hasQr = Boolean(state.qrDataUrl || state.qr);
  return {
    ok: true,
    connected: state.connected,
    state: state.connected ? "open" : hasQr ? "qr" : state.connectionState,
    hasQr,
    startingAt: state.startingAt,
    last_error: state.lastError,
    me: state.me,
  };
}

function qrPayload() {
  return {
    ...statusPayload(),
    qr: state.qrDataUrl || state.qr,
    raw: state.qr,
    qr_expires_in_s: qrExpiresInSeconds(),
  };
}

app.get("/api/whatsapp/baileys/status", auth, (_req, res) => {
  res.json(statusPayload());
});

app.get("/api/whatsapp/qr", auth, (_req, res) => res.json(qrPayload()));
app.get("/api/whatsapp/baileys/qr", auth, (_req, res) => res.json(qrPayload()));
app.get("/api/whatsapp/qr/image", auth, (_req, res) => {
  if (!state.qrDataUrl) return res.status(404).json(qrPayload());
  const png = Buffer.from(state.qrDataUrl.replace(/^data:image\/png;base64,/, ""), "base64");
  res.type("png").send(png);
});

app.post("/api/whatsapp/baileys/restart", auth, async (_req, res) => {
  try {
    await resetAuthDir();
    await startSock();
    res.json(statusPayload());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/whatsapp/baileys/reconnect", auth, async (_req, res) => {
  try {
    await startSock();
    res.json(statusPayload());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function logoutAndReset(res) {
  try {
    try { await state.sock?.logout?.(); } catch {}
    await resetAuthDir();
    state.connected = false;
    state.qr = null;
    state.qrDataUrl = null;
    state.qrGeneratedAt = 0;
    state.connectionState = "logged_out";
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

app.post("/api/whatsapp/logout", auth, async (_req, res) => logoutAndReset(res));

app.post("/api/whatsapp/baileys/logout", auth, async (_req, res) => logoutAndReset(res));

app.listen(PORT, () => {
  console.log(`Kenia WhatsApp backend on :${PORT}`);
  startSock().catch((e) => console.error("startSock failed", e));
});