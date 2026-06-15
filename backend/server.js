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
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://bcafttsxvperfslgjphb.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const AI_ROUTER_URL = (process.env.AI_ROUTER_URL || `${SUPABASE_URL.replace(/\/+$/, "")}/functions/v1/ai-router`).replace(/\/+$/, "");
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_URL || "").replace(/\/+$/, "");
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:3b-instruct";

const DEFAULT_BOT_PROMPT = `Você é a secretária jurídica da Dra. Kênia Garcia atendendo pelo WhatsApp.
Responda sempre em português do Brasil, com tom humano, acolhedor, profissional e objetivo.
Nunca diga que é IA, robô, chatbot ou modelo. Não use markdown extenso nem HTML.
Faça uma pergunta por vez, mantenha continuidade pelo histórico e encaminhe para agendamento quando fizer sentido.`;

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
  lastAiError: null,
  lastIncomingAt: null,
  lastIncomingFrom: null,
  lastIncomingTextPreview: null,
  incomingCount: 0,
  lastIgnoredAt: null,
  lastIgnoredReason: null,
  ignoredCount: 0,
  lastReplyTarget: null,
  lastReplyTextPreview: null,
  lastSendError: null,
  lastAutoReplyAt: null,
  autoReplyCount: 0,
  qrAttempts: 0,
  config: { provider: "baileys", bot_enabled: true, bot_prompt: DEFAULT_BOT_PROMPT },
};

let startSeq = 0;
let reconnectTimer = null;
let qrWatchdogTimer = null;
const processedMessages = new Set();
const conversationHistory = new Map();

const connectionState = () => {
  if (state.connected) return "open";
  if (state.qrDataUrl) return "qr";
  if (state.lastError) return "offline";
  return "connecting";
};

const markIgnoredMessage = (reason) => {
  state.lastIgnoredAt = Date.now();
  state.lastIgnoredReason = reason;
  state.ignoredCount += 1;
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

const extractTextMessage = (message = {}) => {
  const content = message.ephemeralMessage?.message || message.viewOnceMessage?.message || message;
  return (
    content.conversation ||
    content.extendedTextMessage?.text ||
    content.imageMessage?.caption ||
    content.videoMessage?.caption ||
    ""
  ).trim();
};

const isReplyableJid = (jid = "") => {
  return jid.endsWith("@s.whatsapp.net") || jid.endsWith("@g.us");
};

const rememberMessage = (jid, role, content) => {
  const history = conversationHistory.get(jid) || [];
  history.push({ role, content: String(content || "").slice(0, 1200) });
  conversationHistory.set(jid, history.slice(-12));
  return conversationHistory.get(jid);
};

async function generateDirectOllamaReply(messages) {
  if (!OLLAMA_BASE_URL) throw new Error("OLLAMA_BASE_URL não configurado no backend WhatsApp");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const r = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
      signal: controller.signal,
      body: JSON.stringify({ model: OLLAMA_MODEL, messages, stream: false, options: { temperature: 0.2, num_predict: 220 } }),
    });
    const raw = await r.text();
    if (!r.ok) throw new Error(`ollama_${r.status}: ${raw.slice(0, 300)}`);
    const data = JSON.parse(raw || "{}");
    const reply = String(data.message?.content || data.response || "").trim();
    if (!reply) throw new Error("ollama_empty_response");
    return reply;
  } catch (e) {
    throw new Error(e?.name === "AbortError" ? "ollama_timeout" : e.message);
  } finally {
    clearTimeout(timeout);
  }
}

async function generateAiReply(jid, text) {
  const history = rememberMessage(jid, "user", text);
  const messages = [
    { role: "system", content: state.config.bot_prompt || DEFAULT_BOT_PROMPT },
    ...history,
  ];

  const directReply = await generateDirectOllamaReply(messages).catch((e) => {
    state.lastAiError = e.message;
    return null;
  });
  if (directReply) {
    rememberMessage(jid, "assistant", directReply);
    state.lastAiError = null;
    return directReply;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const r = await fetch(AI_ROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } : {}),
      },
      signal: controller.signal,
      body: JSON.stringify({ mode: "chat", provider: "ollama", messages, model: OLLAMA_MODEL }),
    });
    const raw = await r.text();
    if (!r.ok) throw new Error(`ai-router_${r.status}: ${raw.slice(0, 300)}`);
    const data = JSON.parse(raw || "{}");
    const reply = String(data.text || data.response || "").trim();
    if (!reply) throw new Error("ai-router_empty_response");
    rememberMessage(jid, "assistant", reply);
    state.lastAiError = null;
    return reply;
  } catch (e) {
    const msg = e?.name === "AbortError" ? "ai-router_timeout" : e.message;
    state.lastAiError = msg;
    throw new Error(msg);
  } finally {
    clearTimeout(timeout);
  }
}

