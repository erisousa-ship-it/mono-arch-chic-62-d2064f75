import { useEffect, useRef, useState } from "react";
import { api, enforceSecretarySecondPerson } from "@/kenia/lib/api";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Input } from "@/kenia/components/ui/input";
import { Badge } from "@/kenia/components/ui/badge";
import { ScrollArea } from "@/kenia/components/ui/scroll-area";
import { Separator } from "@/kenia/components/ui/separator";
import { Progress } from "@/kenia/components/ui/progress";
import { toast } from "sonner";
import {
  Send, Volume2, VolumeX, Sparkles, Bot, Gauge, ShieldCheck,
  AlertTriangle, BookOpen, Loader2, RefreshCcw, Pause, Play,
  CalendarPlus, CalendarCheck, X, Mic, MicOff, Paperclip, FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SCHEDULE_REGEX = /\b(agendar|agendamento|marcar|marca[cç][aã]o|hor[aá]rio|consulta|reuni[aã]o|atendimento|appointment|schedule)\b/i;
const WAIT_FOLLOW_UP_MS = 65000;
const ASSISTANT_GREETING = "Tudo bem? Sou a assistente virtual da Dra. Kênia Garcia. Como posso ajudar você hoje?";
const ASSISTANT_SPEAKER = "Assistente virtual";

// Gera link de videoconferência (Jitsi — funciona como Google Meet, sem necessidade de login)
// Pode ser substituído por integração oficial com Google Calendar API no futuro.
const getMeetLink = () => {
  const room = `KeniaGarcia-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `https://meet.jit.si/${room}`;
};

// Monta link wa.me para enviar o agendamento ao cliente via WhatsApp
const buildWhatsAppShare = (phone, text) => {
  const digits = String(phone || "").replace(/\D/g, "");
  const base = digits ? `https://wa.me/${digits}` : `https://wa.me/`;
  return `${base}?text=${encodeURIComponent(text)}`;
};


const renderMessageContent = (text) => {
  const parts = String(text).split(/(https?:\/\/[^\s)]+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noreferrer"
        className="underline text-gold-700 hover:text-gold-900 break-all"
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
};

const cleanRepeatedText = (text) => {
  const noRepeatedWords = String(text || "")
    .replace(/<?\/?\s*HANDOFF[_\s-]*K[EÊ]NIA\s*\/?>?/giu, "")
    .replace(/`{1,3}\s*HANDOFF[_\s-]*K[EÊ]NIA\s*`{1,3}/giu, "")
    .replace(/<AGENDAMENTO>[\s\S]*?<\/AGENDAMENTO>/gi, "")
    .replace(/\b((?:[\p{L}\p{N}]{2,}\s+){1,3}[\p{L}\p{N}]{2,})(?:[\s,.;:!?-]+\1\b)+/giu, "$1")
    .replace(/\b([\p{L}\p{N}]{2,})(?:[\s,.;:!?-]+\1\b)+/giu, "$1")
    .replace(/([^.!?\n]{8,}[.!?])(?:\s+\1)+/giu, "$1")
    .replace(/[ \t]{2,}/g, " ");
  const lines = noRepeatedWords.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const uniqueLines = [];
  for (const line of lines) {
    const normalized = line.toLowerCase().replace(/[^\p{L}\p{N}]+/giu, " ").trim();
    const previous = uniqueLines.at(-1)?.toLowerCase().replace(/[^\p{L}\p{N}]+/giu, " ").trim();
    if (normalized && normalized !== previous) uniqueLines.push(line);
  }
  return enforceSecretarySecondPerson(uniqueLines.join("\n").trim());
};

const shouldScheduleWaitFollowUp = (text) =>
  /\b(vou\s+verificar|vou\s+confirmar|te\s+retorno|retorno\s+em|aguard|um\s+momento|minutinho|minuto)\b/i.test(String(text || ""));

const buildWaitFollowUpText = (name) => {
  const firstName = String(name || "").trim().split(/\s+/)[0] || "cliente";
  return `${firstName}, ainda estou verificando por aqui e já te retorno. Obrigada por aguardar. 🙏`;
};

const pad2 = (n) => String(n).padStart(2, "0");
const formatLocalDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const getAppointmentDateTime = (date, time) => {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString();
};

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const nextBusinessSlot = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return { date: formatLocalDate(d), time: "10:00" };
};

// Extrai bloco <AGENDAMENTO>{...}</AGENDAMENTO> emitido pela IA
const parseAgendamentoBlock = (text) => {
  const m = String(text || "").match(/<AGENDAMENTO>\s*([\s\S]*?)\s*<\/AGENDAMENTO>/i);
  if (!m) return null;
  try {
    const obj = JSON.parse(m[1]);
    if (!obj?.data_agendamento || !obj?.horario_agendamento) return null;
    return obj;
  } catch {
    return null;
  }
};

const extractScheduleIntent = (text) => {
  const lower = text.toLowerCase();
  if (!SCHEDULE_REGEX.test(lower)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let date = null;
  const dateMatch = lower.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
  const hasRelativeDate = /\b(hoje|amanh[ãa]|depois de amanh[ãa])\b/i.test(lower);
  const timeMatch = lower.match(/\b(\d{1,2})(?::|h)(\d{2})?\b/i);

  if (!dateMatch && !hasRelativeDate) return null;
  if (!timeMatch) return null;

  if (/\bhoje\b/i.test(lower)) {
    date = formatLocalDate(today);
  } else if (/amanh[ãa]/i.test(lower)) {
    const t = new Date(today);
    t.setDate(t.getDate() + 1);
    date = formatLocalDate(t);
  } else if (/\bdepois de amanh[ãa]\b/i.test(lower)) {
    const t = new Date(today);
    t.setDate(t.getDate() + 2);
    date = formatLocalDate(t);
  } else if (dateMatch) {
    const day = pad2(dateMatch[1]);
    const month = pad2(dateMatch[2]);
    const rawYear = dateMatch[3] || String(today.getFullYear());
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    date = `${year}-${month}-${day}`;
  } else {
    const t = new Date(today);
    t.setDate(t.getDate() + 1);
    if (t.getDay() === 0) t.setDate(t.getDate() + 1);
    if (t.getDay() === 6) t.setDate(t.getDate() + 2);
    date = formatLocalDate(t);
  }

  const time = timeMatch
    ? `${pad2(timeMatch[1])}:${pad2(timeMatch[2] || "00")}`
    : "10:00";

  return { date, time, duration: 60 };
};

function NativeAudioPlayer({ audioB64, index }) {
  const [blobUrl, setBlobUrl] = useState(null);
  useEffect(() => {
    if (!audioB64) return;
    let url = null;
    try {
      const bin = atob(audioB64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: "audio/mpeg" });
      url = URL.createObjectURL(blob);
      setBlobUrl(url);
    } catch {
      setBlobUrl(null);
    }
    return () => {
      if (url) {
        try { URL.revokeObjectURL(url); } catch {}
      }
    };
  }, [audioB64]);
  if (!blobUrl) return null;
  return (
    <audio
      controls
      preload="metadata"
      src={blobUrl}
      className="w-full max-w-sm h-9"
      data-testid={`audio-player-${index}`}
    >
      Seu navegador não suporta áudio HTML5.
    </audio>
  );
}

const QUAL_META = {
  qualificado: {
    label: "Qualificado",
    cls: "bg-gold-600 text-white",
    icon: ShieldCheck,
    desc: "Caso com fundamento e chances reais — vale priorizar atendimento.",
  },
  nao_qualificado: {
    label: "Não qualificado",
    cls: "bg-rose-600 text-white",
    icon: AlertTriangle,
    desc: "Caso sem fundamento jurídico suficiente ou fora do escopo.",
  },
  necessita_mais_info: {
    label: "Necessita mais info",
    cls: "bg-nude-700 text-white",
    icon: Gauge,
    desc: "Faltam dados críticos — siga perguntando ao cliente.",
  },
};

const STORAGE_KEY = "kenia.chatia.session.v1";

const normalizeMessageForDedupe = (value) =>
  cleanRepeatedText(value)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const dedupeChatMessages = (list = []) => {
  const output = [];
  const assistantSinceLastUser = new Set();
  for (const item of Array.isArray(list) ? list : []) {
    const role = item?.role === "user" ? "user" : "assistant";
    const content = role === "assistant" ? cleanRepeatedText(item?.content) : String(item?.content || "").trim();
    const normalized = normalizeMessageForDedupe(content);
    const typing = Boolean(item?.typing);
    if (!normalized && !typing) continue;

    if (role === "user") assistantSinceLastUser.clear();
    const last = output[output.length - 1];
    const lastNormalized = last ? normalizeMessageForDedupe(last.content) : "";
    if (typing) {
      output.push({ ...item, role, content, typing, _typingId: item?._typingId });
      continue;
    }
    if (last?.role === role && lastNormalized && lastNormalized === normalized) continue;
    if (role === "assistant" && normalized && assistantSinceLastUser.has(normalized)) continue;

    if (role === "assistant" && normalized) assistantSinceLastUser.add(normalized);
    output.push({ ...item, role, content, typing, _typingId: item?._typingId });
  }
  return output;
};

const loadPersistedSession = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    if (!Array.isArray(data.messages) || data.messages.length === 0) return null;
    // Limpa flags transitórias e remove duplicações salvas de versões anteriores.
    data.messages = dedupeChatMessages(data.messages.map((m) => ({ ...m, typing: false, _typingId: undefined })));
    return data;
  } catch {
    return null;
  }
};

