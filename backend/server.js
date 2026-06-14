import express from "express";
import cors from "cors";
import fs from "node:fs/promises";
import path from "node:path";
import pino from "pino";
import QRCode from "qrcode";
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";

const app = express();
const port = Number(process.env.PORT || 8080);
const sessionDir = process.env.SESSION_DIR || path.join(process.cwd(), "session");
const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
const configPath = path.join(dataDir, "whatsapp-config.json");
const internalToken = (process.env.INTERNAL_TOKEN || "").trim();
const logger = pino({ level: process.env.LOG_LEVEL || "silent" });

let sock = null;
let starting = null;
let state = "starting";
let latestQr = null;
let latestQrImage = null;
let latestQrAt = 0;
let me = null;
let lastError = null;

const defaultConfig = {
  provider: "baileys",
  bot_enabled: true,
  bot_prompt: "Atendimento jurídico da Dra. Kênia Garcia.",
  bot_voice_mode: "text_only",
};

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));

app.use((req, res, next) => {
  if (!internalToken || req.method === "GET" || req.path === "/api") return next();
  if (req.get("x-internal-token") === internalToken) return next();
  return res.status(401).json({ ok: false, error: "INVALID_INTERNAL_TOKEN" });
});

const ensureDirs = async () => {
  await fs.mkdir(sessionDir, { recursive: true });
  await fs.mkdir(dataDir, { recursive: true });
};

const readConfig = async () => {
  try {
    const raw = await fs.readFile(configPath, "utf8");
    return { ...defaultConfig, ...JSON.parse(raw) };
  } catch {
    return defaultConfig;
  }
};

const writeConfig = async (cfg) => {
  await ensureDirs();
  const next = { ...defaultConfig, ...cfg, provider: cfg?.provider || "baileys" };
  await fs.writeFile(configPath, JSON.stringify(next, null, 2));
  return next;
};

const qrExpiresIn = () => {
  if (!latestQrAt) return null;
  return Math.max(0, 60 - Math.floor((Date.now() - latestQrAt) / 1000));
};

const publicStatus = () => ({
  ok: true,
  connected: state === "open",
  state,
  me,
  has_qr: Boolean(latestQrImage),
  qr_expires_in_s: qrExpiresIn(),
  last_error: state === "open" ? null : lastError,
});

const closeSocket = async () => {
  try { sock?.ws?.close?.(); } catch { /* noop */ }
  try { sock?.end?.(); } catch { /* noop */ }
  sock = null;
};

const startSocket = async ({ force = false } = {}) => {
  if (starting) return starting;
  if (sock && !force) return sock;

  starting = (async () => {
    await ensureDirs();
    if (force) await closeSocket();
    state = "connecting";
    lastError = null;

    const { state: authState, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));

    sock = makeWASocket({
      auth: authState,
      version,
      printQRInTerminal: false,
      logger,
      browser: ["Kenia Garcia", "Chrome", "1.0.0"],
      syncFullHistory: false,
    });

    sock.ev.on("creds.update", saveCreds);
    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        latestQr = qr;
        latestQrAt = Date.now();
        latestQrImage = await QRCode.toDataURL(qr, {
          type: "image/png",
          width: 320,
          margin: 2,
          errorCorrectionLevel: "M",
        });
        state = "connecting";
      }

      if (connection === "open") {
        state = "open";
        latestQr = null;
        latestQrImage = null;
        latestQrAt = 0;
        me = sock?.user || null;
        lastError = null;
      }

      if (connection === "close") {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;
        state = loggedOut ? "logged_out" : "offline";
        me = null;
        lastError = lastDisconnect?.error?.message || (loggedOut ? "Sessão encerrada." : "Conexão fechada.");
        sock = null;
        if (!loggedOut) setTimeout(() => startSocket().catch(() => {}), 2500);
      }
    });

    sock.ev.on("messages.upsert", async ({ messages }) => {
      const autoReply = (process.env.AUTO_REPLY_TEXT || "").trim();
      if (!autoReply) return;
      for (const msg of messages || []) {
        if (!msg?.key?.remoteJid || msg.key.fromMe) continue;
        await sock.sendMessage(msg.key.remoteJid, { text: autoReply }).catch(() => {});
      }
    });

    return sock;
  })().finally(() => { starting = null; });

  return starting;
};

const restartSocket = async ({ clearSession = false } = {}) => {
  await closeSocket();
  if (clearSession) await fs.rm(sessionDir, { recursive: true, force: true });
  latestQr = null;
  latestQrImage = null;
  latestQrAt = 0;
  me = null;
  state = "connecting";
  await startSocket({ force: true });
  return publicStatus();
};

const normalizePhone = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.includes("@") ? digits : `${digits}@s.whatsapp.net`;
};

app.get("/api", (_req, res) => res.json({ ok: true, service: "kenia-whatsapp-backend" }));
app.get("/api/whatsapp/config", async (_req, res) => res.json(await readConfig()));
app.put("/api/whatsapp/config", async (req, res) => res.json(await writeConfig(req.body || {})));

app.get("/api/whatsapp/diagnostics", (_req, res) => {
  res.json({
    ok: true,
    static_mode: false,
    checks: [
      { id: "backend", ok: true, label: "Backend ativo", msg: "Servidor WhatsApp Baileys respondendo." },
      { id: "session", ok: state === "open" || Boolean(latestQrImage), label: "Sessão", msg: state },
    ],
  });
});

app.get("/api/whatsapp/baileys/status", async (_req, res) => {
  if (!sock && state !== "open") startSocket().catch((err) => { lastError = err.message; state = "offline"; });
  res.json(publicStatus());
});

app.get(["/api/whatsapp/baileys/qr", "/api/whatsapp/qr", "/api/whatsapp/qr/image"], async (_req, res) => {
  if (!sock && state !== "open") startSocket().catch((err) => { lastError = err.message; state = "offline"; });
  res.json({
    ok: true,
    connected: state === "open",
    state,
    qr: latestQrImage,
    raw_qr: latestQr,
    qr_expires_in_s: qrExpiresIn(),
    last_error: lastError,
  });
});

app.post(["/api/whatsapp/baileys/reconnect", "/api/whatsapp/baileys/restart"], async (_req, res) => {
  try {
    const status = await restartSocket({ clearSession: false });
    res.json(status);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post(["/api/whatsapp/baileys/logout", "/api/whatsapp/logout"], async (_req, res) => {
  try {
    try { await sock?.logout?.(); } catch { /* session may already be closed */ }
    const status = await restartSocket({ clearSession: true });
    res.json(status);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/whatsapp/test-connection", (_req, res) => {
  res.json({ connected: state === "open", provider: "baileys", state, hint: state === "open" ? null : "Escaneie o QR Code do Baileys." });
});

app.post("/api/whatsapp/send-direct", async (req, res) => {
  if (state !== "open" || !sock) return res.status(409).json({ ok: false, error: "WHATSAPP_NOT_CONNECTED" });
  const jid = normalizePhone(req.body?.phone);
  const text = String(req.body?.text || "").trim();
  if (!jid || !text) return res.status(400).json({ ok: false, error: "PHONE_AND_TEXT_REQUIRED" });
  const sent = await sock.sendMessage(jid, { text });
  res.json({ ok: true, message: "sent", provider_result: sent });
});

app.use((req, res) => res.status(404).json({ ok: false, error: "NOT_FOUND", path: req.path }));

app.listen(port, async () => {
  await ensureDirs();
  startSocket().catch((err) => { lastError = err.message; state = "offline"; });
  console.log(`Kenia WhatsApp backend running on :${port}`);
});