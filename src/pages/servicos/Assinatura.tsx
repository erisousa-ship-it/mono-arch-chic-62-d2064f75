import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, Check, Crown } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { SvcHeader, SvcBottomNav } from './_nav';
import { toast } from '@/hooks/use-toast';

type Sub = {
  id: string; status: string; trial_ends_at: string | null;
  expires_at: string | null; pix_brcode: string | null; pix_txid: string | null;
  amount_brl: number;
};

export default function ServicosAssinatura() {
  const navigate = useNavigate();
  const [me, setMe] = useState<string | null>(null);
  const [sub, setSub] = useState<Sub | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/servicos/auth', { replace: true }); return; }
      setMe(session.user.id);
      const { data } = await supabase.from('svc_subscriptions').select('*').eq('user_id', session.user.id).maybeSingle();
      setSub(data as Sub | null);
      setLoading(false);
    })();
  }, [navigate]);

  const generatePix = async () => {
    if (!me) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('pix-brcode', { body: { amount: 35.9 } });
      if (error) throw new Error(error.message || 'Falha ao chamar a função PIX');
      if (!data?.brcode || !data?.txid) throw new Error('Resposta inválida da função PIX');
      const brcode = data.brcode as string;
      const txid = data.txid as string;
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      if (sub) {
        const { data: updated, error: upErr } = await supabase.from('svc_subscriptions')
          .update({ pix_brcode: brcode, pix_txid: txid, status: 'pix', amount_brl: 35.9, expires_at: expires })
          .eq('id', sub.id).select().single();
        if (upErr) throw upErr;
        setSub(updated as Sub);
      } else {
        const { data: created, error: insErr } = await supabase.from('svc_subscriptions')
          .insert({ user_id: me, pix_brcode: brcode, pix_txid: txid, status: 'pix', amount_brl: 35.9, expires_at: expires })
          .select().single();
        if (insErr) throw insErr;
        setSub(created as Sub);
      }
      toast({ title: 'PIX gerado', description: 'Copie o código abaixo para pagar.' });
    } catch (err: any) {
      console.error('[PIX] erro:', err);
      toast({ title: 'Erro ao gerar PIX', description: err?.message ?? String(err), variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const copyBrcode = () => {
    if (!sub?.pix_brcode) return;
    navigator.clipboard.writeText(sub.pix_brcode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-0">
      <SEOHead title="Assinatura — PertoDeMimServicos" description="Plano mensal PertoDeMimServicos." />
      <SvcHeader />

      <main className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-green-600" /></div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="w-6 h-6 text-yellow-500" />
              <h2 className="text-xl font-bold">Plano PertoDeMimServicos</h2>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
              <p className="text-3xl font-bold text-green-700">R$ 35,90<span className="text-sm font-normal text-gray-600">/mês</span></p>
              <ul className="text-sm text-gray-700 mt-3 space-y-1">
                <li>✓ Contato direto com ofertantes</li>
                <li>✓ Demandas ilimitadas</li>
                <li>✓ Suporte prioritário</li>
              </ul>
            </div>

            <p className="text-sm text-gray-600 mb-2">
              Status atual: <span className="font-semibold capitalize">{sub?.status ?? 'sem assinatura'}</span>
            </p>

            {sub?.pix_brcode ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold mb-1">PIX Copia e Cola</p>
                  <div className="bg-gray-50 border rounded-lg p-3 break-all text-xs font-mono">
                    {sub.pix_brcode}
                  </div>
                </div>
                <Button onClick={copyBrcode} className="w-full bg-green-600 hover:bg-green-700">
                  {copied ? <><Check className="w-4 h-4 mr-1" /> Copiado!</> : <><Copy className="w-4 h-4 mr-1" /> Copiar código PIX</>}
                </Button>
                <p className="text-xs text-gray-500 text-center">
                  TXID: {sub.pix_txid} — após o pagamento, um admin confirmará sua assinatura.
                </p>
                <Button onClick={generatePix} variant="outline" disabled={generating} className="w-full">
                  {generating && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  Gerar novo PIX
                </Button>
              </div>
            ) : (
              <Button onClick={generatePix} disabled={generating} className="w-full bg-green-600 hover:bg-green-700">
                {generating && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Gerar PIX Copia e Cola
              </Button>
            )}
          </div>
        )}
      </main>

      <SvcBottomNav active="perfil" />
    </div>
  );
}
