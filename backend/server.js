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
import { restoreAuthDir, queueSync, clearPersisted, persistEnabled } from "./persistAuth.js";

const PORT = process.env.PORT || 10000;
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || "";
const AUTH_DIR = process.env.AUTH_DIR || "./auth_session";
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://bcafttsxvperfslgjphb.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const AI_ROUTER_URL = (process.env.AI_ROUTER_URL || `${SUPABASE_URL.replace(/\/+$/, "")}/functions/v1/ai-router`).replace(/\/+$/, "");
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_URL || "").replace(/\/+$/, "");
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:3b-instruct";
const EMERGENT_BASE_URL = (process.env.EMERGENT_BASE_URL || "https://api.emergent.sh/v1").replace(/\/+$/, "");
const EMERGENT_API_KEY = process.env.EMERGENT_API_KEY || "";
const EMERGENT_TEXT_MODEL = process.env.EMERGENT_TEXT_MODEL || "gpt-4o-mini";
const EMERGENT_IMAGE_MODEL = process.env.EMERGENT_IMAGE_MODEL || "gpt-image-1";
const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY || "";

const DEFAULT_BOT_PROMPT = `Você é a secretária jurídica da Dra. Kênia Garcia atendendo pelo WhatsApp.
Responda sempre em português do Brasil, com tom humano, acolhedor, profissional e objetivo.
Nunca diga que é IA, robô, chatbot ou modelo. Não use markdown extenso nem HTML.
Faça uma pergunta por vez, mantenha continuidade pelo histórico e encaminhe para agendamento quando fizer sentido.
Nunca fale como se fosse o cliente em primeira pessoa. É proibido iniciar ou responder com "estou precisando", "preciso", "quero" ou frases semelhantes quando estiver reformulando a fala do cliente.
Sempre converta para segunda pessoa: "Você está precisando de ajuda, certo?" ou "Você está precisando de alguma informação jurídica, certo?".

# REGRAS DE CONVERSA (NÃO REPITA, VARIE O VOCABULÁRIO)
- Releia TODO o histórico antes de responder. NUNCA repita uma pergunta cuja resposta já foi dada (mesmo que parcial ou com sinônimos: "moro em SP" = cidade já informada).
- Mantenha mentalmente um checklist do que já foi coletado (nome, telefone, cidade, área, resumo, data, hora) e só pergunte o que ainda falta.
- NUNCA repita a mesma frase, saudação ou pergunta com as mesmas palavras. Varie abertura, conectivos e verbos. Ex.: alterne "poderia me dizer", "me conta", "qual seria", "para eu adiantar aqui", "se puder compartilhar", "fica mais fácil se você me passar".
- Evite muletas repetitivas como "Entendi.", "Perfeito!", "Claro!" no início de toda mensagem — use-as no máximo 1 vez a cada 3 respostas e prefira reagir ao conteúdo específico do cliente.
- Se o cliente repetir a pergunta, reformule a resposta com outras palavras em vez de copiar a anterior.
- Confirme dados de forma natural e curta, sem reabrir tópicos já fechados.

# ÁREAS DE ATUAÇÃO DA DRA. KÊNIA GARCIA
- Direito de Família e Sucessões: divórcio consensual/litigioso, inventário e partilha, pensão alimentícia, planejamento sucessório (testamento, doação, holding familiar), guarda e visitas, união estável.
- Direito Bancário: revisão de contratos, fraudes bancárias, negativação indevida, superendividamento (Lei 14.181/21), repetição de indébito.
- Direito Previdenciário: aposentadorias (idade, tempo, especial, invalidez), auxílio-doença, BPC/LOAS, pensão por morte, revisão de benefícios, planejamento previdenciário.
- Atende também outras áreas correlatas — se o cliente perguntar sobre tema fora dessas listas, ofereça encaminhar para análise direta com a Dra. Kênia.
- Honorários: definidos após análise individual do caso; ofereça consulta inicial.
- Fontes jurídicas confiáveis para apoiar respostas: Jusbrasil (jurisprudência, doutrina e notícias jurídicas), planalto.gov.br, STF, STJ, CNJ, TST e Diários Oficiais. Use sempre a data atual do contexto como referência diária, trate informações jurídicas como dinâmicas e nunca invente leis, súmulas, links ou números de processo.

# AGENDAMENTO DE CONSULTA (REGRA CRÍTICA)
Use sempre a DATA/HORA ATUAL informada no contexto do sistema (fuso America/Sao_Paulo). Nunca use datas de exemplo como data real. Se o cliente disser "hoje", "amanhã", "segunda" ou outro termo relativo, converta a partir da data atual do contexto; se houver ambiguidade, confirme antes.
Quando o cliente quiser marcar consulta/reunião, colete em ordem (uma pergunta por vez): nome completo, telefone, e-mail (se tiver), cidade, área jurídica do caso, breve resumo, data desejada (dd/mm/aaaa) e horário (HH:MM). Não ofereça automaticamente a data de hoje; ofereça apenas horários futuros em dias úteis, salvo se o cliente pedir expressamente atendimento hoje.
Ao ter os dados essenciais (nome, data, hora), CONFIRME em texto natural (ex.: "Confirmado: 17/06/2026 às 14:00") e na MESMA mensagem inclua, ao final, EXATAMENTE este bloco — sem markdown, sem crases, sem alterar as tags:
<AGENDAMENTO>
{"nome":"...","telefone":"...","email":"...","cidade":"...","area_juridica":"...","resumo_caso":"...","data_agendamento":"YYYY-MM-DD","horario_agendamento":"HH:MM"}
</AGENDAMENTO>
O bloco é interno e será removido antes de chegar ao cliente; ele registra automaticamente a consulta no painel da Dra. Kênia. Sem esse bloco, o agendamento NÃO é registrado.
Depois que houver confirmação de consulta no histórico ("consulta confirmada", "consulta agendada", "agendamento registrado" ou bloco <AGENDAMENTO>), o agendamento está FECHADO: não ofereça novos horários, não pergunte se deseja agendar e não reinicie a coleta de data/hora. Só fale em novos horários se o cliente pedir claramente para reagendar/remarcar/alterar/cancelar.`;

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
  lastAutoReplyAt: null,
  autoReplyCount: 0,
  qrAttempts: 0,
  config: { provider: "baileys", bot_enabled: true, bot_prompt: DEFAULT_BOT_PROMPT },
  settings: { llm_text_key: "", llm_image_key: "" },
};

