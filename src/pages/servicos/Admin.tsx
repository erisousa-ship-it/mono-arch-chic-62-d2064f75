import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, Check, X } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { SvcHeader, SvcBottomNav } from './_nav';
import { toast } from '@/hooks/use-toast';

type Sub = {
  id: string; user_id: string; status: string;
  amount_brl: number; pix_txid: string | null;
  trial_ends_at: string | null; expires_at: string | null; created_at: string;
};
type Profile = { user_id: string; display_name: string };

export default function ServicosAdmin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [stats, setStats] = useState({ posts: 0, users: 0 });

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate('/servicos/auth', { replace: true }); return; }
    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id);
    const admin = (roles ?? []).some((r: any) => r.role === 'admin');
    setIsAdmin(admin);
    if (!admin) { setLoading(false); return; }

    const [{ data: subData }, { count: postCount }, { count: userCount }] = await Promise.all([
      supabase.from('svc_subscriptions').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('svc_posts').select('*', { count: 'exact', head: true }),
      supabase.from('svc_profiles').select('*', { count: 'exact', head: true }),
    ]);
    const s = (subData ?? []) as Sub[];
    setSubs(s);
    setStats({ posts: postCount ?? 0, users: userCount ?? 0 });
    const ids = Array.from(new Set(s.map((x) => x.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from('svc_profiles').select('user_id, display_name').in('user_id', ids);
      const map: Record<string, Profile> = {};
      (profs ?? []).forEach((p: any) => (map[p.user_id] = p));
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: 'active' | 'expired') => {
    const patch: any = { status };
    if (status === 'active') patch.expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from('svc_subscriptions').update(patch).eq('id', id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: `Assinatura ${status === 'active' ? 'ativada' : 'expirada'}` }); load(); }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-6 h-6 animate-spin text-green-600" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SvcHeader />
        <main className="max-w-md mx-auto px-4 py-12 text-center">
          <Shield className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <h2 className="text-xl font-bold">Acesso restrito</h2>
          <p className="text-gray-600 mt-2">Você não é administrador.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-0">
      <SEOHead title="Admin — PertoDeMimServicos" description="Painel administrativo." />
      <SvcHeader />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <h2 className="text-xl font-bold">Painel Admin</h2>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">Usuários</p>
            <p className="text-2xl font-bold">{stats.users}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">Demandas</p>
            <p className="text-2xl font-bold">{stats.posts}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">Assinaturas ativas</p>
            <p className="text-2xl font-bold">{subs.filter((s) => s.status === 'active').length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b font-semibold">Assinaturas pendentes / recentes</div>
          {subs.length === 0 ? (
            <p className="p-6 text-sm text-gray-500 text-center">Nenhuma assinatura.</p>
          ) : (
            <ul className="divide-y">
              {subs.map((s) => (
                <li key={s.id} className="p-4 flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-medium text-sm">{profiles[s.user_id]?.display_name ?? s.user_id.slice(0, 8)}</p>
                    <p className="text-xs text-gray-500">
                      R$ {Number(s.amount_brl).toFixed(2)} — {s.pix_txid ?? 'sem txid'} — {new Date(s.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    s.status === 'active' ? 'bg-green-100 text-green-700' :
                    s.status === 'pix' ? 'bg-yellow-100 text-yellow-700' :
                    s.status === 'expired' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{s.status}</span>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setStatus(s.id, 'active')} className="bg-green-600 hover:bg-green-700">
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setStatus(s.id, 'expired')}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <SvcBottomNav active="perfil" />
    </div>
  );
}
