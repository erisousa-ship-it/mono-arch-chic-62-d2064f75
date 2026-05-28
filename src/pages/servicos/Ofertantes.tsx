import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Star, MapPin, MessageCircle, Search } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { SvcHeader, SvcBottomNav } from './_nav';

type Profile = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  rating: number;
  role: string;
  categories: string[];
};
type Category = { slug: string; name: string };

export default function ServicosOfertantes() {
  const navigate = useNavigate();
  const [me, setMe] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cat, setCat] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/servicos/auth', { replace: true }); return; }
      setMe(session.user.id);
      const [{ data: profs }, { data: cats }] = await Promise.all([
        supabase.from('svc_profiles').select('*').in('role', ['volunteer', 'helper']).order('rating', { ascending: false }),
        supabase.from('svc_categories').select('slug,name').order('sort_order'),
      ]);
      setProfiles((profs ?? []) as Profile[]);
      setCategories((cats ?? []) as Category[]);
      setLoading(false);
    })();
  }, [navigate]);

  const filtered = profiles.filter((p) => {
    if (p.user_id === me) return false;
    if (cat && !p.categories?.includes(cat)) return false;
    if (search && !p.display_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const startChat = (uid: string) => navigate(`/servicos/chat?with=${uid}`);

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-0">
      <SEOHead title="Ofertantes — PertoDeMimServicos" description="Voluntários e prestadores disponíveis." />
      <SvcHeader />

      <main className="max-w-5xl mx-auto px-4 py-6">
        <h2 className="text-xl font-bold mb-4">Ofertantes disponíveis</h2>

        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome..." className="pl-9" />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setCat('')}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap border ${
                cat === '' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700'
              }`}
            >Todas</button>
            {categories.map((c) => (
              <button
                key={c.slug}
                onClick={() => setCat(c.slug)}
                className={`px-3 py-1 rounded-full text-sm whitespace-nowrap border ${
                  cat === c.slug ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700'
                }`}
              >{c.name}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-green-600" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-500 py-12">Nenhum ofertante encontrado.</p>
        ) : (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((p) => (
              <li key={p.user_id} className="bg-white rounded-2xl p-4 shadow-sm flex flex-col">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold overflow-hidden">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : p.display_name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{p.display_name}</p>
                    <p className="text-xs text-gray-500 capitalize">{p.role}</p>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    {Number(p.rating ?? 0).toFixed(1)}
                  </div>
                </div>
                {p.bio && <p className="text-sm text-gray-600 line-clamp-2 mb-2">{p.bio}</p>}
                {p.city && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mb-2"><MapPin className="w-3 h-3" />{p.city}</p>
                )}
                {p.categories?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {p.categories.slice(0, 3).map((c) => (
                      <span key={c} className="text-[10px] bg-gray-100 px-2 py-0.5 rounded">{c}</span>
                    ))}
                  </div>
                )}
                <Button onClick={() => startChat(p.user_id)} className="bg-green-600 hover:bg-green-700 mt-auto">
                  <MessageCircle className="w-4 h-4 mr-1" /> Conversar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </main>

      <SvcBottomNav active="ofertantes" />
    </div>
  );
}
