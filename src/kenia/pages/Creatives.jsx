import { useEffect, useState } from "react";
import { api } from "@/kenia/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Badge } from "@/kenia/components/ui/badge";
import { Input } from "@/kenia/components/ui/input";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Label } from "@/kenia/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/kenia/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/kenia/components/ui/select";
import { Sparkles, Instagram, Facebook, Linkedin, Trash2, Download, Copy, Wand2, Upload, X as XIcon, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import SocialConnections from "@/kenia/components/SocialConnections";

const PLATFORMS = [
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube" },
  { id: "x", label: "X (Twitter)" },
  { id: "pinterest", label: "Pinterest" },
  { id: "whatsapp", label: "WhatsApp" },
];


export default function Creatives() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState(null);
  const [refImage, setRefImage] = useState(null); // data URL
  const [logoImage, setLogoImage] = useState(null); // data URL (logo do escritório)
  const [form, setForm] = useState({
    title: "", network: "instagram", format: "post",
    topic: "", tone: "profissional", case_type: "",
  });
  const [scheduled, setScheduled] = useState([]);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState(null); // creative item
  const [scheduleForm, setScheduleForm] = useState({
    caption: "",
    hashtags: "",
    scheduled_for: "",
    platforms: ["instagram"],
  });

  const onPickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 8MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setRefImage(String(reader.result));
    reader.readAsDataURL(file);
  };

  const onPickLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Logo muito grande (máx 4MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoImage(String(reader.result));
    reader.readAsDataURL(file);
  };


  useEffect(() => { load(); loadScheduled(); }, []);
  const load = async () => {
    try {
      const { data } = await api.get("/creatives");
      const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.creatives) ? data.creatives : [];
      setItems(list);
    } catch {
      setItems([]);
    }
  };

  const loadScheduled = async () => {
    try {
      const { data, error } = await supabase
        .from("scheduled_posts")
        .select("*")
        .order("scheduled_for", { ascending: true, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      setScheduled(data || []);
    } catch {
      setScheduled([]);
    }
  };

  const openSchedule = (item) => {
    setScheduleTarget(item);
    setScheduleForm({
      caption: item.caption || "",
      hashtags: "",
      scheduled_for: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
      platforms: [item.network || "instagram"],
    });
    setScheduleOpen(true);
  };

  const togglePlatform = (id) => {
    setScheduleForm((s) => ({
      ...s,
      platforms: s.platforms.includes(id)
        ? s.platforms.filter((p) => p !== id)
        : [...s.platforms, id],
    }));
  };

  const saveSchedule = async () => {
    if (!scheduleTarget) return;
    if (!scheduleForm.platforms.length) {
      toast.error("Selecione pelo menos uma rede");
      return;
    }
    if (!scheduleForm.scheduled_for) {
      toast.error("Defina data e hora");
      return;
    }
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) {
        toast.error("Faça login para agendar publicações");
        return;
      }
      const { error } = await supabase.from("scheduled_posts").insert({
        user_id: userId,
        creative_id: scheduleTarget.id,
        title: scheduleTarget.title,
        caption: scheduleForm.caption,
        hashtags: scheduleForm.hashtags || null,
        image_b64: scheduleTarget.image_b64 || null,
        platforms: scheduleForm.platforms,
        scheduled_for: new Date(scheduleForm.scheduled_for).toISOString(),
        status: "scheduled",
      });
      if (error) throw error;
      toast.success("Publicação agendada! As redes conectadas serão postadas automaticamente.", { duration: 6000 });
      setScheduleOpen(false);
      setScheduleTarget(null);
      loadScheduled();
    } catch (e) {
      toast.error(`Não foi possível agendar: ${e.message || e}`);
    }
  };

  const cancelScheduled = async (id) => {
    if (!confirm("Cancelar este agendamento?")) return;
    await supabase.from("scheduled_posts").delete().eq("id", id);
    loadScheduled();
  };


  const generate = async () => {
    if (!form.title || !form.topic) {
      toast.error("Título e tema são obrigatórios");
      return;
    }
    setGenerating(true);
    try {
      const { data } = await api.post("/creatives/generate", {
        ...form,
        prompt: form.topic,
        reference_image_base64: refImage || null,
        logo_base64: logoImage || null,
      });

      if (data?.image_b64) {
        toast.success("Criativo gerado e salvo!");
        setPreview(data);
      } else {
        toast.error(`Imagem não gerada${data?.error ? `: ${String(data.error).slice(0, 120)}` : ""}`);
      }

      setOpen(false);
      setForm({ title: "", network: "instagram", format: "post", topic: "", tone: "profissional", case_type: "" });
      setRefImage(null);
      setLogoImage(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || "Erro ao gerar");
    } finally {
      setGenerating(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Excluir criativo?")) return;
    await api.delete(`/creatives/${id}`);
    load();
  };

  const copyCaption = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Legenda copiada");
  };

  const download = (item) => {
    if (!item.image_b64) return;
    const a = document.createElement("a");
    a.href = String(item.image_b64).startsWith("data:") ? item.image_b64 : `data:image/png;base64,${item.image_b64}`;
    a.download = `legalflow-${item.id}.png`;
    a.click();
  };

  const imageSrc = (value) => String(value || "").startsWith("data:") ? value : `data:image/png;base64,${value}`;

  const NetIcon = ({ network, className }) => {
    if (network === "instagram") return <Instagram className={className} />;
    if (network === "facebook") return <Facebook className={className} />;
    return <Linkedin className={className} />;
  };

  return (
    <div className="h-screen flex flex-col bg-nude-50 overflow-hidden">
      <div className="px-6 py-4 bg-white border-b border-nude-200 flex items-center justify-between">
        <div>
          <div className="text-xs tracking-widest uppercase text-gold-600 font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> Powered by IA
          </div>
          <h1 className="font-display font-bold text-2xl">Criativos para Redes Sociais</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-nude-900 hover:bg-nude-800" data-testid="ai-generate-post-btn">
              <Wand2 className="w-4 h-4 mr-2" /> Criar com IA
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Gerar Criativo com IA</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label>Título do Post</Label><Input placeholder="Ex: 5 direitos do trabalhador demitido" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} data-testid="creative-title" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Rede Social</Label>
                  <Select value={form.network} onValueChange={v => setForm({ ...form, network: v })}>
                    <SelectTrigger data-testid="creative-network"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Formato</Label>
                  <Select value={form.format} onValueChange={v => setForm({ ...form, format: v })}>
                    <SelectTrigger data-testid="creative-format"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="post">Post</SelectItem>
                      <SelectItem value="story">Story</SelectItem>
                      <SelectItem value="carousel">Carrossel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo de Caso</Label>
                  <Select value={form.case_type} onValueChange={v => setForm({ ...form, case_type: v })}>
                    <SelectTrigger data-testid="creative-case-type"><SelectValue placeholder="Geral" /></SelectTrigger>
                    <SelectContent>
                      {["Geral", "Família", "Trabalhista", "INSS", "Bancário", "Civil", "Empresarial", "Consumidor"].map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tom</Label>
                  <Select value={form.tone} onValueChange={v => setForm({ ...form, tone: v })}>
                    <SelectTrigger data-testid="creative-tone"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="profissional">Profissional</SelectItem>
                      <SelectItem value="informativo">Informativo</SelectItem>
                      <SelectItem value="amigavel">Amigável</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Tema / Mensagem Principal</Label><Textarea rows={3} placeholder="Sobre o que é o post? Qual a mensagem chave?" value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} data-testid="creative-topic" /></div>

              <div>
                <Label>Imagem de referência (opcional)</Label>
                <p className="text-xs text-nude-500 mb-1.5">Envie uma foto para a IA usar como base/inspiração visual.</p>
                {refImage ? (
                  <div className="relative inline-block">
                    <img src={refImage} alt="ref" className="h-28 w-28 object-cover rounded-md border border-nude-200" />
                    <button
                      type="button"
                      onClick={() => setRefImage(null)}
                      className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow"
                      data-testid="creative-remove-ref"
                      aria-label="Remover imagem"
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 h-24 border-2 border-dashed border-nude-300 rounded-md cursor-pointer hover:bg-nude-50 text-sm text-nude-600" data-testid="creative-upload-ref">
                    <Upload className="w-4 h-4" />
                    Clique para enviar imagem (JPG/PNG, até 8MB)
                    <input type="file" accept="image/*" className="hidden" onChange={onPickImage} />
                  </label>
                )}
              </div>

              <div>
                <Label>Logo do escritório (opcional)</Label>
                <p className="text-xs text-nude-500 mb-1.5">A IA aplicará seu logo discretamente no criativo gerado.</p>
                {logoImage ? (
                  <div className="relative inline-block">
                    <img src={logoImage} alt="logo" className="h-20 w-20 object-contain rounded-md border border-nude-200 bg-white p-1" />
                    <button
                      type="button"
                      onClick={() => setLogoImage(null)}
                      className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow"
                      data-testid="creative-remove-logo"
                      aria-label="Remover logo"
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 h-20 border-2 border-dashed border-nude-300 rounded-md cursor-pointer hover:bg-nude-50 text-sm text-nude-600" data-testid="creative-upload-logo">
                    <Upload className="w-4 h-4" />
                    Enviar logo (PNG transparente preferível, até 4MB)
                    <input type="file" accept="image/*" className="hidden" onChange={onPickLogo} />
                  </label>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={generate} disabled={generating} className="bg-nude-900 hover:bg-nude-800" data-testid="creative-generate">
                {generating ? <><span className="animate-pulse-soft">Gerando arte e legenda...</span></> : <><Sparkles className="w-4 h-4 mr-2" /> Gerar com IA</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4">
        <SocialConnections />
        {items.length === 0 ? (
          <Card className="p-12 border-dashed border-nude-300 text-center">
            <div className="w-12 h-12 rounded-md bg-gold-100 grid place-items-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-gold-700" />
            </div>
            <div className="font-display font-semibold text-lg mb-1">Nenhum criativo ainda</div>
            <div className="text-sm text-nude-500 mb-4 max-w-sm mx-auto">
              Gere posts profissionais para Instagram, Facebook e LinkedIn em segundos com IA.
            </div>
            <Button onClick={() => setOpen(true)} className="bg-nude-900 hover:bg-nude-800">
              <Wand2 className="w-4 h-4 mr-2" /> Criar primeiro post
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map(item => (
              <Card key={item.id} className="overflow-hidden border-nude-200 hover:shadow-md transition-shadow" data-testid={`creative-card-${item.id}`}>
                <div className="aspect-square bg-nude-100 relative overflow-hidden">
                  {item.image_b64 ? (
                    <img src={imageSrc(item.image_b64)} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-nude-300">
                      <Sparkles className="w-8 h-8" />
                    </div>
                  )}
                  <Badge className="absolute top-2 left-2 bg-white/90 text-nude-900 hover:bg-white/90 gap-1 backdrop-blur">
                    <NetIcon network={item.network} className="w-3 h-3" />
                    {item.network}
                  </Badge>
                </div>
                <div className="p-3">
                  <div className="font-medium text-sm line-clamp-1">{item.title}</div>
                  <div className="text-xs text-nude-500 line-clamp-3 mt-1.5 whitespace-pre-wrap min-h-[3rem]">{item.caption}</div>
                  <div className="flex gap-1 mt-3 pt-3 border-t border-nude-100">
                    <Button variant="ghost" size="sm" className="h-7 text-xs flex-1" onClick={() => copyCaption(item.caption)} data-testid={`copy-caption-${item.id}`}>
                      <Copy className="w-3 h-3 mr-1" /> Legenda
                    </Button>
                    {item.image_b64 && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs flex-1" onClick={() => download(item)} data-testid={`download-creative-${item.id}`}>
                        <Download className="w-3 h-3 mr-1" /> PNG
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openSchedule(item)} data-testid={`schedule-${item.id}`}>
                      <CalendarClock className="w-3 h-3 mr-1" /> Agendar
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500" onClick={() => remove(item.id)} data-testid={`delete-creative-${item.id}`}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>

                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {scheduled.length > 0 && (
        <div className="border-t border-nude-200 bg-white px-6 py-4 max-h-64 overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="font-display font-semibold text-sm flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-gold-600" /> Publicações agendadas
            </div>
            <div className="text-xs text-nude-500">
              {scheduled.length} na fila • automação ativa quando as redes forem conectadas
            </div>
          </div>
          <div className="space-y-2">
            {scheduled.map((p) => (
              <div key={p.id} className="flex items-center gap-3 text-xs bg-nude-50 border border-nude-200 rounded-md px-3 py-2">
                {p.image_b64 ? (
                  <img src={imageSrc(p.image_b64)} alt="" className="w-10 h-10 rounded object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded bg-nude-200 grid place-items-center text-nude-400"><Sparkles className="w-4 h-4" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{p.title || p.caption?.slice(0, 60) || "Post"}</div>
                  <div className="text-nude-500 truncate">
                    {p.scheduled_for ? new Date(p.scheduled_for).toLocaleString("pt-BR") : "sem data"} • {(p.platforms || []).join(", ") || "—"}
                  </div>
                </div>
                <Badge variant="outline" className="capitalize">{p.status}</Badge>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500" onClick={() => cancelScheduled(p.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedule dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-gold-600" /> Agendar publicação
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Legenda</Label>
              <Textarea rows={4} value={scheduleForm.caption} onChange={(e) => setScheduleForm({ ...scheduleForm, caption: e.target.value })} />
            </div>
            <div>
              <Label>Hashtags (opcional)</Label>
              <Input placeholder="#direitos #advocacia" value={scheduleForm.hashtags} onChange={(e) => setScheduleForm({ ...scheduleForm, hashtags: e.target.value })} />
            </div>
            <div>
              <Label>Data e hora</Label>
              <Input type="datetime-local" value={scheduleForm.scheduled_for} onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_for: e.target.value })} />
            </div>
            <div>
              <Label>Redes</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {PLATFORMS.map((p) => {
                  const active = scheduleForm.platforms.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePlatform(p.id)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${active ? "bg-nude-900 text-white border-nude-900" : "bg-white text-nude-700 border-nude-300 hover:bg-nude-50"}`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-nude-500 mt-2">
                Para publicar automaticamente é preciso conectar cada rede (Meta, LinkedIn, TikTok, YouTube, X). Enquanto não estiverem conectadas, o post fica na fila e fica visível aqui.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveSchedule} className="bg-nude-900 hover:bg-nude-800">
              <CalendarClock className="w-4 h-4 mr-2" /> Confirmar agendamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      {preview && (
        <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
          <DialogContent className="max-w-2xl">

            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gold-500" /> Criativo Gerado
              </DialogTitle>
            </DialogHeader>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="aspect-square bg-nude-100 rounded-md overflow-hidden">
                {preview.image_b64 ? (
                  <img src={imageSrc(preview.image_b64)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-nude-400">Imagem não gerada</div>
                )}
              </div>
              <div className="flex flex-col">
                <div className="font-display font-semibold text-base mb-2">{preview.title}</div>
                <div className="text-sm text-nude-700 whitespace-pre-wrap flex-1">{preview.caption}</div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={() => copyCaption(preview.caption)} variant="outline" className="flex-1">
                    <Copy className="w-4 h-4 mr-2" /> Copiar legenda
                  </Button>
                  {preview.image_b64 && (
                    <Button onClick={() => download(preview)} className="flex-1 bg-nude-900 hover:bg-nude-800">
                      <Download className="w-4 h-4 mr-2" /> Baixar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