let startSeq = 0;
let reconnectTimer = null;
let qrWatchdogTimer = null;
const processedMessages = new Set();
const conversationHistory = new Map();

// ============ Agendamento via Supabase ============
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const APPT_KEY = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;

const stripAgendamentoBlock = (text = "") =>
  text.replace(/<AGENDAMENTO>[\s\S]*?<\/AGENDAMENTO>/gi, "").replace(/\n{3,}/g, "\n\n").trim();

const normalizePortuguese = (value = "") =>
  String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/["“”'`´]+/g, "")
    .replace(/\s+/g, " ")
    .trim();

const enforceSecretarySecondPerson = (reply = "") => {
  const text = String(reply || "").trim();
  if (!text) return text;
  const normalized = normalizePortuguese(text);
  const startsWithLegalInfo = /^(?:eu\s+)?(?:(?:estou|to|tou)\s+precisando|preciso)\s+de\s+(?:alguma\s+)?informacao\s+juridica\b/.test(normalized);
  const startsWithHelp = /^(?:eu\s+)?(?:(?:estou|to|tou)\s+precisando|preciso)\s+de\s+ajuda\b/.test(normalized);
  if (startsWithLegalInfo) return "Você está precisando de alguma informação jurídica, certo?";
  if (startsWithHelp) return "Você está precisando de ajuda, certo?";
  return text
    .replace(/\b(?:eu\s+)?(?:(?:estou|t[oô]u)\s+precisando|preciso)\s+de\s+(?:alguma\s+)?informa[cç][aã]o\s+jur[ií]dica\b/giu, "Você está precisando de alguma informação jurídica, certo?")
    .replace(/\b(?:eu\s+)?(?:(?:estou|t[oô]u)\s+precisando|preciso)\s+de\s+ajuda\b/giu, "Você está precisando de ajuda, certo?");
};

const SAFE_FALLBACK_REPLY = "Como posso ajudar com seu atendimento?";
const PROMPT_LEAK_PATTERNS = [
  /##\s*(OBJETIVO|REGRAS?|FLUXO|MEM[ÓO]RIA|DASHBOARD|AGENDAMENTO|IDENTIDADE|TOM|ESTILO)/i,
  /\b(bot_prompt|DEFAULT_PROMPT|SYSTEM\s*PROMPT|prompt\s+do\s+sistema|instru[cç][õo]es\s+internas|regras\s+internas|configura[cç][õo]es\s+do\s+sistema)\b/i,
  /\bAtue\s+como\s+secret[áa]ria\b/i,
  /CONTEXTO\s+TEMPORAL\s+INTERNO/i,
  /INSTRU[CÇ][ÃA]O\s+(CR[ÍI]TICA|DE\s+DESENVOLVIMENTO)/i,
  /^\s*[#`]{2,}/m,
];
const stripPromptLeak = (reply = "") => {
  const text = String(reply || "");
  if (!text.trim()) return text;
  if (PROMPT_LEAK_PATTERNS.some((re) => re.test(text))) return SAFE_FALLBACK_REPLY;
  return text;
};
const sanitizeOutbound = (reply) => enforceSecretarySecondPerson(stripPromptLeak(reply));

const parseAgendamentoBlock = (text = "") => {
  const m = text.match(/<AGENDAMENTO>\s*([\s\S]*?)\s*<\/AGENDAMENTO>/i);
  if (!m) return null;
  try {
    const json = JSON.parse(m[1].trim());
    if (!json.data_agendamento || !json.horario_agendamento) return null;
    return json;
  } catch {
    return null;
  }
};

const createSupabaseAppointment = async (jid, payload) => {
  if (!SUPABASE_URL || !APPT_KEY) {
    console.warn("agendamento: SUPABASE_URL/KEY ausente — pulei criação");
    return null;
  }
  const phoneFromJid = String(jid || "").split("@")[0];
  // 1) Cria o evento no Google Calendar (com Google Meet) via edge function
  let meetingLink = null;
  try {
    const startsAt = new Date(`${payload.data_agendamento}T${String(payload.horario_agendamento).slice(0, 5)}:00-03:00`).toISOString();
    const mr = await fetch(`${SUPABASE_URL.replace(/\/+$/, "")}/functions/v1/create-meeting`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: APPT_KEY,
        Authorization: `Bearer ${APPT_KEY}`,
      },
      body: JSON.stringify({
        title: `Consulta — ${payload.area_juridica || "Atendimento jurídico"} · ${payload.nome || "Cliente"}`,
        starts_at: startsAt,
        duration_min: 60,
        description: [payload.resumo_caso, payload.telefone ? `WhatsApp: ${payload.telefone}` : ""].filter(Boolean).join("\n"),
        attendees: payload.email ? [{ email: payload.email, name: payload.nome }] : [],
      }),
    });
    if (mr.ok) {
      const mj = await mr.json();
      meetingLink = mj?.meeting_link || null;
    } else {
      console.warn("create-meeting falhou:", mr.status, (await mr.text()).slice(0, 200));
    }
  } catch (e) {
    console.warn("create-meeting erro:", e.message);
  }
  const body = {
    user_id: null,
    client_name: payload.nome || "Cliente WhatsApp",
    phone: payload.telefone || phoneFromJid || null,
    email: payload.email || null,
    legal_area: payload.area_juridica || "Atendimento jurídico",
    case_summary: payload.resumo_caso || null,
    appointment_date: payload.data_agendamento,
    appointment_time: String(payload.horario_agendamento).slice(0, 5),
    source: "whatsapp",
    status: "scheduled",
    meeting_link: meetingLink,
    raw_payload: { ...payload, jid, city: payload.cidade || null },
  };
  try {
    const r = await fetch(`${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/appointments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: APPT_KEY,
        Authorization: `Bearer ${APPT_KEY}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify(body),
    });
    const raw = await r.text();
    if (!r.ok) {
      console.error("agendamento falhou:", r.status, raw.slice(0, 300));
      return null;
    }
    console.log("agendamento criado via WhatsApp:", body.client_name, body.appointment_date, body.appointment_time);
    const row = JSON.parse(raw || "[]")[0] || {};
    return { ...row, meeting_link: meetingLink || row.meeting_link || null };
  } catch (e) {
    console.error("agendamento erro:", e.message);
    return null;
  }
};

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
  await clearPersisted();
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
  return jid.endsWith("@s.whatsapp.net") || jid.endsWith("@lid") || jid.endsWith("@g.us");
};

