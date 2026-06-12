import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Camera } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { SvcHeader, SvcBottomNav } from './_nav';
import { toast } from '@/hooks/use-toast';

type Cat = { slug: string; name: string };

export default function ServicosPerfil() {
  const navigate = useNavigate();
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Cat[]>([]);

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'migrant' | 'volunteer' | 'helper'>('migrant');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/servicos/auth', { replace: true }); return; }
      setMe(session.user.id);
      const [{ data: prof }, { data: cats }] = await Promise.all([
        supabase.from('svc_profiles').select('*').eq('user_id', session.user.id).maybeSingle(),
        supabase.from('svc_categories').select('slug,name').order('sort_order'),
      ]);
      if (prof) {
        setDisplayName(prof.display_name ?? '');
        setBio(prof.bio ?? '');
        setCity(prof.city ?? '');
        setPhone(prof.phone ?? '');
        setRole((prof.role as any) ?? 'migrant');
        setAvatarUrl(prof.avatar_url ?? null);
        setSelectedCats(prof.categories ?? []);
      }
      setCategories((cats ?? []) as Cat[]);
      setLoading(false);
    })();
  }, [navigate]);

  const toggleCat = (slug: string) => {
    setSelectedCats((prev) => prev.includes(slug) ? prev.filter((c) => c !== slug) : [...prev, slug]);
  };

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || !me) return;
    setSaving(true);
    try {
      const ext = f.name.split('.').pop() ?? 'jpg';
      const path = `${me}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('svc-photos').upload(path, f, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('svc-photos').getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      toast({ title: 'Foto atualizada — salve para confirmar.' });
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const save = async () => {
    if (!me) return;
    setSaving(true);
    const { error } = await supabase.rpc('upsert_own_svc_profile' as any, {
      _values: {
        display_name: displayName.trim() || 'Usuário',
        bio: bio.trim() || null,
        city: city.trim() || null,
        phone: phone.trim() || null,
        role,
        avatar_url: avatarUrl,
        categories: selectedCats,
      },
    });
    if (error) toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    else toast({ title: 'Perfil salvo!' });
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-0">
      <SEOHead title="Perfil — PertoDeMimServicos" description="Seu perfil." />
      <SvcHeader />

      <main className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-green-600" /></div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <h2 className="text-xl font-bold">Meu perfil</h2>

            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-2xl font-bold overflow-hidden">
                {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : (displayName[0]?.toUpperCase() ?? '?')}
                <label className="absolute bottom-0 right-0 bg-green-600 rounded-full p-1.5 cursor-pointer">
                  <Camera className="w-3 h-3 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
                </label>
              </div>
              <div>
                <p className="font-semibold">{displayName || 'Sem nome'}</p>
                <p className="text-xs text-gray-500 capitalize">{role}</p>
              </div>
            </div>

            <div>
              <Label>Nome</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>

            <div>
              <Label>Eu sou</Label>
              <div className="flex gap-2 mt-1">
                {(['migrant', 'volunteer', 'helper'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                      role === r ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700'
                    }`}
                  >
                    {r === 'migrant' ? 'Quero ajuda' : r === 'volunteer' ? 'Voluntário' : 'Prestador'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Bio</Label>
              <Textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cidade</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Categorias que ofereço</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {categories.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => toggleCat(c.slug)}
                    className={`px-3 py-1 rounded-full text-xs border ${
                      selectedCats.includes(c.slug) ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700'
                    }`}
                  >{c.name}</button>
                ))}
              </div>
            </div>

            <Button onClick={save} disabled={saving} className="w-full bg-green-600 hover:bg-green-700">
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Salvar
            </Button>
          </div>
        )}
      </main>

      <SvcBottomNav active="perfil" />
    </div>
  );
}
