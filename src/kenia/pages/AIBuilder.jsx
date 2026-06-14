import { useEffect, useState, useRef } from "react";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Input } from "@/kenia/components/ui/input";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Badge } from "@/kenia/components/ui/badge";
import { Separator } from "@/kenia/components/ui/separator";
import { ScrollArea } from "@/kenia/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/kenia/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/kenia/components/ui/dialog";
import { Label } from "@/kenia/components/ui/label";
import { toast } from "sonner";
import {
  Sparkles, Send, Loader2, CheckCircle2,
  Download, Copy, ChevronDown, ChevronUp, FileText, Key, KeyRound, RefreshCw,
} from "lucide-react";
import { liveApi } from "@/kenia/lib/api";
import { supabase } from "@/integrations/supabase/client";

const PROGRESS_EVENTS = {
  received_prompt: { label: "Recebendo prompt", icon: "📨" },
  calling_llm: { label: "Chamando modelo", icon: "🤖" },
  parsing_plan: { label: "Interpretando plano", icon: "📋" },
  completed: { label: "Concluído", icon: "✅" },
  error: { label: "Erro", icon: "❌" },
};

const PROVIDERS_FALLBACK = [
  { id: "emergent", label: "Emergent (universal · fallback Lovable AI)", default_model: "emergent-default", models: ["emergent-default", "google/gemini-3-flash-preview"] },
  { id: "anthropic", label: "Anthropic Claude Sonnet 4.6 (recomendado p/ código)", default_model: "claude-sonnet-4-6", models: ["claude-sonnet-4-6", "claude-opus-4-8", "claude-opus-4-7", "claude-haiku-4-5-20251001"] },
  { id: "openai", label: "OpenAI GPT-5.4", default_model: "gpt-5.4", models: ["gpt-5.4", "gpt-5.4-mini", "gpt-5.2", "gpt-4o"] },
  { id: "gemini", label: "Google Gemini 3.1 Pro", default_model: "gemini-3.1-pro-preview", models: ["gemini-3.1-pro-preview", "gemini-3-flash-preview"] },
];

const KEY_STORAGE = "kenia_ai_builder_keys_v1";
const PROJECTS_STORAGE = "kenia_ai_builder_projects_v1";

const loadKeys = () => {
  try { return JSON.parse(localStorage.getItem(KEY_STORAGE) || "{}"); } catch { return {}; }
};
const saveKeys = (k) => localStorage.setItem(KEY_STORAGE, JSON.stringify(k));
const loadProjects = () => {
  try { return JSON.parse(localStorage.getItem(PROJECTS_STORAGE) || "[]"); } catch { return []; }
};
const saveProjects = (p) => localStorage.setItem(PROJECTS_STORAGE, JSON.stringify(p));