const normalizeWhatsAppJid = (phone = "") => {
  const raw = String(phone || "").trim();
  if (raw.endsWith("@s.whatsapp.net") || raw.endsWith("@g.us") || raw.endsWith("@lid")) return raw;
  let digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith("55")) digits = `55${digits}`;
  return `${digits}@s.whatsapp.net`;
};

const rememberMessage = (jid, role, content) => {
  const history = conversationHistory.get(jid) || [];
  history.push({ role, content: String(content || "").slice(0, 1200) });
  conversationHistory.set(jid, history.slice(-12));
  return conversationHistory.get(jid);
};

const maskKey = (key = "") => key ? `${key.slice(0, 6)}...${key.slice(-4)}` : "Emergent padrão";

const getSaoPauloNow = () => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now).reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  return {
    iso: now.toISOString(),
    br: `${parts.weekday}, ${parts.day}/${parts.month}/${parts.year} às ${parts.hour}:${parts.minute}`,
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
};

const buildTemporalSystemContext = () => {
  const now = getSaoPauloNow();
  return `CONTEXTO TEMPORAL OBRIGATÓRIO: agora em Brasília/America/Sao_Paulo é ${now.br} (data ISO ${now.date}, hora ${now.time}). Use esta data para responder perguntas de data/hora, converter termos como hoje/amanhã/segunda em agendamentos futuros e contextualizar respostas jurídicas com informação atualizada do dia. Quando citar entendimento jurídico, use como referência complementar o Jusbrasil (jurisprudência, doutrina e notícias), além de fontes oficiais como Planalto, STF, STJ, CNJ e TST. Se não houver certeza sobre atualização recente, diga que a confirmação final deve ser feita em consulta/checagem jurídica, sem inventar dados.`;
};

