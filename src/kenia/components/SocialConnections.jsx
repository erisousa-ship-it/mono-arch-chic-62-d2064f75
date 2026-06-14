import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Input } from "@/kenia/components/ui/input";
import { Label } from "@/kenia/components/ui/label";
import { Badge } from "@/kenia/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/kenia/components/ui/dialog";
import { Instagram, Facebook, Linkedin, Youtube, Twitter, Music2, Image as ImageIcon, MessageCircle, Check, Plug } from "lucide-react";
import { toast } from "sonner";

// Lista oficial das 8 redes que o app suporta para publicar
export const SOCIAL_NETWORKS = [
  { id: "instagram", label: "Instagram", icon: Instagram, color: "from-fuchsia-500 to-orange-400", managed: false },
  { id: "facebook",  label: "Facebook",  icon: Facebook,  color: "from-blue-600 to-blue-400",     managed: false },
  { id: "linkedin",  label: "LinkedIn",  icon: Linkedin,  color: "from-sky-700 to-sky-500",       managed: true, manager: "Lovable Cloud (LinkedIn API)" },
  { id: "tiktok",    label: "TikTok",    icon: Music2,    color: "from-zinc-900 to-rose-500",     managed: true, manager: "Lovable Cloud (TikTok API)" },
  { id: "youtube",   label: "YouTube",   icon: Youtube,   color: "from-red-600 to-red-400",       managed: false },
  { id: "x",         label: "X (Twitter)", icon: Twitter, color: "from-zinc-900 to-zinc-600",     managed: false },
  { id: "pinterest", label: "Pinterest", icon: ImageIcon, color: "from-rose-600 to-rose-400",     managed: false },
  { id: "whatsapp",  label: "WhatsApp",  icon: MessageCircle, color: "from-emerald-600 to-emerald-400", managed: true, manager: "Twilio (Lovable Cloud)" },
];

export default function SocialConnections({ compact = false }) {
  const [accounts, setAccounts] = useState([]);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(null);
  const [form, setForm] = useState({ account_name: "", account_handle: "" });

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user?.id) { setAccounts([]); return; }
    const { data } = await supabase
      .from("social_accounts")
      .select("*")
      .eq("user_id", auth.user.id);
    setAccounts(data || []);
  };

  useEffect(() => { load(); }, []);

  const isConnected = (id) => accounts.some((a) => a.platform === id && a.is_connected);
  const accountFor = (id) => accounts.find((a) => a.platform === id);

  const openConnect = (net) => {
    setTarget(net);
    const existing = accountFor(net.id);
    setForm({
      account_name: existing?.account_name || (net.managed ? `${net.label} • Conta oficial` : ""),
      account_handle: existing?.account_handle || "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!target) return;
    if (!form.account_name || !form.account_handle) {
      toast.error("Informe o nome da conta e o usuário/handle");
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user?.id) { toast.error("Faça login primeiro"); return; }
    const existing = accountFor(target.id);
    try {
      if (existing) {
        const { error } = await supabase
          .from("social_accounts")
          .update({ account_name: form.account_name, account_handle: form.account_handle, is_connected: true })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("social_accounts").insert({
          user_id: auth.user.id,
          platform: target.id,
          account_name: form.account_name,
          account_handle: form.account_handle,
          is_connected: true,
        });
        if (error) throw error;
      }
      toast.success(`${target.label} conectado`);
      setOpen(false);
      setTarget(null);
      load();
    } catch (e) {
      toast.error(`Não foi possível salvar: ${e.message || e}`);
    }
  };

  const disconnect = async (net) => {
    const existing = accountFor(net.id);
    if (!existing) return;
    if (!confirm(`Desconectar ${net.label}?`)) return;
    await supabase.from("social_accounts").delete().eq("id", existing.id);
    toast.success(`${net.label} desconectado`);
    load();
  };

  return (
    <Card className={`p-4 border-nude-200 ${compact ? "bg-white" : "bg-white"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Plug className="w-4 h-4 text-gold-600" />
          <div>
            <div className="font-display font-semibold text-sm">Conectar redes sociais para publicar</div>
            <div className="text-[11px] text-nude-500">
              Conecte cada conta para liberar o agendamento automático dos posts (fusão e criativos).
            </div>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {accounts.filter((a) => a.is_connected).length}/{SOCIAL_NETWORKS.length} conectadas
        </Badge>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {SOCIAL_NETWORKS.map((net) => {
          const Icon = net.icon;
          const connected = isConnected(net.id);
          const acc = accountFor(net.id);
          return (
            <div
              key={net.id}
              className={`relative rounded-md border ${connected ? "border-emerald-300 bg-emerald-50/40" : "border-nude-200 bg-nude-50"} p-3 flex flex-col gap-2`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-md bg-gradient-to-br ${net.color} grid place-items-center text-white`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs font-semibold truncate">{net.label}</div>
                {connected && <Check className="w-3.5 h-3.5 text-emerald-600 ml-auto" />}
              </div>
              {connected && acc ? (
                <div className="text-[11px] text-nude-600 truncate">
                  {acc.account_handle}
                </div>
              ) : (
                <div className="text-[10px] text-nude-500">
                  {net.managed ? `Pronto via ${net.manager}` : "Login manual (Meta/Pinterest/X/YouTube)"}
                </div>
              )}
              <div className="flex gap-1.5 mt-auto">
                <Button
                  size="sm"
                  variant={connected ? "outline" : "default"}
                  className={`h-7 text-[11px] flex-1 ${connected ? "" : "bg-nude-900 hover:bg-nude-800"}`}
                  onClick={() => openConnect(net)}
                >
                  {connected ? "Editar" : "Conectar"}
                </Button>
                {connected && (
                  <Button size="sm" variant="ghost" className="h-7 text-[11px] text-rose-500" onClick={() => disconnect(net)}>
                    Sair
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {target && <target.icon className="w-4 h-4" />} Conectar {target?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {target?.managed ? (
              <div className="text-xs bg-emerald-50 border border-emerald-200 rounded-md p-2 text-emerald-800">
                ✅ A integração de {target.label} está disponível via <strong>{target.manager}</strong>.
                Informe os dados da conta oficial que será usada para publicar.
              </div>
            ) : (
              <div className="text-xs bg-amber-50 border border-amber-200 rounded-md p-2 text-amber-800">
                Para {target?.label} é necessário o app OAuth oficial ({target?.label === "Instagram" || target?.label === "Facebook" ? "Meta Graph API" : target?.label === "YouTube" ? "Google Data API" : target?.label === "X (Twitter)" ? "X API v2" : "Pinterest API"}).
                Registre a conta abaixo — o agendamento envia o conteúdo para sua fila e publica assim que o token OAuth for adicionado em <em>Secrets</em>.
              </div>
            )}
            <div>
              <Label>Nome da conta</Label>
              <Input value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} placeholder="Ex: Escritório Kênia Garcia" />
            </div>
            <div>
              <Label>Usuário / handle / ID</Label>
              <Input value={form.account_handle} onChange={(e) => setForm({ ...form, account_handle: e.target.value })} placeholder="@escritoriokenia" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={save} className="bg-nude-900 hover:bg-nude-800">
              <Plug className="w-3.5 h-3.5 mr-2" /> Salvar conexão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