export default function ChatIA() {
  const persisted = typeof window !== "undefined" ? loadPersistedSession() : null;

  const [messages, setMessages] = useState(
    persisted?.messages?.length
      ? persisted.messages
      : [
          {
            role: "assistant",
            content: ASSISTANT_GREETING,
            audio_base64: null,
          },
        ]
  );
  const [input, setInput] = useState("");
  const [name, setName] = useState(persisted?.name || "");
  const [phone, setPhone] = useState(persisted?.phone || "");
  const [voice, setVoice] = useState(persisted?.voice || "nova");
  const [autoplay, setAutoplay] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [sessionId, setSessionId] = useState(persisted?.sessionId || null);
  const [analysis, setAnalysis] = useState(persisted?.analysis || null);
  const [legDate, setLegDate] = useState("");
  const [legBrief, setLegBrief] = useState("");
  const [playingIdx, setPlayingIdx] = useState(null);
  const [scheduler, setScheduler] = useState(null);
  const [scheduling, setScheduling] = useState(false);
  const [leadId, setLeadId] = useState(persisted?.leadId || null);
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(true);
  const [activeSpeaker, setActiveSpeaker] = useState(persisted?.activeSpeaker || ASSISTANT_SPEAKER);
  const audioRef = useRef(null);
  const scrollRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const typingTimerRef = useRef(null);
  const waitFollowUpTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const messagesRef = useRef(messages);
  const assistantTypingTextRef = useRef(new Set());

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Persiste a conversa para sobreviver a desconexões/refresh
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const payload = {
        messages: dedupeChatMessages(messages).map(({ _typingId, ...message }) => message),
        sessionId,
        name,
        phone,
        voice,
        analysis,
        leadId,
        activeSpeaker,
        savedAt: Date.now(),
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {}
  }, [messages, sessionId, name, phone, voice, analysis, leadId, activeSpeaker]);

  const sanitizeFolder = (s) =>
    String(s || "anonimo").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "anonimo";

  const handleDocUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 20MB)");
      return;
    }
    setUploadingDoc(true);
    try {
      const folder = sanitizeFolder(name || phone || sessionId);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
      const path = `${folder}/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage.from("client-docs").upload(path, file, {
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });
      if (error) throw error;
      const { data: signed } = await supabase.storage
        .from("client-docs")
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      const url = signed?.signedUrl || "";
      setMessages((prev) => [
        ...prev,
        { role: "user", content: `📎 Documento enviado: ${file.name}${url ? `\n${url}` : ""}` },
      ]);
      toast.success("Documento salvo na pasta do cliente");
      send(`Acabei de anexar o documento "${file.name}" pelo chat.`);
    } catch (err) {
      console.error("Erro upload doc:", err);
      toast.error("Não consegui salvar o documento. Tente novamente.");
    } finally {
      setUploadingDoc(false);
    }
  };


  // Simula digitação humana: insere a mensagem do assistente caractere por caractere,
  // com pequenas pausas naturais em pontuação. Resolve quando termina.
  const typeAssistantMessage = (fullText, audioB64 = null, speaker = null) =>
    new Promise((resolve) => {
      const text = cleanRepeatedText(fullText);
      if (!text) { resolve(); return; }
      const normalizedText = normalizeMessageForDedupe(text);
      const existingReply = [...messagesRef.current]
        .reverse()
        .find((m) => m.role === "assistant" && !m.typing && normalizeMessageForDedupe(m.content) === normalizedText);
      if (existingReply) { resolve(); return; }
      if (assistantTypingTextRef.current.has(normalizedText)) { resolve(); return; }
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
        assistantTypingTextRef.current.clear();
      }
      assistantTypingTextRef.current.add(normalizedText);
      const isKenia = speaker && /k[eê]nia/i.test(speaker);
      const baseDelay = isKenia ? 38 : 22;
      let idx = 0;
      const typingId = `typing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      setMessages((prev) => {
        // Reaproveita um placeholder de digitação pendente, se existir
        const lastIdx = prev.length - 1;
        if (lastIdx >= 0 && prev[lastIdx].role === "assistant" && prev[lastIdx].typing) {
          const copy = [...prev];
          copy[lastIdx] = { ...copy[lastIdx], _typingId: typingId, content: "", speaker };
          return dedupeChatMessages(copy);
        }
        return dedupeChatMessages([...prev, { role: "assistant", content: "", audio_base64: null, typing: true, speaker, _typingId: typingId }]);
      });

      const updateTyping = (updater) => {
        setMessages((prev) => {
          const i = prev.findIndex((m) => m._typingId === typingId);
          if (i < 0) return prev;
          const copy = [...prev];
          copy[i] = updater(copy[i]);
          return dedupeChatMessages(copy);
        });
      };

      const step = () => {
        idx += 1;
        const partial = text.slice(0, idx);
        updateTyping((m) => ({ ...m, content: partial }));

        if (idx >= text.length) {
          updateTyping((m) => ({ ...m, content: text, audio_base64: audioB64, typing: false, speaker, _typingId: undefined }));
          assistantTypingTextRef.current.delete(normalizedText);
          typingTimerRef.current = null;
          resolve();
          return;
        }

        const ch = text[idx - 1];
        let delay = baseDelay + Math.random() * (isKenia ? 60 : 30);
        if (/[\.!\?]/.test(ch)) delay += isKenia ? 650 : 350;
        else if (/[,;:]/.test(ch)) delay += isKenia ? 280 : 160;
        else if (ch === "\n") delay += isKenia ? 450 : 250;
        typingTimerRef.current = setTimeout(step, delay);
      };

      typingTimerRef.current = setTimeout(step, isKenia ? 900 : 400);
    });

  useEffect(() => () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (waitFollowUpTimerRef.current) clearTimeout(waitFollowUpTimerRef.current);
  }, []);


  const startRecording = async () => {
    try {
      console.log("🎙️ [startRecording] Iniciando gravação...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      console.log("✅ [startRecording] Stream obtido:", {
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length,
      });

      const mimeOptions = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/wav",
        "audio/mp4",
      ];

      let selectedMime = "audio/webm";
      for (const mime of mimeOptions) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          console.log("🎵 [startRecording] MIME type suportado:", mime);
          break;
        }
      }

      console.log("🎵 [startRecording] MIME type selecionado:", selectedMime);

      const mr = new MediaRecorder(stream, { mimeType: selectedMime });
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) {
          console.log("📦 [ondataavailable] Chunk gravado:", {
            size: e.data.size,
            type: e.data.type,
            totalChunks: chunksRef.current.length + 1,
          });
          chunksRef.current.push(e.data);
        }
      };

      mr.onstop = async () => {
        console.log("⏹️ [onstop] Gravação parada, processando...");
        stream.getTracks().forEach((t) => {
          t.stop();
          console.log("🔌 [onstop] Track parado:", t.kind);
        });
        const blob = new Blob(chunksRef.current, { type: selectedMime });
        console.log("📁 [onstop] Blob criado:", {
          size: blob.size,
          type: blob.type,
          chunks: chunksRef.current.length,
        });
        await transcribeAndSend(blob, selectedMime);
      };

      mr.onerror = (e) => {
        console.error("❌ [onerror] Erro do MediaRecorder:", e.error);
        toast.error(`Erro na gravação: ${e.error}`);
        setRecording(false);
      };

      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      toast.success("🎙️ Gravação iniciada - fale agora!");
      console.log("✅ [startRecording] MediaRecorder iniciado");
    } catch (err) {
      console.error("❌ [startRecording] Erro ao acessar microfone:", err);
      toast.error(`Erro ao acessar microfone: ${err.message}`);
      setRecording(false);
    }
  };

  const stopRecording = () => {
    console.log("⏹️ [stopRecording] Comando para parar gravação");
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.stop();
      console.log("✅ [stopRecording] Stop enviado ao MediaRecorder");
    }
    setRecording(false);
  };

  const transcribeAndSend = async (blob, mime) => {
    setTranscribing(true);
    const toastId = toast.loading("🔄 Transcrevendo áudio...");

    try {
      console.log("📝 [transcribeAndSend] Iniciando transcrição", {
        blobSize: blob.size,
        mime,
        timestamp: new Date().toISOString(),
      });

      if (blob.size === 0) {
        throw new Error("Blob vazio - nenhum áudio foi gravado");
      }

      const buf = await blob.arrayBuffer();
      console.log("📊 [transcribeAndSend] Buffer criado:", {
        byteLength: buf.byteLength,
      });

      let binary = "";
      const bytes = new Uint8Array(buf);
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
      }
      const audio_base64 = btoa(binary);
      console.log("🔐 [transcribeAndSend] Base64 criado:", {
        base64Length: audio_base64.length,
        originalLength: buf.byteLength,
        compressionRatio: (audio_base64.length / buf.byteLength).toFixed(2),
      });

      console.log("📤 [transcribeAndSend] Enviando para edge function transcribe-audio...");
      const { data, error } = await supabase.functions.invoke("transcribe-audio", {
        body: { audio_base64, mime_type: mime },
      });

      console.log("📬 [transcribeAndSend] Resposta recebida", {
        hasError: !!error,
        hasData: !!data,
        errorMessage: error?.message || "N/A",
        dataKeys: data ? Object.keys(data) : [],
      });

      if (error) {
        console.error("❌ [transcribeAndSend] Erro da função:", error);
        const errorMsg = error?.message || JSON.stringify(error);
        toast.error(`Erro na transcrição: ${errorMsg}`, { id: toastId });
        throw error;
      }

      const text = (data?.text || "").trim();
      console.log("📄 [transcribeAndSend] Texto transcrito:", {
        length: text.length,
        preview: text.slice(0, 100),
        isEmpty: text.length === 0,
      });

      if (!text) {
        const msg = "Áudio não foi reconhecido. Tente novamente com áudio mais claro.";
        toast.error(msg, { id: toastId });
        console.warn("⚠️ [transcribeAndSend] Transcrição vazia retornada");
        return;
      }

      toast.success(`✅ Texto: "${text.slice(0, 50)}..."`, { id: toastId });
      await send(text);
    } catch (err) {
      console.error("🔥 [transcribeAndSend] Erro geral:", err);
      const errorMsg = err?.message || "Desconhecido";
      toast.error(`Falha na transcrição: ${errorMsg}`, { id: toastId });
    } finally {
      setTranscribing(false);
    }
  };

  const upsertLead = async (extra = {}) => {
    const clientName = (name || "").trim();
    const clientPhone = (phone || "").trim();
    if (!clientName && !clientPhone) return;
    try {
      if (leadId) {
        await api.patch(`/leads/${leadId}`, {
          name: clientName || undefined,
          phone: clientPhone || undefined,
          case_type: extra.area || analysis?.area || undefined,
          description: extra.description || analysis?.resumo || undefined,
          urgency: extra.urgency || (analysis?.acertividade > 80 ? "alta" : "media"),
          score: analysis?.acertividade || undefined,
          stage: extra.stage || undefined,
          source: "ChatIA",
        });
      } else {
        const { data } = await api.post("/leads", {
          name: clientName || "Cliente do chat",
          phone: clientPhone || "",
          case_type: extra.area || analysis?.area || "Atendimento jurídico",
          description: extra.description || analysis?.resumo || "Lead gerado pelo atendente virtual.",
          urgency: extra.urgency || "media",
          score: analysis?.acertividade || 60,
          stage: extra.stage || "novos_leads",
          source: "ChatIA",
          tags: ["chatia"],
        });
        if (data?.id) setLeadId(data.id);
      }
    } catch (err) {
      console.error("Erro ao salvar lead:", err);
    }
  };

  const openScheduler = (area) => {
    const slot = nextBusinessSlot();
    setScheduler({ date: slot.date, time: slot.time, duration: 60, area: area || analysis?.area || "" });
    // No mobile, garante que o painel do chat (onde o scheduler é renderizado) fique visível
    setShowAnalysisPanel(false);
  };

  const createAppointment = async ({ date, time, duration = 60, area = "" }) => {
    const starts_at = getAppointmentDateTime(date, time);
    const clientName = name?.trim() || "Cliente do chat";
    const meetUrl = getMeetLink();
    const title = `Consulta — ${area || analysis?.area || "Atendimento jurídico"} · ${clientName}`;
    await api.post("/appointments", {
      title,
      client_name: clientName,
      starts_at,
      duration_min: Number(duration) || 60,
      location: "Google Meet",
      meet_url: meetUrl,
      meeting_link: meetUrl,
      notes: [phone ? `WhatsApp: ${phone}` : "", `Meet: ${meetUrl}`].filter(Boolean).join(" · "),
      status: "confirmado",
    });
    const human = new Date(starts_at).toLocaleString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
    return { human, meetUrl, duration: Number(duration) || 60 };
  };

  const buildAppointmentMessage = ({ human, meetUrl, duration }) => {
    const clientFirst = (name || "").trim().split(/\s+/)[0];
    const greeting = clientFirst ? `${clientFirst}, sua` : "Sua";
    const shareLink = buildWhatsAppShare(
      phone,
      `Olá! Sua consulta com a Dra. Kênia Garcia está confirmada para ${human} (${duration} min).\nLink da videochamada: ${meetUrl}`
    );
    return (
      `✅ ${greeting} consulta está agendada para ${human} (${duration} min) por videoconferência.\n\n` +
      `🔗 Link da sala: ${meetUrl}\n\n` +
      `📲 Enviar o link para o cliente no WhatsApp:\n${shareLink}\n\n` +
      `O agendamento já aparece no painel da Agenda${phone ? " e o link acima abre o WhatsApp do cliente pronto pra enviar." : "."}`
    );
  };

  const confirmSchedule = async () => {
    if (!scheduler?.date || !scheduler?.time) {
      toast.error("Escolha data e horário");
      return;
    }
    setScheduling(true);
    try {
      const result = await createAppointment(scheduler);
      toast.success("Agendamento confirmado");
      upsertLead({ stage: "em_negociacao", urgency: "alta" });
      setScheduler(null);
      await typeAssistantMessage(buildAppointmentMessage(result));
    } catch (err) {
      console.error("Erro ao criar agendamento:", err);
      toast.error("Não consegui agendar. Tente novamente.");
    } finally {
      setScheduling(false);
    }
  };


  useEffect(() => {
    api
      .get("/legislation/today")
      .then((r) => {
        setLegDate(r.data.date_human);
        setLegBrief(r.data.brief);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  const playAudio = (b64, idx) => {
    if (!b64) return;
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        if (audioRef.current.__blobUrl) URL.revokeObjectURL(audioRef.current.__blobUrl);
      } catch {}
    }
    let blobUrl = null;
    try {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: "audio/mpeg" });
      blobUrl = URL.createObjectURL(blob);
    } catch (e) {
      toast.error("Áudio inválido (base64): " + e.message);
      return;
    }
    const a = new Audio(blobUrl);
    a.__blobUrl = blobUrl;
    a.volume = 1.0;
    audioRef.current = a;
    setPlayingIdx(idx);
    a.onended = () => {
      setPlayingIdx(null);
      try {
        URL.revokeObjectURL(blobUrl);
      } catch {}
    };
    a.onerror = () => {
      setPlayingIdx(null);
      toast.error("Não consegui tocar o áudio. Verifique o volume do navegador/sistema.");
    };
    a.play().catch((err) => {
      setPlayingIdx(null);
      const isAutoplayBlock = err?.name === "NotAllowedError";
      if (isAutoplayBlock) {
        toast.info("Clique em \"Ouvir resposta\" para escutar — o navegador bloqueou o autoplay.", {
          duration: 4500,
        });
      } else {
        toast.error(`Erro ao tocar áudio: ${err?.message || "desconhecido"}`);
      }
    });
  };

  const stopAudio = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {}
    }
    setPlayingIdx(null);
  };

  const sendingRef = useRef(false);
  const activeRequestIdRef = useRef(0);
  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg) return;
    if (sendingRef.current || thinking) return;
    sendingRef.current = true;
    const requestId = ++activeRequestIdRef.current;
    if (waitFollowUpTimerRef.current) {
      clearTimeout(waitFollowUpTimerRef.current);
      waitFollowUpTimerRef.current = null;
    }
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === "user" && normalizeMessageForDedupe(last.content) === normalizeMessageForDedupe(msg)) return dedupeChatMessages(prev);
      return dedupeChatMessages([...prev, { role: "user", content: msg }]);
    });
    setInput("");
    setThinking(true);
    const scheduleIntent = extractScheduleIntent(msg);
    if (scheduleIntent) {
      try {
        const result = await createAppointment({
          ...scheduleIntent,
          area: analysis?.area || "Atendimento jurídico",
        });
        toast.success("Agendamento criado no painel da Agenda");
        upsertLead({ stage: "em_negociacao", urgency: "alta" });
        setScheduler(null);
        setThinking(false);
        await typeAssistantMessage(buildAppointmentMessage(result));
      } catch (err) {
        console.error("Erro ao agendar automaticamente:", err);
        setThinking(false);
        await typeAssistantMessage(
          "Não consegui salvar automaticamente agora. Abra o botão Agendar consulta e confirme o horário manualmente."
        );
        openScheduler(analysis?.area || "Atendimento jurídico");
        toast.error("Não consegui criar o agendamento automaticamente");
      }
      sendingRef.current = false;
      return;
    }
    try {
      let { data } = await api.post(
        "/chat/message",
        {
          message: msg,
          history: dedupeChatMessages(messagesRef.current).map((m) => ({ role: m.role, content: m.content })),
          session_id: sessionId,
          visitor_name: name || null,
          visitor_phone: phone || null,
          voice,
          want_audio: autoplay,
          return_analysis: true,
        },
        { timeout: 90000 }
      );
      if (activeRequestIdRef.current !== requestId) return;
      setSessionId(data.session_id);
      if (data.appointment) {
        toast.success("Consulta salva automaticamente na Agenda");
      }
      // Fallback: parse <AGENDAMENTO> block returned in response text
      const agBlock = parseAgendamentoBlock(data.response);
      if (agBlock && !data.appointment) {
        try {
          const result = await createAppointment({
            date: agBlock.data_agendamento,
            time: agBlock.horario_agendamento,
            duration: 60,
            area: agBlock.area_juridica || analysis?.area || "Atendimento jurídico",
          });
          toast.success("Consulta salva automaticamente na Agenda");
          upsertLead({ stage: "em_negociacao", urgency: "alta", description: agBlock.resumo_caso });
          // Substitui a resposta da IA pela confirmação rica com link Meet
          data = { ...data, response: buildAppointmentMessage(result) };
        } catch (err) {
          console.error("Erro ao registrar agendamento do bloco <AGENDAMENTO>:", err);
          toast.error("Não consegui salvar o agendamento na Agenda");
        }
      }
      if (data.analysis) setAnalysis(data.analysis);
      upsertLead({ description: msg });
      setThinking(false);
      if (data.handoff) {
        setActiveSpeaker("Dra. Kênia Garcia");
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = "sine"; o.frequency.value = 880;
          g.gain.setValueAtTime(0.0001, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
          o.start(); o.stop(ctx.currentTime + 0.5);
        } catch {}
        toast.success("Dra. Kênia foi notificada e está entrando na conversa", { duration: 4000 });
      }
      const responseText = cleanRepeatedText(data.response);
      const speaker = data.handoff || activeSpeaker === "Dra. Kênia Garcia" ? "Dra. Kênia Garcia" : data.speaker || null;
      await typeAssistantMessage(responseText, data.audio_base64 || null, speaker);
      const wantsKenia = data.handoff || speaker === "Dra. Kênia Garcia";
      if (wantsKenia && shouldScheduleWaitFollowUp(data.response)) {
        if (waitFollowUpTimerRef.current) clearTimeout(waitFollowUpTimerRef.current);
        waitFollowUpTimerRef.current = setTimeout(() => {
          typeAssistantMessage(buildWaitFollowUpText(name), null, speaker || ASSISTANT_SPEAKER);
          waitFollowUpTimerRef.current = null;
        }, WAIT_FOLLOW_UP_MS);
      }
      if (autoplay && data.audio_base64) {
        setTimeout(() => playAudio(data.audio_base64, messages.length + 1), 200);
      }
    } catch (err) {
      console.error("Erro ao conversar com a IA:", err);
      toast.error("Erro ao conversar com a IA. Tente novamente.");
      setThinking(false);
      if (activeRequestIdRef.current === requestId) {
        await typeAssistantMessage("Desculpe, tive uma instabilidade aqui. Pode repetir sua mensagem? 🙏");
      }
    } finally {
      if (activeRequestIdRef.current === requestId) {
        setThinking(false);
        sendingRef.current = false;
      }
    }
  };


  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const reset = () => {
    setMessages([
      {
        role: "assistant",
        content: ASSISTANT_GREETING,
        audio_base64: null,
      },
    ]);
    setSessionId(null);
    setAnalysis(null);
    setLeadId(null);
    setActiveSpeaker(ASSISTANT_SPEAKER);
    try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
    stopAudio();
  };

  const QM = analysis ? QUAL_META[analysis.qualificacao] || QUAL_META.necessita_mais_info : null;
  const visibleMessages = dedupeChatMessages(messages);

  return (
    <div className="min-h-full flex flex-col bg-background" data-testid="chat-ia-page">
      {/* Header */}
      <div className="px-4 sm:px-8 py-4 sm:py-5 bg-card border-b border-nude-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <div className="overline text-gold-600 text-[10px] sm:text-xs">Análise de Caso · IA Humanizada</div>
          <h1 className="font-serif text-xl sm:text-2xl lg:text-3xl text-nude-900 mt-1 tracking-tight leading-tight">
            Kênia Garcia <span className="text-gold-600 italic block sm:inline">— advogada · atende você direto.</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            className="bg-gold-50 text-gold-700 hover:bg-gold-50 border border-gold-200 gap-1.5 px-2.5 py-1 rounded-full font-medium text-[11px] sm:text-xs"
            data-testid="leg-date-badge"
          >
            <BookOpen className="w-3 h-3" /> Legislação · {legDate || "atualizando..."}
          </Badge>
          <Button
            size="sm"
            onClick={() => openScheduler()}
            className="gap-1.5 bg-gold-600 hover:bg-gold-700 text-white text-xs"
            data-testid="open-scheduler-btn"
          >
            <CalendarPlus className="w-3.5 h-3.5" /> <span className="hidden xs:inline sm:inline">Agendar consulta</span><span className="xs:hidden sm:hidden">Agendar</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={reset}
            className="gap-1.5 text-xs"
            data-testid="reset-chat-btn"
          >
            <RefreshCcw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Nova conversa</span><span className="sm:hidden">Nova</span>
          </Button>
        </div>
      </div>

      {/* MOBILE: Tabs */}
      <div className="lg:hidden px-3 sm:px-4 py-2 bg-white border-b border-nude-200 flex gap-2">
        <Button
          variant={!showAnalysisPanel ? "default" : "outline"}
          size="sm"
          onClick={() => setShowAnalysisPanel(false)}
          className="flex-1 text-xs h-9"
          data-testid="chat-tab"
        >
          💬 Chat
        </Button>
        <Button
          variant={showAnalysisPanel ? "default" : "outline"}
          size="sm"
          onClick={() => setShowAnalysisPanel(true)}
          className="flex-1 text-xs h-9"
          data-testid="analysis-tab"
        >
          📊 Análise
        </Button>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-3 sm:gap-4 p-3 sm:p-4 lg:overflow-hidden min-h-0">
        {/* CHAT */}
        <Card
          className={`flex-1 min-h-[60vh] lg:min-h-0 lg:col-span-8 flex-col overflow-hidden border-nude-200 ${showAnalysisPanel ? "hidden lg:flex" : "flex"}`}
          data-testid="chat-panel"
        >
            {/* visitor info */}
            <div className="px-3 sm:px-5 py-3 border-b border-nude-200 bg-nude-50/60 flex items-center gap-2 flex-wrap">
              <Bot className="w-4 h-4 text-gold-600 shrink-0" />
              <span className="text-sm font-medium text-nude-900 shrink-0">Cliente:</span>
              <Input
                placeholder="Nome (opcional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 flex-1 min-w-[120px] sm:flex-none sm:w-44 text-xs"
                data-testid="visitor-name-input"
              />
              <Input
                placeholder="WhatsApp (opcional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-8 flex-1 min-w-[120px] sm:flex-none sm:w-44 text-xs"
                data-testid="visitor-phone-input"
              />
              <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
                <span className="text-sm font-medium text-nude-900 shrink-0">Voz:</span>
                <select
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  className="h-8 px-2 rounded-md border border-nude-200 bg-white text-xs flex-1 sm:flex-none min-w-0"
                  data-testid="voice-select"
                >
                  <option value="nova">Nova (jovem feminina)</option>
                  <option value="shimmer">Shimmer (alegre)</option>
                  <option value="coral">Coral (acolhedora)</option>
                  <option value="fable">Fable (narrativa)</option>
                  <option value="alloy">Alloy (neutra)</option>
                  <option value="onyx">Onyx (grave masculina)</option>
                  <option value="echo">Echo (calma)</option>
                </select>
                <Button
                  size="sm"
                  variant={autoplay ? "default" : "outline"}
                  onClick={() => setAutoplay((v) => !v)}
                  className={`h-8 gap-1.5 shrink-0 ${autoplay ? "bg-gold-600 hover:bg-gold-700 text-white" : ""}`}
                  data-testid="autoplay-toggle"
                >
                  {autoplay ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{autoplay ? "Falar resposta" : "Sem áudio"}</span>
                </Button>
              </div>
            </div>

            {/* messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 bg-gradient-to-b from-nude-50/40 to-background">
              <div className="space-y-4 max-w-3xl mx-auto">
                {visibleMessages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    data-testid={`msg-${i}`}
                  >
                    <div
                      className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-sm ${
                        m.role === "user"
                          ? "bg-nude-900 text-white rounded-br-sm"
                          : "bg-white border border-nude-200 text-nude-900 rounded-bl-sm"
                      }`}
                    >
                      {m.role === "assistant" && (m.speaker || i === 0) && (
                        <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-semibold tracking-widest uppercase text-gold-600">
                          <Sparkles className="w-3 h-3" />
                          {m.speaker ? m.speaker : ASSISTANT_SPEAKER}
                        </div>
                      )}
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">{renderMessageContent(m.content)}</div>
                      {m.role === "assistant" && m.audio_base64 && (
                        <div className="mt-3 space-y-1.5" data-testid={`audio-block-${i}`}>
                          <button
                            onClick={() =>
                              playingIdx === i ? stopAudio() : playAudio(m.audio_base64, i)
                            }
                            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                              playingIdx === i
                                ? "bg-gold-100 text-gold-900 hover:bg-gold-200"
                                : "bg-gold-600 text-white hover:bg-gold-700"
                            }`}
                            data-testid={`play-audio-${i}`}
                          >
                            {playingIdx === i ? (
                              <>
                                <Pause className="w-3 h-3" /> Pausar áudio
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3 h-3" /> Ouvir resposta da Kênia
                              </>
                            )}
                          </button>
                          <NativeAudioPlayer audioB64={m.audio_base64} index={i} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {thinking && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-nude-200 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-2 text-sm text-nude-500">
                      <Loader2 className="w-4 h-4 animate-spin text-gold-600" />
                      Ana está digitando…
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* scheduler */}
            {scheduler && (
              <div className="px-4 py-3 border-t border-gold-200 bg-gold-50" data-testid="scheduler-panel">
                <div className="max-w-3xl mx-auto">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gold-800">
                      <CalendarCheck className="w-4 h-4" /> Vamos agendar sua consulta
                    </div>
                    <button
                      onClick={() => setScheduler(null)}
                      className="text-nude-600 hover:text-nude-900"
                      aria-label="Fechar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-nude-600">Data</label>
                      <Input
                        type="date"
                        value={scheduler.date}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setScheduler({ ...scheduler, date: e.target.value })}
                        className="h-9"
                        data-testid="sched-date"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-nude-600">Horário</label>
                      <Input
                        type="time"
                        value={scheduler.time}
                        onChange={(e) => setScheduler({ ...scheduler, time: e.target.value })}
                        className="h-9"
                        data-testid="sched-time"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-nude-600">Duração</label>
                      <select
                        value={scheduler.duration}
                        onChange={(e) => setScheduler({ ...scheduler, duration: Number(e.target.value) })}
                        className="h-9 w-full rounded-md border border-nude-200 bg-white px-2 text-sm"
                        data-testid="sched-duration"
                      >
                        {[30, 45, 60, 90].map((m) => (
                          <option key={m} value={m}>
                            {m} min
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={confirmSchedule}
                        disabled={scheduling}
                        className="w-full h-9 bg-gold-600 hover:bg-gold-700 text-white gap-1.5"
                        data-testid="sched-confirm"
                      >
                        {scheduling ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CalendarCheck className="w-4 h-4" />
                        )}
                        Confirmar
                      </Button>
                    </div>
                  </div>
                  {!name && (
                    <p className="text-[11px] text-gold-800 mt-2">
                      Se o nome não for preenchido, o compromisso será salvo como Cliente do chat.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* input */}
            <div className="p-4 border-t border-nude-200 bg-white">
              <div className="max-w-3xl mx-auto flex items-end gap-2">
                <Textarea
                  placeholder="Conte com calma o que aconteceu… (Enter envia)"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  disabled={thinking || recording}
                  rows={2}
                  className="resize-none flex-1"
                  data-testid="chat-input"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.heic,.txt,.zip"
                  onChange={handleDocUpload}
                />
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={thinking || uploadingDoc}
                  title="Anexar documento (salvo na sua pasta no painel)"
                  className="h-12 px-3 sm:px-4 shrink-0 bg-nude-200 hover:bg-nude-300 text-nude-800"
                  data-testid="chat-attach-btn"
                >
                  {uploadingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                </Button>
                <Button
                  type="button"
                  onClick={recording ? stopRecording : startRecording}
                  disabled={thinking || transcribing}
                  title={recording ? "Parar gravação" : "Gravar mensagem de áudio"}
                  className={`h-12 px-3 sm:px-4 shrink-0 transition-all ${
                    recording
                      ? "bg-red-600 hover:bg-red-700 animate-pulse shadow-lg shadow-red-600/50"
                      : "bg-nude-200 hover:bg-nude-300 text-nude-800"
                  }`}
                  data-testid="chat-mic-btn"
                >
                  {transcribing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : recording ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  onClick={() => send()}
                  disabled={thinking || transcribing || !input.trim()}
                  className="h-12 px-3 sm:px-5 shrink-0 bg-gold-600 hover:bg-gold-700 text-white"
                  data-testid="chat-send-btn"
                >
                  <Send className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Enviar</span>
                </Button>
              </div>
            </div>
        </Card>

        {/* ANALYSIS SIDE */}
        <Card
          className={`lg:col-span-4 flex-col overflow-hidden border-nude-200 ${showAnalysisPanel ? "flex" : "hidden lg:flex"}`}
          data-testid="analysis-panel"
        >
            <div className="px-5 py-3 border-b border-nude-200 bg-nude-50/60">
              <div className="overline text-gold-600">Análise em tempo real</div>
              <h2 className="font-serif text-xl text-nude-900 mt-0.5">Acertividade do caso</h2>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-5 space-y-5">
                {!analysis ? (
                  <div className="text-sm text-nude-500 text-center py-10">
                    A análise aparecerá aqui assim que a Dra. Kênia ouvir os primeiros detalhes do seu caso.
                  </div>
                ) : (
                  <>
                    {/* Qualification badge */}
                    <div>
                      <div className="text-xs tracking-widest uppercase font-semibold text-nude-500 mb-2">
                        Qualificação
                      </div>
                      <div
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-full ${QM.cls}`}
                        data-testid="qualif-badge"
                      >
                        <QM.icon className="w-4 h-4" /> {QM.label}
                      </div>
                      <p className="text-xs text-nude-600 mt-2 leading-relaxed">{QM.desc}</p>
                    </div>

                    <Separator />

                    {/* acertividade gauge */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs tracking-widest uppercase font-semibold text-nude-500">
                          Índice de acertividade
                        </span>
                        <span className="text-2xl font-serif text-gold-700" data-testid="acertividade-value">
                          {analysis.acertividade}%
                        </span>
                      </div>
                      <Progress value={analysis.acertividade} className="h-2 bg-nude-100" />
                      <p className="text-[11px] text-nude-500 mt-1.5">
                        Quanto mais informações precisas você der, maior fica esse índice.
                      </p>
                    </div>

                    {/* chance exito */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs tracking-widest uppercase font-semibold text-nude-500">
                          Chance real de êxito
                        </span>
                        <span className="text-2xl font-serif text-nude-900" data-testid="chance-exito-value">
                          {analysis.chance_exito}%
                        </span>
                      </div>
                      <Progress value={analysis.chance_exito} className="h-2 bg-nude-100" />
                    </div>

                    <Separator />

                    {/* area */}
                    <div>
                      <div className="text-xs tracking-widest uppercase font-semibold text-nude-500 mb-1.5">
                        Área do direito
                      </div>
                      <Badge className="bg-gold-100 text-gold-800 hover:bg-gold-100" data-testid="area-badge">
                        {analysis.area || "Em análise"}
                      </Badge>
                    </div>

                    {/* resumo */}
                    {analysis.resumo && (
                      <div>
                        <div className="text-xs tracking-widest uppercase font-semibold text-nude-500 mb-1.5">
                          Resumo técnico
                        </div>
                        <p className="text-sm text-nude-700 leading-relaxed bg-nude-50 border border-nude-200 rounded-md p-3">
                          {analysis.resumo}
                        </p>
                      </div>
                    )}

                    {/* motivo */}
                    {analysis.motivo && (
                      <div>
                        <div className="text-xs tracking-widest uppercase font-semibold text-nude-500 mb-1.5">
                          Por quê?
                        </div>
                        <p className="text-sm text-nude-700 leading-relaxed">{analysis.motivo}</p>
                      </div>
                    )}

                    {/* proxima pergunta */}
                    {analysis.proxima_pergunta && (
                      <div className="bg-gold-50 border border-gold-200 rounded-md p-3">
                        <div className="text-xs tracking-widest uppercase font-semibold text-gold-700 mb-1.5 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3" /> Pergunta-chave que vai elevar a acertividade
                        </div>
                        <p className="text-sm text-nude-900 leading-relaxed font-medium" data-testid="next-question">
                          {analysis.proxima_pergunta}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-2 text-gold-700 hover:bg-gold-100 h-7 text-xs"
                          onClick={() => send(analysis.proxima_pergunta)}
                          data-testid="ask-next-question-btn"
                        >
                          Usar essa pergunta →
                        </Button>
                      </div>
                    )}

                    {/* fundamentos */}
                    {analysis.fundamentos && analysis.fundamentos.length > 0 && (
                      <div>
                        <div className="text-xs tracking-widest uppercase font-semibold text-nude-500 mb-2">
                          Fundamentos jurídicos
                        </div>
                        <ul className="space-y-1.5">
                          {analysis.fundamentos.map((f, i) => (
                            <li
                              key={i}
                              className="text-xs text-nude-700 bg-nude-50 border border-nude-200 rounded-md px-2.5 py-1.5"
                            >
                              <span className="font-medium text-gold-700">§</span> {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}

                {/* legislacao do dia */}
                {legBrief && (
                  <>
                    <Separator />
                    <details className="text-xs">
                      <summary className="cursor-pointer text-gold-700 font-medium flex items-center gap-1.5">
                        <BookOpen className="w-3 h-3" /> Atualização legal de {legDate}
                      </summary>
                      <p className="mt-2 text-nude-600 whitespace-pre-wrap leading-relaxed">{legBrief}</p>
                    </details>
                  </>
                )}
              </div>
            </ScrollArea>
        </Card>
      </div>
    </div>
  );
}