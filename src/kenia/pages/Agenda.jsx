import { useEffect, useState } from "react";
import { api } from "@/kenia/lib/api";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Badge } from "@/kenia/components/ui/badge";
import { Input } from "@/kenia/components/ui/input";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Label } from "@/kenia/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/kenia/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/kenia/components/ui/select";
import { toast } from "sonner";
import {
  Plus, Calendar, Clock, Video, User, Link2, Trash2,
  CheckCircle2, AlertCircle, XCircle, ChevronLeft, ChevronRight, Copy,
  BellRing, RefreshCw, MessageSquare,
} from "lucide-react";

const STATUS_COLORS = {
  confirmado: "bg-gold-100 text-gold-800",
  pendente: "bg-gold-100 text-gold-800",
  cancelado: "bg-rose-100 text-rose-800",
};

export default function Agenda() {
  const [items, setItems] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [syncingDeadlines, setSyncingDeadlines] = useState(false);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("list");
  const [cursor, setCursor] = useState(new Date());
  const [form, setForm] = useState({
    title: "", client_name: "", starts_at: "", duration_min: 60,
    location: "Google Meet", notes: "", status: "confirmado",
  });

  useEffect(() => { load(); loadDeadlines(); }, []);
  const load = async () => {
    try {
      const { data } = await api.get("/appointments");
      const appointments = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.appointments)
            ? data.appointments
            : [];
      setItems(appointments);
    } catch {
      setItems([]);
    }
  };

  const loadDeadlines = async () => {
    try {
      const { data } = await api.get("/legal-deadlines");
      const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      setDeadlines(list.sort((a, b) => new Date(a.due_at || 0) - new Date(b.due_at || 0)));
    } catch {
      setDeadlines([]);
    }
  };

  const syncDeadlines = async () => {
    setSyncingDeadlines(true);
    try {
      await api.post("/legal-deadlines/sync", { providers: ["escavador", "jusbrasil", "datalawyer"] });
      toast.success("Prazos sincronizados com fallback ativo");
      loadDeadlines();
    } catch {
      toast.error("Não foi possível sincronizar agora");
    } finally {
      setSyncingDeadlines(false);
    }
  };

  const notifyDeadline = async (item) => {
    try {
      await api.post(`/legal-deadlines/${item.id}/notify`, { channel: "whatsapp", phone: item.client_phone });
      toast.success("Aviso enviado ou salvo no app como fallback");
      loadDeadlines();
    } catch {
      toast.error("Falha ao notificar");
    }
  };

  const toggleDeadlineStatus = async (item, status) => {
    await api.patch(`/legal-deadlines/${item.id}`, { status });
    loadDeadlines();
  };

  const create = async () => {
    if (!form.title || !form.starts_at) { toast.error("Título e data obrigatórios"); return; }
    try {
      await api.post("/appointments", { ...form, starts_at: new Date(form.starts_at).toISOString() });
      toast.success("Reunião agendada");
      setOpen(false);
      setForm({ title: "", client_name: "", starts_at: "", duration_min: 60, location: "Google Meet", notes: "", status: "confirmado" });
      load();
    } catch { toast.error("Erro"); }
  };

  const remove = async (id) => {
    if (!confirm("Excluir reunião?")) return;
    await api.delete(`/appointments/${id}`);
    load();
  };

  const toggleStatus = async (item, status) => {
    await api.patch(`/appointments/${item.id}`, { status });
    load();
  };

  const copyLink = (link) => {
    navigator.clipboard.writeText(link);
    toast.success("Link copiado");
  };

  const today = new Date();
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();
  const firstDayOfWeek = monthStart.getDay();

  const monthLabel = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const appointments = Array.isArray(items) ? items : [];
  const itemsByDay = {};
  appointments.forEach(i => {
    const d = new Date(i.starts_at);
    if (d.getMonth() !== cursor.getMonth() || d.getFullYear() !== cursor.getFullYear()) return;
    const key = d.getDate();
    itemsByDay[key] = itemsByDay[key] || [];
    itemsByDay[key].push(i);
  });

  const upcoming = appointments
    .filter(i => new Date(i.starts_at) >= new Date(today.setHours(0, 0, 0, 0)))
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
    .slice(0, 20);

  return (
    <div className="h-screen flex flex-col bg-nude-50 overflow-hidden">
      <div className="px-6 py-4 bg-white border-b border-nude-200 flex items-center justify-between">
        <div>
          <div className="text-xs tracking-widest uppercase text-gold-600 font-semibold">Calendário</div>
          <h1 className="font-display font-bold text-2xl">Agenda de Reuniões</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-nude-300" onClick={syncDeadlines} disabled={syncingDeadlines} data-testid="sync-deadlines-btn">
            <RefreshCw className={`w-4 h-4 mr-2 ${syncingDeadlines ? "animate-spin" : ""}`} /> Sincronizar prazos
          </Button>
          <div className="inline-flex border border-nude-200 rounded-md p-0.5 bg-white">
            <Button size="sm" variant={view === "calendar" ? "default" : "ghost"} className="h-7" onClick={() => setView("calendar")}>Mês</Button>
            <Button size="sm" variant={view === "list" ? "default" : "ghost"} className="h-7" onClick={() => setView("list")}>Lista</Button>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-nude-900 hover:bg-nude-800" data-testid="new-appt-btn">
                <Plus className="w-4 h-4 mr-2" /> Nova reunião
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Reunião</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Título</Label><Input placeholder="Ex: Consulta inicial - Divorcio" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} data-testid="appt-title" /></div>
                <div><Label>Cliente</Label><Input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} data-testid="appt-client" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Data e hora</Label><Input type="datetime-local" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} data-testid="appt-starts" /></div>
                  <div>
                    <Label>Duração (min)</Label>
                    <Select value={String(form.duration_min)} onValueChange={v => setForm({ ...form, duration_min: Number(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[15, 30, 45, 60, 90, 120].map(m => <SelectItem key={m} value={String(m)}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Local</Label>
                  <Select value={form.location} onValueChange={v => setForm({ ...form, location: v })}>
                    <SelectTrigger data-testid="appt-location"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Google Meet">Google Meet (link automático)</SelectItem>
                      <SelectItem value="Zoom">Zoom</SelectItem>
                      <SelectItem value="Presencial">Presencial no escritório</SelectItem>
                      <SelectItem value="Telefone">Ligação telefônica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Observações</Label><Textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} data-testid="appt-notes" /></div>
              </div>
              <DialogFooter>
                <Button onClick={create} className="bg-nude-900 hover:bg-nude-800" data-testid="appt-submit">Agendar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <Card className="mb-5 border-rose-200 bg-rose-50/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-rose-800">
                <BellRing className="h-4 w-4" /> Intimações e prazos
              </div>
              <div className="mt-1 text-xs text-nude-600">
                Monitoramento preparado para Escavador, Jusbrasil e Data Lawyer; se um provedor falhar, o alerta permanece no app.
              </div>
            </div>
            <Badge className="bg-white text-rose-700 border border-rose-200 hover:bg-white">
              {deadlines.filter((d) => d.status !== "done").length} pendente(s)
            </Badge>
          </div>
          {deadlines.length > 0 && (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {deadlines.slice(0, 4).map((item) => {
                const due = item.due_at ? new Date(item.due_at) : null;
                const daysLeft = due ? Math.ceil((due.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null;
                return (
                  <div key={item.id} className="rounded-md border border-rose-100 bg-white p-3" data-testid={`deadline-${item.id}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-nude-900">{item.title}</div>
                        <div className="mt-1 text-xs text-nude-600">{item.client_name} · {item.court}</div>
                        <div className="mt-1 text-xs text-nude-500">{item.process_number}</div>
                      </div>
                      <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 shrink-0">
                        {daysLeft != null ? (daysLeft <= 0 ? "vence hoje" : `${daysLeft}d`) : "prazo"}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => notifyDeadline(item)}>
                        <MessageSquare className="mr-1 h-3 w-3" /> Avisar WhatsApp
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toggleDeadlineStatus(item, "done")}>
                        <CheckCircle2 className="mr-1 h-3 w-3 text-gold-600" /> Cumprido
                      </Button>
                      <span className="ml-auto text-[11px] text-nude-400">{item.whatsapp_notified ? "WhatsApp/app avisado" : item.assigned_to}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {view === "calendar" && (
          <Card className="border-nude-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="font-display font-semibold text-lg capitalize">{monthLabel}</div>
              <Button variant="ghost" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-px bg-nude-200 rounded-md overflow-hidden text-xs">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map(d => (
                <div key={d} className="bg-nude-50 py-2 text-center font-semibold text-nude-600">{d}</div>
              ))}
              {Array(firstDayOfWeek).fill(0).map((_, i) => (
                <div key={`e${i}`} className="bg-white min-h-[90px]" />
              ))}
              {Array(daysInMonth).fill(0).map((_, i) => {
                const day = i + 1;
                const isToday = day === new Date().getDate() && cursor.getMonth() === new Date().getMonth() && cursor.getFullYear() === new Date().getFullYear();
                const dayItems = itemsByDay[day] || [];
                return (
                  <div key={day} className={`bg-white min-h-[90px] p-1.5 ${isToday ? "ring-2 ring-gold-400 ring-inset" : ""}`}>
                    <div className={`text-right font-semibold text-xs ${isToday ? "text-gold-600" : "text-nude-700"}`}>{day}</div>
                    <div className="mt-1 space-y-0.5">
                      {dayItems.slice(0, 3).map(it => (
                        <div key={it.id} className="truncate text-[10px] bg-nude-900 text-white px-1 py-0.5 rounded">
                          {new Date(it.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} {it.title}
                        </div>
                      ))}
                      {dayItems.length > 3 && (
                        <div className="text-[10px] text-nude-500">+{dayItems.length - 3} mais</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {view === "list" && (
          <div className="space-y-3">
            {upcoming.length === 0 ? (
              <Card className="p-10 border-dashed border-nude-300 text-center text-nude-400">
                Nenhuma reunião agendada. Clique em "Nova reunião" para começar.
              </Card>
            ) : upcoming.map(it => {
              const d = new Date(it.starts_at);
              const dateLabel = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
              const timeLabel = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
              const meetingLink = it.meeting_link || it.meet_url;
              return (
                <Card key={it.id} className="p-4 border-nude-200 hover:shadow-sm transition-shadow" data-testid={`appt-${it.id}`}>
                  <div className="flex items-start gap-4">
                    <div className="text-center min-w-[70px] border-r border-nude-200 pr-4">
                      <div className="text-[10px] text-nude-500 uppercase tracking-widest">{dateLabel.split(" ")[0]}</div>
                      <div className="font-display font-bold text-2xl text-nude-900">{d.getDate()}</div>
                      <div className="text-xs text-nude-500 capitalize">{dateLabel.split(" ")[2]}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-nude-900">{it.title}</div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-nude-600">
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{timeLabel} · {it.duration_min}min</span>
                            {it.client_name && <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{it.client_name}</span>}
                            <span className="flex items-center gap-1"><Video className="w-3.5 h-3.5" />{it.location}</span>
                          </div>
                          {it.notes && <div className="text-xs text-nude-500 mt-1.5 line-clamp-2">{it.notes}</div>}
                          {meetingLink && (
                            <div className="flex items-center gap-2 mt-2">
                              <Link2 className="w-3.5 h-3.5 text-gold-600" />
                              <a href={meetingLink} target="_blank" rel="noreferrer" className="text-xs text-gold-700 hover:underline truncate max-w-md">
                                {meetingLink}
                              </a>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyLink(meetingLink)}>
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <Badge className={`${STATUS_COLORS[it.status]} hover:${STATUS_COLORS[it.status]} shrink-0`}>
                          {it.status}
                        </Badge>
                      </div>
                      <div className="flex gap-1.5 mt-3 pt-3 border-t border-nude-100">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleStatus(it, "confirmado")}>
                          <CheckCircle2 className="w-3 h-3 mr-1 text-gold-600" /> Confirmar
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleStatus(it, "pendente")}>
                          <AlertCircle className="w-3 h-3 mr-1 text-gold-600" /> Pendente
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleStatus(it, "cancelado")}>
                          <XCircle className="w-3 h-3 mr-1 text-rose-500" /> Cancelar
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs ml-auto text-rose-500 hover:text-rose-600" onClick={() => remove(it.id)}>
                          <Trash2 className="w-3 h-3 mr-1" /> Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