export default function AIBuilder() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [progressEvents, setProgressEvents] = useState([]);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [expandedFiles, setExpandedFiles] = useState({});
  const [providers, setProviders] = useState(PROVIDERS_FALLBACK);
  const [provider, setProvider] = useState("emergent");
  const [model, setModel] = useState("emergent-default");
  const [keys, setKeys] = useState(loadKeys());
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [keyDraft, setKeyDraft] = useState({ emergent: "", anthropic: "", openai: "", gemini: "" });
  const [projects, setProjects] = useState(loadProjects());
  const [currentProjectId, setCurrentProjectId] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    // carrega providers do backend
    (async () => {
      try {
        const { data } = await liveApi.get("/ai-builder/providers");
        if (data?.providers?.length) setProviders(data.providers);
      } catch {
        // mantém fallback
      }
    })();
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [progressEvents]);

  // Atualiza modelo default ao trocar provider
  useEffect(() => {
    const p = providers.find((p) => p.id === provider);
    if (p) setModel(p.default_model);
  }, [provider, providers]);

  const currentProviderObj = providers.find((p) => p.id === provider) || PROVIDERS_FALLBACK[0];
  const currentKey = (keys[provider] || "").trim();
  const usingEmergentKey = !currentKey;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!prompt.trim()) { toast.error("Digite uma descrição do projeto"); return; }
    setLoading(true);
    setGeneratedPlan(null);
    setProgressEvents([
      { type: "received_prompt", message: "Prompt recebido", timestamp: new Date() },
      { type: "calling_llm", message: `Chamando ${provider} / ${model}…`, timestamp: new Date() },
    ]);

    try {
      let data;
      try {
        const res = await liveApi.post("/ai-builder/generate", {
          prompt: prompt.trim(),
          provider,
          model,
          api_key: currentKey || undefined,
        }, { timeout: 180000 });
        data = res.data;
      } catch (backendErr) {
        // Fallback: chama ai-router (Emergent → Lovable AI) e pede plano em JSON
        const sys = `Você é um gerador de plano de código tipo Lovable. Responda APENAS com JSON válido no formato: {"overview": string, "files":[{"path": string, "content": string}], "next_steps": string[]}. Nada fora do JSON.`;
        const { data: aiData, error: aiErr } = await supabase.functions.invoke("ai-router", {
          body: {
            mode: "chat",
            messages: [
              { role: "system", content: sys },
              { role: "user", content: prompt.trim() },
            ],
            model,
          },
        });
        if (aiErr) throw aiErr;
        const text = (aiData?.text || "").trim();
        const jsonText = text.replace(/^```(?:json)?\s*|\s*```$/g, "");
        let parsed;
        try { parsed = JSON.parse(jsonText); }
        catch { parsed = { overview: text, files: [], next_steps: [] }; }
        data = {
          ok: true,
          provider: aiData?.provider || provider,
          model,
          warning: `Fallback via ${aiData?.provider || "ai-router"} (backend Emergent indisponível)`,
          ...parsed,
        };
      }

      if (!data?.ok) throw new Error(data?.error || "Falha desconhecida");

      setProgressEvents((prev) => [
        ...prev,
        { type: "parsing_plan", message: "Plano interpretado", timestamp: new Date() },
        { type: "completed", message: data.warning || "Plano gerado com sucesso", timestamp: new Date() },
      ]);
      setGeneratedPlan(data);

      // persiste como projeto
      const proj = {
        id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        prompt: prompt.trim(),
        provider, model,
        plan: data,
        created_at: new Date().toISOString(),
      };
      const next = [proj, ...projects].slice(0, 25);
      setProjects(next); saveProjects(next);
      setCurrentProjectId(proj.id);
      toast.success("Plano gerado!");
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || err?.message || "Erro";
      setProgressEvents((prev) => [...prev, { type: "error", message: msg, timestamp: new Date() }]);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleFileExpanded = (idx) => setExpandedFiles((p) => ({ ...p, [idx]: !p[idx] }));
  const copy = (t) => { navigator.clipboard.writeText(t); toast.success("Copiado"); };
  const downloadJson = () => {
    if (!generatedPlan) return;
    const blob = new Blob([JSON.stringify(generatedPlan, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ai-builder-plan-${Date.now()}.json`;
    a.click();
  };

  const openKeyDialog = () => {
    setKeyDraft({
      emergent: keys.emergent || "",
      anthropic: keys.anthropic || "",
      openai: keys.openai || "",
      gemini: keys.gemini || "",
    });
    setKeyDialogOpen(true);
  };
  const saveKeyDialog = () => {
    const next = { ...keys, ...keyDraft };
    setKeys(next); saveKeys(next);
    toast.success("Chaves salvas localmente neste navegador");
    setKeyDialogOpen(false);
  };
  const clearKeys = () => {
    setKeys({}); saveKeys({});
    toast.success("Chaves removidas — voltando à chave universal Emergent");
  };

  const loadProject = (p) => {
    setPrompt(p.prompt);
    setProvider(p.provider);
    setModel(p.model);
    setGeneratedPlan(p.plan);
    setCurrentProjectId(p.id);
    setExpandedFiles({});
    setProgressEvents([
      { type: "received_prompt", message: `Projeto restaurado · ${new Date(p.created_at).toLocaleString("pt-BR")}`, timestamp: new Date() },
      { type: "completed", message: "Plano recarregado do histórico local", timestamp: new Date() },
    ]);
  };

  return (
    <div className="h-screen flex flex-col bg-nude-50 overflow-hidden" data-testid="ai-builder-page">
      <div className="px-6 py-4 bg-white border-b border-nude-200 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs tracking-widest uppercase text-gold-600 font-semibold">Lovable-Style</div>
          <h1 className="font-display font-bold text-2xl flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-gold-600" /> AI Builder
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <KeyRound className="w-3.5 h-3.5" />
            {usingEmergentKey ? "Chave Emergent (universal)" : `Chave própria · ${provider}`}
          </Badge>
          <Button variant="outline" size="sm" onClick={openKeyDialog} data-testid="ai-builder-manage-keys">
            <Key className="w-4 h-4 mr-1.5" /> Gerenciar chaves
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex gap-4 p-6">
        {/* Left column */}
        <div className="flex flex-col w-[26rem] gap-4">
          <Card className="p-4 flex flex-col gap-3">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Provedor LLM</Label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger data-testid="ai-builder-provider"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {providers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Modelo</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger data-testid="ai-builder-model"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(currentProviderObj.models || []).map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="text-[11px] text-nude-500">
                {currentProviderObj.label}
              </div>
              <div>
                <Label className="text-sm font-medium text-nude-700 mb-1.5 block">
                  Descreva seu projeto:
                </Label>
                <Textarea
                  placeholder="Ex: Criar um componente React de formulário de login com validação, tema dark e integração com API."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={loading}
                  className="min-h-32 resize-none"
                  data-testid="ai-builder-prompt"
                />
              </div>
              <Button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="bg-gold-600 hover:bg-gold-700 text-white"
                data-testid="ai-builder-generate"
              >
                {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...</>) : (<><Send className="w-4 h-4 mr-2" /> Gerar Plano</>)}
              </Button>
            </form>
          </Card>

          {progressEvents.length > 0 && (
            <Card className="p-4 flex flex-col gap-2">
              <h3 className="font-medium text-nude-900 text-sm">Progresso:</h3>
              <ScrollArea ref={scrollRef} className="h-44 pr-4">
                <div className="space-y-2">
                  {progressEvents.map((event, idx) => {
                    const meta = PROGRESS_EVENTS[event.type] || { label: event.type, icon: "•" };
                    return (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <span className="text-lg">{meta.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-nude-900">{meta.label}</div>
                          {event.message && <div className="text-nude-600 break-words">{event.message}</div>}
                          <div className="text-nude-400 text-[10px]">{event.timestamp?.toLocaleTimeString()}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </Card>
          )}

          {projects.length > 0 && (
            <Card className="p-4 flex flex-col gap-2 overflow-hidden">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-nude-900 text-sm flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-gold-600" /> Projetos recentes
                </h3>
                <Badge variant="outline" className="text-[10px]">{projects.length}</Badge>
              </div>
              <ScrollArea className="h-44 pr-2">
                <div className="space-y-1.5">
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => loadProject(p)}
                      className={`w-full text-left text-xs px-2.5 py-2 rounded-md border ${currentProjectId === p.id ? "border-gold-400 bg-gold-50" : "border-nude-200 bg-white hover:bg-nude-50"}`}
                      data-testid={`ai-builder-project-${p.id}`}
                    >
                      <div className="font-medium truncate">{p.prompt.slice(0, 80)}</div>
                      <div className="text-nude-500 text-[10px] mt-0.5">{p.provider} · {p.model} · {new Date(p.created_at).toLocaleString("pt-BR")}</div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {generatedPlan ? (
            <Card className="p-4 flex-1 flex flex-col overflow-hidden border-gold-200 bg-gold-50/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-gold-600" />
                  <h2 className="font-semibold text-nude-900">Plano Gerado</h2>
                  {generatedPlan.provider && (
                    <Badge variant="outline" className="text-[10px]">
                      {generatedPlan.provider} · {generatedPlan.model}
                    </Badge>
                  )}
                </div>
                <Badge className="bg-gold-600">Preview (Read-Only)</Badge>
              </div>

              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  {generatedPlan.warning && (
                    <div className="text-xs bg-amber-50 border border-amber-200 rounded-md p-2 text-amber-800">
                      {generatedPlan.warning}
                    </div>
                  )}
                  {generatedPlan.overview && (
                    <div>
                      <h3 className="font-medium text-nude-900 mb-2">Visão Geral</h3>
                      <p className="text-sm text-nude-700 whitespace-pre-wrap">{generatedPlan.overview}</p>
                    </div>
                  )}

                  {Array.isArray(generatedPlan.files) && generatedPlan.files.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-medium text-nude-900 mb-3 flex items-center gap-2">
                          <FileText className="w-4 h-4" /> Arquivos ({generatedPlan.files.length})
                        </h3>
                        <div className="space-y-2">
                          {generatedPlan.files.map((file, idx) => (
                            <div key={idx} className="bg-white border border-nude-200 rounded-md overflow-hidden">
                              <button
                                onClick={() => toggleFileExpanded(idx)}
                                className="w-full flex items-center justify-between p-3 hover:bg-nude-50 transition-colors"
                                data-testid={`ai-builder-file-${idx}`}
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <FileText className="w-4 h-4 text-gold-600 shrink-0" />
                                  <span className="font-mono text-sm truncate">{file.path}</span>
                                </div>
                                {expandedFiles[idx] ? <ChevronUp className="w-4 h-4 text-nude-500" /> : <ChevronDown className="w-4 h-4 text-nude-500" />}
                              </button>
                              {expandedFiles[idx] && (
                                <div className="border-t border-nude-200 bg-nude-50 p-3">
                                  <pre className="text-xs text-nude-700 overflow-x-auto max-h-72 overflow-y-auto font-mono whitespace-pre">{file.content}</pre>
                                  <Button size="sm" variant="ghost" className="mt-2 text-xs" onClick={() => copy(file.content)}>
                                    <Copy className="w-3 h-3 mr-1" /> Copiar
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {Array.isArray(generatedPlan.next_steps) && generatedPlan.next_steps.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-medium text-nude-900 mb-2">Próximos Passos</h3>
                        <ul className="text-sm text-nude-700 space-y-1 list-disc list-inside">
                          {generatedPlan.next_steps.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>

              <div className="mt-4 pt-4 border-t border-nude-200 flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => copy(JSON.stringify(generatedPlan, null, 2))}>
                  <Copy className="w-4 h-4 mr-2" /> Copiar Plano
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={downloadJson}>
                  <Download className="w-4 h-4 mr-2" /> Exportar JSON
                </Button>
              </div>

              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-xs text-blue-800">
                  <strong>ℹ️ Modo Preview:</strong> Os arquivos gerados são visualizáveis,
                  mas não são aplicados automaticamente. Copie e cole no projeto manualmente.
                </p>
              </div>
            </Card>
          ) : (
            <Card className="flex-1 flex flex-col items-center justify-center text-center p-8 border-dashed border-nude-300">
              <Sparkles className="w-12 h-12 text-gold-300 mb-4" />
              <h3 className="font-display font-semibold text-lg text-nude-900 mb-2">Pronto para começar?</h3>
              <p className="text-nude-600 text-sm max-w-sm">
                Descreva seu projeto no painel ao lado, escolha o modelo desejado e clique em
                "Gerar Plano". O resultado fica salvo localmente para continuar depois.
              </p>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={keyDialogOpen} onOpenChange={setKeyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Key className="w-4 h-4" /> Suas chaves de API</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-xs text-nude-600">
              Use suas próprias chaves para continuar projetos sem consumir créditos da
              Emergent. Deixe em branco para usar a chave universal Emergent.
              <br />As chaves ficam armazenadas apenas neste navegador (localStorage).
            </p>
            <div>
              <Label>Emergent</Label>
              <Input type="password" placeholder="emg-..." value={keyDraft.emergent} onChange={(e) => setKeyDraft({ ...keyDraft, emergent: e.target.value })} data-testid="ai-builder-key-emergent" />
              <p className="text-[10px] text-nude-500 mt-1">Se vazia, usamos a chave Emergent universal do servidor e caímos para Lovable AI automaticamente.</p>
            </div>
            <div>
              <Label>Anthropic (Claude)</Label>
              <Input type="password" placeholder="sk-ant-..." value={keyDraft.anthropic} onChange={(e) => setKeyDraft({ ...keyDraft, anthropic: e.target.value })} data-testid="ai-builder-key-anthropic" />
            </div>
            <div>
              <Label>OpenAI</Label>
              <Input type="password" placeholder="sk-..." value={keyDraft.openai} onChange={(e) => setKeyDraft({ ...keyDraft, openai: e.target.value })} data-testid="ai-builder-key-openai" />
            </div>
            <div>
              <Label>Google Gemini</Label>
              <Input type="password" placeholder="AIza..." value={keyDraft.gemini} onChange={(e) => setKeyDraft({ ...keyDraft, gemini: e.target.value })} data-testid="ai-builder-key-gemini" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={clearKeys} className="text-rose-600">Limpar todas</Button>
            <Button onClick={saveKeyDialog} className="bg-nude-900 hover:bg-nude-800" data-testid="ai-builder-key-save">
              Salvar chaves
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