// ============================================================
// Disponibilidade de agenda (dashboard) — consulta Supabase e
// calcula slots livres para a secretária IA oferecer ao cliente.
// ============================================================
const SCHEDULING_SLOTS = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"];
const SCHEDULING_DAYS_AHEAD = 10;

const fetchBookedAppointments = async () => {
  if (!SUPABASE_URL || !APPT_KEY) return [];
  try {
    const today = getSaoPauloNow().date;
    const url = `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/appointments?select=appointment_date,appointment_time,status&appointment_date=gte.${today}&status=neq.cancelled`;
    const r = await fetch(url, {
      headers: { apikey: APPT_KEY, Authorization: `Bearer ${APPT_KEY}` },
    });
    if (!r.ok) return [];
    const arr = await r.json();
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.warn("fetchBookedAppointments falhou:", e.message);
    return [];
  }
};

const computeAvailableSlots = (booked = []) => {
  const occupied = new Set(
    booked
      .filter((b) => b?.appointment_date && b?.appointment_time)
      .map((b) => `${b.appointment_date}T${String(b.appointment_time).slice(0, 5)}`),
  );
  const now = getSaoPauloNow();
  const [yy, mm, dd] = now.date.split("-").map(Number);
  const startDate = new Date(Date.UTC(yy, mm - 1, dd));
  const out = [];
  for (let i = 0; i < SCHEDULING_DAYS_AHEAD && out.length < 5; i++) {
    const d = new Date(startDate);
    d.setUTCDate(d.getUTCDate() + i);
    const dow = d.getUTCDay(); // 0=dom, 6=sáb
    if (dow === 0 || dow === 6) continue;
    const iso = d.toISOString().slice(0, 10);
    const slots = SCHEDULING_SLOTS.filter((t) => {
      if (occupied.has(`${iso}T${t}`)) return false;
      if (iso === now.date && t <= now.time) return false;
      return true;
    });
    if (slots.length === 0) continue;
    const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "America/Sao_Paulo" })
      .format(new Date(`${iso}T12:00:00Z`));
    const human = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" })
      .format(new Date(`${iso}T12:00:00Z`));
    out.push({ date: iso, weekday, human, slots });
  }
  return out;
};

