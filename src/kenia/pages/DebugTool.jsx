import { useEffect, useRef, useState } from "react";
import { api } from "@/kenia/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { buildDebugInstructionMessage, deliverLovableDebugInstruction } from "@/components/debugInstruction";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Input } from "@/kenia/components/ui/input";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Label } from "@/kenia/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/kenia/components/ui/tabs";
import { Badge } from "@/kenia/components/ui/badge";
import { toast } from "sonner";
import { AlertTriangle, ImagePlus, Wand2, Send, Trash2, X, Download, Paperclip, Activity, CheckCircle2, XCircle, Loader2 } from "lucide-react";

const DEBUG_BUCKET = "debug-uploads";

export default function DebugTool() {
  const [endpoint, setEndpoint] = useState(
    localStorage.getItem("debug_endpoint") || "https://vlnlvfcckjlclzbwjiia.supabase.co/functions/v1/merge-images"
  );
  const [instruction, setInstruction] = useState("");
  const [history, setHistory] = useState([]);
  const [img1, setImg1] = useState(null);
  const [img2, setImg2] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [attachments, setAttachments] = useState([]);
  const [uploadingAttach, setUploadingAttach] = useState(false);
  const attachInputRef = useRef(null);

  const [aiStatus, setAiStatus] = useState(null);
  const [aiTesting, setAiTesting] = useState({});
  const [aiResults, setAiResults] = useState({});
  const [aiLoadingStatus, setAiLoadingStatus] = useState(false);

  const callAiRouter = async (body) => {
    const { data, error } = await supabase.functions.invoke("ai-router", { body });
    if (error) throw error;
    return data;
  };

  const refreshAiStatus = async () => {
    setAiLoadingStatus(true);
    try {
      const data = await callAiRouter({ action: "status" });
      setAiStatus(data);
    } catch (e) {
      setAiStatus({ error: e?.message || String(e) });
    } finally {
      setAiLoadingStatus(false);
    }
  };

  const testAiProvider = async (provider) => {
    setAiTesting((p) => ({ ...p, [provider]: true }));
    try {
      const data = await callAiRouter({ action: "test", provider });
      setAiResults((p) => ({ ...p, [provider]: data }));
      if (data?.ok) toast.success(`${provider} OK`);
      else toast.error(`${provider}: ${data?.error || "falhou"}`);
    } catch (e) {
      const msg = e?.message || String(e);
      setAiResults((p) => ({ ...p, [provider]: { ok: false, error: msg } }));
      toast.error(`${provider}: ${msg}`);
    } finally {
      setAiTesting((p) => ({ ...p, [provider]: false }));
    }
  };

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    try {
      const { data } = await api.get("/debug/instructions");
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.instructions)
            ? data.instructions
            : Array.isArray(data?.history)
              ? data.history
              : [];
      setHistory(list);
    } catch {
      setHistory([]);
    }
  };

  const handleAttachUpload = async (list) => {
    if (!list || list.length === 0) return;
    setUploadingAttach(true);
    const out = [];
    try {
      for (const file of Array.from(list)) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
        const { error } = await supabase.storage.from(DEBUG_BUCKET).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "application/octet-stream",
        });
        if (error) throw error;
        const { data } = supabase.storage.from(DEBUG_BUCKET).getPublicUrl(path);
        out.push({ name: file.name, url: data.publicUrl, type: file.type, size: file.size });
      }
      setAttachments((prev) => [...prev, ...out]);
      toast.success(`${out.length} arquivo(s) anexado(s)`);
    } catch (e) {
      toast.error(`Falha no upload: ${e?.message || e}`);
    } finally {
      setUploadingAttach(false);
      if (attachInputRef.current) attachInputRef.current.value = "";
    }
  };

  const removeAttachment = (i) => setAttachments((p) => p.filter((_, idx) => idx !== i));

  const buildInstructionMessage = (txt) => buildDebugInstructionMessage(txt, attachments);

  const saveInstructionToCloud = async (message) => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    const instructionWithUser = user?.email
      ? `${message}\n\n---\nUSUÁRIO CONECTADO: ${user.email}`
      : message;
    const payload = {
      user_id: user?.id ?? null,
      instruction: instructionWithUser,
      attachments,
      status: "pending",
    };

    const { error } = await supabase.from("debug_instructions").insert(payload);
    if (!error) return;

    if (/schema cache|column/i.test(error.message || "")) {
      const { error: retryError } = await supabase.from("debug_instructions").insert({
        user_id: user?.id ?? null,
        instruction: instructionWithUser,
        attachments,
        status: "pending",
      });
      if (retryError) throw retryError;
      return;
    }

    throw error;
  };

  const sendInstruction = async () => {
    const txt = instruction.trim();
    if (!txt && attachments.length === 0) { toast.error("Digite uma instrução ou anexe um arquivo"); return; }
    const message = buildInstructionMessage(txt);
    const delivery = deliverLovableDebugInstruction(message);

    if (delivery === "skipped") {
      try {
        await saveInstructionToCloud(message);
        toast.success("Instrução salva para análise");
        setInstruction("");
        setAttachments([]);
        loadHistory();
      } catch (e) {
        toast.error(`Falha ao salvar: ${e?.message || e}`);
      }
      return;
    }

    try {
      await api.post("/debug/instruction", { instruction: message });
      toast.success("Instrução disparada");
      setInstruction("");
      setAttachments([]);
      loadHistory();
    } catch {
      toast.success("Instrução disparada (sem histórico)");
      setInstruction("");
      setAttachments([]);
    }
  };

  // Salva a instrução silenciosamente no banco (sem throw / sem blank screen).
  // Útil em produção (Render) onde o overlay "Try to Fix" da Lovable não existe.
  const saveInstructionSilently = async () => {
    const txt = instruction.trim();
    if (!txt && attachments.length === 0) {
      toast.error("Digite uma instrução ou anexe um arquivo");
      return;
    }
    const message = buildInstructionMessage(txt);
    try {
      await saveInstructionToCloud(message);
      toast.success("Atualizações salvas");
      setInstruction("");
      setAttachments([]);
    } catch (e) {
      toast.error(`Falha ao salvar: ${e?.message || e}`);
    }
  };


  const toDataUrl = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });

  const onFile = async (which, file) => {
    if (!file) return;
    const url = await toDataUrl(file);
    if (which === 1) setImg1(url); else setImg2(url);
  };

  const clearAll = () => {
    setImg1(null); setImg2(null); setPrompt(""); setErr(""); setResult(null);
  };

  const runMerge = async () => {
    setErr(""); setResult(null);
    if (!img1 || !img2) { setErr("Envie as duas imagens."); return; }
    setLoading(true);
    try {
      localStorage.setItem("debug_endpoint", endpoint);
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image1: img1, image2: img2, prompt }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data.error) throw new Error(data.error || `HTTP ${r.status}`);
      if (!data.image) throw new Error("Sem imagem retornada");
      setResult(data.image);
    } catch (e) {
      setErr(e.message || "Falha ao gerar");
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result;
    a.download = `merged-${Date.now()}.png`;
    a.click();
  };

  const safeHistory = Array.isArray(history) ? history : [];

  return (
    <div className="h-screen flex flex-col bg-nude-50 overflow-hidden">
      <div className="px-6 py-4 bg-white border-b border-nude-200">
        <div className="text-xs tracking-widest uppercase text-gold-600 font-semibold">Ferramenta Interna</div>
        <h1 className="font-display font-bold text-2xl">Debug Tool</h1>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <Card className="max-w-3xl mx-auto p-6 border-nude-200">
          <Tabs defaultValue="instruction">
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              <TabsTrigger value="instruction" data-testid="dbg-tab-instr">Instrução</TabsTrigger>
              <TabsTrigger value="merge" data-testid="dbg-tab-merge">Mesclar Imagens</TabsTrigger>
              <TabsTrigger value="ai" data-testid="dbg-tab-ai" onClick={() => { if (!aiStatus) refreshAiStatus(); }}>Status IA</TabsTrigger>
            </TabsList>

            <TabsContent value="instruction" className="mt-6">
              <div className="text-sm text-nude-500 mb-3">
                Registra uma instrução técnica (apenas referência interna).
              </div>

              {/* DROPZONE DE IMAGEM — em destaque no topo */}
              <Label className="flex items-center gap-2 text-rose-700">
                <ImagePlus className="w-4 h-4" /> Anexar imagens / arquivos
              </Label>
              <div
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("ring-2", "ring-rose-400", "bg-rose-50"); }}
                onDragLeave={(e) => { e.currentTarget.classList.remove("ring-2", "ring-rose-400", "bg-rose-50"); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("ring-2", "ring-rose-400", "bg-rose-50");
                  const files = Array.from(e.dataTransfer?.files || []);
                  if (files.length) handleAttachUpload(files);
                }}
                onPaste={(e) => {
                  const items = Array.from(e.clipboardData?.items || []);
                  const files = items.map((it) => it.getAsFile()).filter(Boolean);
                  if (files.length) handleAttachUpload(files);
                }}
                tabIndex={0}
                onClick={() => attachInputRef.current?.click()}
                className="mt-2 border-2 border-dashed border-rose-300 bg-rose-50/40 rounded-md p-5 text-center cursor-pointer hover:bg-rose-50 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400"
              >
                <ImagePlus className="w-8 h-8 mx-auto mb-2 text-rose-500" />
                <div className="font-semibold text-rose-800 text-sm">
                  {uploadingAttach ? "Enviando…" : "Arraste imagens, cole (Ctrl/Cmd+V) ou clique para selecionar"}
                </div>
                <div className="text-[11px] text-nude-500 mt-1">Imagens, PDF, TXT, JSON, CSV — múltiplos arquivos</div>
                <input
                  ref={attachInputRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf,.txt,.json,.csv"
                  className="hidden"
                  onChange={(e) => handleAttachUpload(e.target.files)}
                />
              </div>

              {attachments.length > 0 && (
                <ul className="mt-3 space-y-1 max-h-40 overflow-y-auto text-xs">
                  {attachments.map((f, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 bg-nude-50 border border-nude-200 px-2 py-1.5 rounded">
                      <div className="flex items-center gap-2 truncate">
                        {f.type?.startsWith("image/") ? (
                          <img src={f.url} alt={f.name} className="w-8 h-8 object-cover rounded" />
                        ) : (
                          <Paperclip className="w-4 h-4 text-nude-500" />
                        )}
                        <span className="truncate">{f.name}</span>
                        <span className="text-nude-400">({Math.round(f.size / 1024)} KB)</span>
                      </div>
                      <button onClick={() => removeAttachment(i)} className="text-rose-600 hover:text-rose-800">
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <Label className="mt-4 block">Instrução</Label>
              <Textarea
                rows={6}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Descreva a instrução técnica..."
                data-testid="dbg-instruction"
              />

              <div className="flex justify-end gap-2 mt-3">
                <Button onClick={saveInstructionSilently} variant="outline" className="border-nude-300" data-testid="dbg-save">
                  Salvar Atualizações
                </Button>
                <Button onClick={sendInstruction} className="bg-rose-600 hover:bg-rose-700 text-white" data-testid="dbg-fire">
                  <AlertTriangle className="w-4 h-4 mr-2" /> Registrar Instrução
                </Button>
              </div>



              {safeHistory.length > 0 && (
                <div className="mt-6 pt-4 border-t border-nude-200">
                  <div className="text-xs tracking-widest uppercase font-semibold text-nude-500 mb-2">Histórico</div>
                  <div className="space-y-2">
                    {safeHistory.slice(0, 8).map((h) => (
                      <div key={h.id} className="text-sm bg-nude-50 border border-nude-200 rounded-md px-3 py-2">
                        <div className="text-xs text-nude-400">{new Date(h.created_at).toLocaleString("pt-BR")}</div>
                        <div className="mt-1 whitespace-pre-wrap">{h.instruction}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="merge" className="mt-6">
              <div className="text-sm text-nude-500 mb-3">
                Envie 2 imagens + prompt opcional. A IA gera uma 3ª imagem combinada.
              </div>
              <div>
                <Label>Endpoint</Label>
                <Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} className="font-mono text-xs" data-testid="dbg-endpoint" />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                {[1, 2].map((n) => (
                  <label key={n} className="aspect-video border-2 border-dashed border-nude-300 rounded-md flex items-center justify-center cursor-pointer bg-white hover:bg-nude-50 transition-colors overflow-hidden">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(n, e.target.files?.[0])} data-testid={`dbg-file-${n}`} />
                    {(n === 1 ? img1 : img2) ? (
                      <img src={n === 1 ? img1 : img2} alt={`Imagem ${n}`} className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-nude-400 flex flex-col items-center gap-1">
                        <ImagePlus className="w-5 h-5" />
                        <span className="text-xs">Imagem {n}</span>
                      </div>
                    )}
                  </label>
                ))}
              </div>
              <div className="mt-3">
                <Label>Prompt (opcional)</Label>
                <Textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} data-testid="dbg-prompt" />
              </div>
              {err && <div className="mt-2 text-sm text-rose-600">{err}</div>}
              <div className="flex justify-between mt-3">
                <Button variant="outline" onClick={clearAll}>
                  <X className="w-4 h-4 mr-2" /> Limpar
                </Button>
                <Button onClick={runMerge} disabled={loading} className="bg-gold-600 hover:bg-gold-700" data-testid="dbg-go">
                  <Wand2 className="w-4 h-4 mr-2" /> {loading ? "Gerando..." : "Gerar imagem"}
                </Button>
              </div>
              {result && (
                <div className="mt-4 border border-nude-200 rounded-md p-3 bg-white">
                  <img src={result} alt="Resultado" className="w-full rounded-md" />
                  <div className="flex justify-end mt-3">
                    <Button variant="outline" size="sm" onClick={download}>
                      <Download className="w-4 h-4 mr-2" /> Baixar PNG
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="ai" className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm font-semibold">Provedores de IA (ai-router)</div>
                  <div className="text-xs text-nude-500">Verifica se Emergent, Ollama e Lovable estão configurados e respondendo.</div>
                </div>
                <Button size="sm" variant="outline" onClick={refreshAiStatus} disabled={aiLoadingStatus}>
                  {aiLoadingStatus ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
                  Recarregar
                </Button>
              </div>

              {aiStatus?.error && (
                <div className="mb-4 p-3 rounded border border-rose-300 bg-rose-50 text-sm text-rose-700">
                  Falha ao consultar ai-router: {aiStatus.error}
                  <div className="text-xs mt-1">Verifique se a edge function <code>ai-router</code> foi deployada.</div>
                </div>
              )}

              <div className="space-y-2">
                {["emergent", "ollama", "lovable"].map((p) => {
                  const configured = aiStatus && aiStatus[p];
                  const url = aiStatus?.[`${p}_url`];
                  const result = aiResults[p];
                  const isOllama = p === "ollama";
                  const ollamaUrlCheck = isOllama ? aiStatus?.ollama_url_check : null;
                  const canTest = !!configured && (!isOllama || ollamaUrlCheck?.is_public);
                  return (
                    <div key={p} className="flex items-center justify-between gap-3 p-3 border border-nude-200 rounded bg-white">
                      <div className="flex items-center gap-3 min-w-0">
                        {configured == null ? (
                          <Loader2 className="w-5 h-5 text-nude-400" />
                        ) : configured ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-rose-500" />
                        )}
                        <div className="min-w-0">
                          <div className="font-medium capitalize">{p}</div>
                          <div className="text-xs text-nude-500 truncate">
                            {configured == null ? "—" : configured ? (url || "configurado") : "não configurado"}
                          </div>
                          {isOllama && ollamaUrlCheck && (
                            <div className={`text-xs mt-1 ${ollamaUrlCheck.is_public ? "text-emerald-700" : "text-rose-600"}`}>
                              {ollamaUrlCheck.is_public ? "OLLAMA_BASE_URL pública" : `OLLAMA_BASE_URL não pública: ${ollamaUrlCheck.reason}`}
                            </div>
                          )}
                          {result && (
                            <div className={`text-xs mt-1 ${result.ok ? "text-emerald-700" : "text-rose-600"}`}>
                              {result.ok ? `Ping OK${result.url_check?.ping_ms ? ` (${result.url_check.ping_ms}ms)` : ""}` : `Erro: ${result.error}`}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" disabled={!canTest || aiTesting[p]} onClick={() => testAiProvider(p)}>
                        {aiTesting[p] ? <Loader2 className="w-4 h-4 animate-spin" /> : isOllama ? "Ping" : "Testar"}
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 text-xs text-nude-500 space-y-1">
                <div className="font-semibold text-nude-700">Como configurar Ollama:</div>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>No seu PC: <code>ollama serve</code> e <code>ollama pull llama3.1</code></li>
                  <li>Exponha com ngrok: <code>ngrok http 11434</code></li>
                  <li>Atualize o secret <code>OLLAMA_BASE_URL</code> com a URL do ngrok</li>
                  <li>Clique em "Testar" — deve retornar Ping OK.</li>
                </ol>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
