import { Sparkles } from "lucide-react";
import SocialConnections from "@/kenia/components/SocialConnections";

export default function SocialConnectionsPage() {
  return (
    <div className="h-screen flex flex-col bg-nude-50 overflow-hidden" data-testid="social-connections-page">
      <div className="px-6 py-4 bg-white border-b border-nude-200">
        <div>
          <div className="text-xs tracking-widest uppercase text-gold-600 font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> Integrações
          </div>
          <h1 className="font-display font-bold text-2xl">Conexões de Redes Sociais</h1>
          <p className="text-sm text-nude-600 mt-1 max-w-2xl">
            Conecte as contas oficiais do escritório para liberar o agendamento e publicação automática
            de criativos. As redes geridas pela Lovable Cloud (LinkedIn, TikTok, WhatsApp via Twilio)
            já estão prontas — basta informar os dados oficiais. Para Meta (Instagram/Facebook),
            X, YouTube e Pinterest será exigido OAuth próprio.
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6 space-y-4">
        <SocialConnections />
      </div>
    </div>
  );
}