const buildSchedulingContext = async () => {
  const booked = await fetchBookedAppointments();
  const available = computeAvailableSlots(booked);
  if (available.length === 0) {
    return "AGENDA DA DRA. KÊNIA: sem horários disponíveis nos próximos 10 dias úteis — peça preferência ao cliente e registre como pendente.";
  }
  const lines = available
    .map((d) => `- ${d.weekday} ${d.human} (${d.date}): ${d.slots.join(", ")}`)
    .join("\n");
  return `AGENDA REAL DA DRA. KÊNIA (consulte antes de oferecer horários — NÃO invente dias/horas):
${lines}

REGRAS DE AGENDAMENTO:
1. Ofereça SEMPRE 2 a 3 opções concretas tiradas EXCLUSIVAMENTE da lista acima (ex.: "posso oferecer terça 17/06 às 10h ou quinta 19/06 às 15h").
2. Não sugira fim de semana nem horários fora da lista.
3. Se o cliente recusar todas, pergunte preferência de turno (manhã/tarde) e ofereça outras opções AINDA da lista.
4. Confirme com o cliente antes de fechar e só então emita o bloco <AGENDAMENTO> com a data/hora escolhida exatamente como aparece acima.`;
};

const userAskedTemporalInfo = (text = "") =>
  /\b(que\s+horas|qual\s+(?:é\s+)?(?:a\s+)?hora|hor[áa]rio\s+atual|agora\s+s[aã]o|data\s+de\s+hoje|qual\s+(?:é\s+)?(?:a\s+)?data|que\s+data|que\s+dia\s+(?:é|estamos|s[aã]o|de\s+hoje)|hoje\s+[ée]\s+que\s+dia|dia\s+da\s+semana|dia\s+de\s+hoje|que\s+m[eê]s|qual\s+(?:o\s+)?(?:dia|m[eê]s|ano))\b/i.test(String(text || ""));

const buildTemporalAnswer = () => {
  const now = getSaoPauloNow();
  return `Hoje é ${now.br}.`;
};

const parseImagePayload = (data = {}) => {
  const item = data?.data?.[0] || {};
  const b64 = item.b64_json || data.image_base64 || data.b64_json;
  const url = item.url || data.image_url || data.url;
  if (b64) return { image_base64: String(b64).replace(/^data:image\/[^;]+;base64,/, ""), mime_type: data.mime_type || "image/png" };
  if (url) return { image_url: url, mime_type: data.mime_type || "image/png" };
  return null;
};