async function handleIncomingMessage(msg) {
  const jid = msg.key?.remoteJid;
  const id = msg.key?.id;
  if (!state.config.bot_enabled) return markIgnoredMessage("bot_disabled");
  if (msg.key?.fromMe) return markIgnoredMessage("from_me_ignored");
  if (!jid) return markIgnoredMessage("missing_jid");
  if (!id) return markIgnoredMessage("missing_message_id");
  if (!msg.message) return markIgnoredMessage("missing_message_body");
  if (!isReplyableJid(jid)) return markIgnoredMessage(`unsupported_jid:${jid}`);
  if (processedMessages.has(id)) return markIgnoredMessage("duplicate_message");
  processedMessages.add(id);
  if (processedMessages.size > 500) processedMessages.clear();

  const text = extractTextMessage(msg.message);
  if (!text) return markIgnoredMessage("empty_or_unsupported_message_type");

  state.lastIncomingAt = Date.now();
  state.lastIncomingFrom = jid;
  state.lastIncomingTextPreview = text.slice(0, 160);
  state.incomingCount += 1;

  try {
    await state.sock?.sendPresenceUpdate?.("composing", jid);
    const reply = await generateAiReply(jid, text);
    await state.sock?.sendMessage(jid, { text: reply }, { quoted: msg });
    state.lastReplyTarget = jid;
    state.lastReplyTextPreview = reply.slice(0, 160);
    state.lastSendError = null;
    state.lastAutoReplyAt = Date.now();
    state.autoReplyCount += 1;
  } catch (e) {
    state.lastAiError = e.message;
    state.lastSendError = e.message;
    console.error("auto reply failed", e);
    try {
      await state.sock?.sendMessage(jid, { text: "Tive uma instabilidade momentânea no atendimento. Pode me enviar sua mensagem novamente, por favor?" }, { quoted: msg });
    } catch {}
  } finally {
    try { await state.sock?.sendPresenceUpdate?.("paused", jid); } catch {}
  }
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

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (seq !== startSeq || type !== "notify") return;
    for (const msg of messages || []) {
      await handleIncomingMessage(msg);
    }
  });

  state.sock = sock;
}

app.get("/api", (_req, res) => res.json({ ok: true, service: "kenia-whatsapp" }));

// Endpoint público para verificar a conexão com o Ollama (sem auth, leitura apenas).
app.get("/api/ai/ping", async (_req, res) => {
  const result = {
    ollama_base_url: OLLAMA_BASE_URL || null,
    ollama_model: OLLAMA_MODEL,
    configured: !!OLLAMA_BASE_URL,
    is_public: false,
    reachable: false,
    tags_status: null,
    chat_ok: false,
    error: null,
  };
  if (!OLLAMA_BASE_URL) { result.error = "OLLAMA_BASE_URL não definido no Render"; return res.json(result); }
  try {
    const u = new URL(OLLAMA_BASE_URL);
    result.is_public = !/^(localhost|127\.|0\.0\.0\.0|::1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname);
  } catch { result.error = "OLLAMA_BASE_URL inválida"; return res.json(result); }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { headers: { "ngrok-skip-browser-warning": "true" }, signal: ctrl.signal });
    clearTimeout(t);
    result.tags_status = r.status;
    result.reachable = r.ok;
    if (!r.ok) result.error = `tags HTTP ${r.status}`;
  } catch (e) { result.error = `tags: ${e.message}`; return res.json(result); }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    const r = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
      signal: ctrl.signal,
      body: JSON.stringify({ model: OLLAMA_MODEL, stream: false, messages: [{ role: "user", content: "ping" }], options: { num_predict: 8 } }),
    });
    clearTimeout(t);
    const data = await r.json().catch(() => ({}));
    result.chat_ok = r.ok && !!(data?.message?.content);
    if (!result.chat_ok) result.error = `chat HTTP ${r.status}: ${data?.error || ""}`;
  } catch (e) { result.error = `chat: ${e.message}`; }
  res.json(result);
});

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
    { id: "ollama", ok: !state.lastAiError && (!!OLLAMA_BASE_URL || !!AI_ROUTER_URL), label: "Resposta automática IA", msg: state.lastAiError ? `Última falha: ${state.lastAiError}` : (OLLAMA_BASE_URL ? "Backend ligado direto ao Ollama." : "Backend ligado ao ai-router/Ollama."), hint: state.lastAutoReplyAt ? `Última resposta enviada: ${new Date(state.lastAutoReplyAt).toLocaleString("pt-BR")}` : "Envie uma mensagem para este WhatsApp para testar a resposta automática." },
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
    bot_enabled: !!state.config.bot_enabled,
    ollama_base_url_configured: !!OLLAMA_BASE_URL,
    ai_router_url: AI_ROUTER_URL,
    ollama_model: OLLAMA_MODEL,
    last_ai_error: state.lastAiError,
    last_auto_reply_at: state.lastAutoReplyAt,
    auto_reply_count: state.autoReplyCount,
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
    state.qrAttempts = 0;
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