const callEmergentImage = async ({ prompt, style = "", reference_image_base64 = null, key = "" }) => {
  const apiKey = key || state.settings.llm_image_key || EMERGENT_API_KEY;
  if (!apiKey) throw new Error("EMERGENT_API_KEY não configurada");
  const finalPrompt = [
    "Crie um criativo jurídico profissional para a Dra. Kênia Garcia, sem texto e sem letras dentro da imagem.",
    style ? `Formato/estilo: ${style}.` : "",
    `Tema: ${prompt}`,
  ].filter(Boolean).join("\n");
  const body = {
    model: EMERGENT_IMAGE_MODEL,
    prompt: finalPrompt,
    size: "1024x1024",
    n: 1,
    ...(reference_image_base64 ? { image: reference_image_base64 } : {}),
  };
  const r = await fetch(`${EMERGENT_BASE_URL}/images/generations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  const raw = await r.text();
  if (!r.ok) throw new Error(`emergent_image_${r.status}: ${raw.slice(0, 500)}`);
  const parsed = parseImagePayload(JSON.parse(raw || "{}"));
  if (!parsed) throw new Error("emergent_image_empty_response");
  return parsed;
};

const callLovableImage = async ({ prompt, style = "" }) => {
  const finalPrompt = [
    "Crie um criativo jurídico profissional para a Dra. Kênia Garcia, sem texto e sem letras dentro da imagem.",
    style ? `Formato/estilo: ${style}.` : "",
    `Tema: ${prompt}`,
  ].filter(Boolean).join("\n");
  if (!LOVABLE_API_KEY) {
    throw new Error("lovable_image_not_configured: defina LOVABLE_API_KEY no backend Render para gerar imagens pela Lovable AI");
  }
  const r = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
    body: JSON.stringify({ model: "openai/gpt-image-2", prompt: finalPrompt, quality: "low", size: "1024x1024", n: 1, stream: false }),
  });
  const raw = await r.text();
  if (!r.ok) throw new Error(`lovable_image_${r.status}: ${raw.slice(0, 500)}`);
  const parsed = parseImagePayload(JSON.parse(raw || "{}"));
  if (!parsed) throw new Error("lovable_image_empty_response");
  return parsed;
};

const callEmergentChat = async ({ messages, key = "" }) => {
  const apiKey = key || state.settings.llm_text_key || EMERGENT_API_KEY;
  if (!apiKey) throw new Error("EMERGENT_API_KEY não configurada");
  const r = await fetch(`${EMERGENT_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: EMERGENT_TEXT_MODEL, messages }),
  });
  const raw = await r.text();
  if (!r.ok) throw new Error(`emergent_chat_${r.status}: ${raw.slice(0, 500)}`);
  const data = JSON.parse(raw || "{}");
  const text = String(data?.choices?.[0]?.message?.content || "").trim();
  if (!text) throw new Error("emergent_chat_empty_response");
  return text;
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
  if (userAskedTemporalInfo(text)) {
    const temporalReply = buildTemporalAnswer();
    rememberMessage(jid, "assistant", temporalReply);
    return temporalReply;
  }
  const schedulingContext = await buildSchedulingContext();
  const messages = [
    {
      role: "system",
      content: `${state.config.bot_prompt || DEFAULT_BOT_PROMPT}\n\n${buildTemporalSystemContext()}\n\n${schedulingContext}`,
    },
    ...history,
  ];

  // 1) Tenta Ollama direto primeiro (provedor preferido para WhatsApp)
  const directReply = await generateDirectOllamaReply(messages).catch((e) => {
    state.lastAiError = `ollama_direct: ${e.message}`;
    console.warn("[whatsapp-ai] ollama direto falhou:", e.message);
    return null;
  });
  if (directReply) {
    const safeReply = sanitizeOutbound(directReply);
    rememberMessage(jid, "assistant", safeReply);
    state.lastAiError = null;
    return safeReply;
  }

  // 2) Fallback Emergent
  const emergentReply = await callEmergentChat({ messages }).catch((e) => {
    state.lastAiError = `emergent: ${e.message}`;
    console.warn("[whatsapp-ai] emergent falhou:", e.message);
    return null;
  });
  if (emergentReply) {
    const safeReply = sanitizeOutbound(emergentReply);
    rememberMessage(jid, "assistant", safeReply);
    state.lastAiError = null;
    return safeReply;
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
    const reply = sanitizeOutbound(String(data.text || data.response || "").trim());
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
  if (!state.config.bot_enabled || msg.key?.fromMe || !jid || !id || !msg.message || !isReplyableJid(jid)) return;
  if (processedMessages.has(id)) return;
  processedMessages.add(id);
  if (processedMessages.size > 500) processedMessages.clear();

  const text = extractTextMessage(msg.message);
  if (!text) return;

  try {
    await state.sock?.sendPresenceUpdate?.("composing", jid);
    const rawReply = await generateAiReply(jid, text);
    const agendamento = parseAgendamentoBlock(rawReply);
    let reply = stripAgendamentoBlock(rawReply);
    if (agendamento) {
      const created = await createSupabaseAppointment(jid, agendamento);
      if (created) {
        const link = created.meeting_link;
        if (!/agendad|confirmad|marcad/i.test(reply)) {
          reply = `${reply}\n\n✅ Sua consulta foi registrada no painel da Dra. Kênia.`.trim();
        }
        if (link && !reply.includes(link)) {
          reply = `${reply}\n\n🔗 Link da videochamada (Google Meet): ${link}`.trim();
        }
      } else {
        reply = `${reply}\n\nAnotei seus dados; a Dra. Kênia confirmará o horário em breve.`.trim();
      }
    }
    if (!reply) reply = "Pode me confirmar essa informação, por favor?";
    await state.sock?.sendMessage(jid, { text: reply }, { quoted: msg });
    state.lastAutoReplyAt = Date.now();
    state.autoReplyCount += 1;
  } catch (e) {
    state.lastAiError = e.message;
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
  // Restaurar credenciais persistidas (Supabase) ANTES de iniciar o socket
  // só faz sentido na primeira inicialização (quando o diretório está vazio).
  // Aqui já carregamos via useMultiFileAuthState; se vazio, restauramos e relemos.
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

  sock.ev.on("creds.update", async () => {
    await saveCreds();
    queueSync(AUTH_DIR);
  });
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

app.get("/api/settings", auth, (_req, res) => {
  res.json({
    using_default_text: !state.settings.llm_text_key,
    using_default_image: !state.settings.llm_image_key,
    llm_text_key_masked: maskKey(state.settings.llm_text_key || EMERGENT_API_KEY),
    llm_image_key_masked: maskKey(state.settings.llm_image_key || EMERGENT_API_KEY),
    emergent_configured: !!(state.settings.llm_text_key || state.settings.llm_image_key || EMERGENT_API_KEY),
    emergent_base_url: EMERGENT_BASE_URL,
  });
});

app.put("/api/settings", auth, (req, res) => {
  const body = req.body || {};
  if ("llm_text_key" in body) state.settings.llm_text_key = String(body.llm_text_key || "").trim();
  if ("llm_image_key" in body) state.settings.llm_image_key = String(body.llm_image_key || "").trim();
  res.json({ ok: true });
});

app.post("/api/settings/test-text", auth, async (_req, res) => {
  try {
    const text = await callEmergentChat({ messages: [{ role: "user", content: "Responda apenas: ok" }] });
    res.json({ ok: true, provider: "emergent", model: EMERGENT_TEXT_MODEL, using_custom_key: !!state.settings.llm_text_key, sample: text.slice(0, 80) });
  } catch (e) {
    res.status(500).json({ ok: false, provider: "emergent", model: EMERGENT_TEXT_MODEL, error: e.message });
  }
});

app.post("/api/settings/test-image", auth, async (_req, res) => {
  try {
    const img = await callLovableImage({ prompt: "ícone jurídico abstrato elegante", style: "teste técnico simples" });
    res.json({ ok: true, provider: "lovable", model: "openai/gpt-image-2", has_image: !!(img.image_base64 || img.image_url) });
  } catch (e) {
    try {
      const fallback = await callEmergentImage({ prompt: "ícone jurídico abstrato elegante", style: "teste técnico simples" });
      res.json({ ok: true, provider: "emergent", model: EMERGENT_IMAGE_MODEL, using_custom_key: !!state.settings.llm_image_key, has_image: !!(fallback.image_base64 || fallback.image_url), warning: e.message });
    } catch (fallbackError) {
      res.status(500).json({ ok: false, provider: "lovable", model: "openai/gpt-image-2", error: `${e.message} | fallback_emergent: ${fallbackError.message}` });
    }
  }
});

app.post("/api/generate-image", auth, async (req, res) => {
  try {
    const result = await callLovableImage(req.body || {});
    res.json({ ok: true, provider: "lovable", model: "openai/gpt-image-2", ...result });
  } catch (e) {
    try {
      const result = await callEmergentImage(req.body || {});
      res.json({ ok: true, provider: "emergent", model: EMERGENT_IMAGE_MODEL, warning: e.message, ...result });
    } catch (fallbackError) {
      res.status(500).json({ ok: false, provider: "lovable", model: "openai/gpt-image-2", error: `${e.message} | fallback_emergent: ${fallbackError.message}` });
    }
  }
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

app.post("/api/whatsapp/send-direct", auth, async (req, res) => {
  try {
    const jid = normalizeWhatsAppJid(req.body?.phone || req.body?.jid || req.body?.to);
    const text = String(req.body?.text || req.body?.message || "").trim();
    if (!jid || !text) return res.status(400).json({ delivered: false, error: "Informe telefone e mensagem." });
    if (!state.connected || !state.sock) return res.status(503).json({ delivered: false, error: "WhatsApp não conectado. Escaneie o QR Code primeiro." });
    const providerResult = await state.sock.sendMessage(jid, { text });
    res.json({ ok: true, delivered: true, provider: "baileys", jid, provider_result: providerResult });
  } catch (e) {
    res.status(500).json({ delivered: false, error: e.message });
  }
});

app.post("/api/whatsapp/test-ollama-reply", auth, async (req, res) => {
  try {
    const prompt = String(req.body?.text || req.body?.prompt || "Olá, preciso de atendimento jurídico.").trim();
    const messages = [
      { role: "system", content: `${state.config.bot_prompt || DEFAULT_BOT_PROMPT}\n\n${buildTemporalSystemContext()}` },
      { role: "user", content: prompt },
    ];
    const reply = sanitizeOutbound(await generateDirectOllamaReply(messages));
    let delivery = null;
    const jid = normalizeWhatsAppJid(req.body?.phone || req.body?.jid || req.body?.to);
    if (jid) {
      if (!state.connected || !state.sock) return res.status(503).json({ ok: false, provider: "ollama", reply, delivered: false, error: "Ollama respondeu, mas o WhatsApp não está conectado." });
      delivery = await state.sock.sendMessage(jid, { text: reply });
      state.lastAutoReplyAt = Date.now();
      state.autoReplyCount += 1;
    }
    state.lastAiError = null;
    res.json({ ok: true, provider: "ollama", model: OLLAMA_MODEL, reply, delivered: !!jid, jid: jid || null, provider_result: delivery });
  } catch (e) {
    state.lastAiError = `ollama_test: ${e.message}`;
    res.status(500).json({ ok: false, provider: "ollama", model: OLLAMA_MODEL, error: e.message });
  }
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
  console.log(`[persistAuth] enabled=${persistEnabled}`);
  (async () => {
    try { await restoreAuthDir(AUTH_DIR); } catch (e) { console.warn("restore failed", e.message); }
    startSock().catch((e) => console.error("startSock failed", e));
  })();
});