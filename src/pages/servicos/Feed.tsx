import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Home, Users, Plus, MessageCircle, User, MapPin, ImagePlus, X, Loader2 } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { toast } from '@/hooks/use-toast';

type Category = { slug: string; name: string; icon: string | null };
type Post = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  photos: string[];
  budget_range: string | null;
  category_slug: string | null;
  address: string | null;
  status: string;
  post_type: string;
  created_at: string;
};
type ProfileLite = { user_id: string; display_name: string; avatar_url: string | null };

export default function ServicosFeed() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categorySlug, setCategorySlug] = useState<string>('');
  const [budget, setBudget] = useState('');
  const [address, setAddress] = useState('');
  const [postType, setPostType] = useState<'paid' | 'volunteer'>('paid');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadPosts = useCallback(async () => {
    const { data: postsData } = await supabase
      .from('svc_posts')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(50);
    const list = (postsData ?? []) as Post[];
    setPosts(list);

    const ids = Array.from(new Set(list.map((p) => p.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from('svc_profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', ids);
      const map: Record<string, ProfileLite> = {};
      (profs ?? []).forEach((p: any) => (map[p.user_id] = p));
      setProfiles(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/servicos/auth', { replace: true });
        return;
      }
      setUserId(session.user.id);
    });
    supabase.from('svc_categories').select('slug,name,icon').order('sort_order').then(({ data }) => {
      setCategories((data ?? []) as Category[]);
    });
    loadPosts();
  }, [navigate, loadPosts]);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/servicos', { replace: true });
  };

  const resetForm = () => {
    setTitle(''); setDescription(''); setCategorySlug(''); setBudget('');
    setAddress(''); setPostType('paid'); setFiles([]);
  };

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []).slice(0, 4 - files.length);
    setFiles((prev) => [...prev, ...list]);
    e.target.value = '';
  };

  const submitDemand = async () => {
    if (!userId) return;
    if (!title.trim() || !description.trim()) {
      toast({ title: 'Preencha título e descrição', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const photoUrls: string[] = [];
      for (const file of files) {
        const ext = file.name.split('.').pop() ?? 'jpg';
        const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('svc-photos').upload(path, file);
        if (upErr) throw upErr;
        const { data } = supabase.storage.from('svc-photos').getPublicUrl(path);
        photoUrls.push(data.publicUrl);
      }
      const { error } = await supabase.from('svc_posts').insert({
        user_id: userId,
        title: title.trim(),
        description: description.trim(),
        photos: photoUrls,
        budget_range: budget.trim() || null,
        category_slug: categorySlug || null,
        address: address.trim() || null,
        post_type: postType,
        status: 'open',
      });
      if (error) throw error;
      toast({ title: 'Demanda publicada!' });
      setOpen(false);
      resetForm();
      loadPosts();
    } catch (err: any) {
      toast({ title: 'Erro ao publicar', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const catName = (slug: string | null) =>
    categories.find((c) => c.slug === slug)?.name ?? 'Outros';

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-0">
      <SEOHead title="Início — PertoDeMimServicos" description="Feed de demandas e ofertas de serviços." />

      {/* Header verde */}
      <header className="bg-green-600 text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold">Jataí Região Trabalho</h1>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a className="hover:underline cursor-pointer font-semibold">Acolhida</a>
            <a className="hover:underline cursor-pointer">Ofertantes</a>
            <button onClick={() => setOpen(true)} className="hover:underline">Demanda +</button>
            <a className="hover:underline cursor-pointer">Assinatura</a>
            <button onClick={() => navigate('/servicos/chat')} className="hover:underline">Mensagens</button>
          </nav>
          <Button onClick={logout} variant="ghost" size="sm" className="text-white hover:bg-green-700">
            Sair
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Demandas recentes</h2>
          <Button onClick={() => setOpen(true)} className="hidden md:inline-flex bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-1" /> Nova demanda
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-green-600" />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <p className="text-gray-600 mb-3">Nenhuma demanda ainda. Seja o primeiro!</p>
            <Button onClick={() => setOpen(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-1" /> Criar demanda
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {posts.map((p) => {
              const author = profiles[p.user_id];
              return (
                <li key={p.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold overflow-hidden">
                      {author?.avatar_url ? (
                        <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (author?.display_name?.[0] ?? '?').toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{author?.display_name ?? 'Usuário'}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(p.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      p.post_type === 'volunteer' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {p.post_type === 'volunteer' ? 'Voluntário' : 'Pago'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900">{p.title}</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">{p.description}</p>
                  {p.photos.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {p.photos.slice(0, 4).map((url) => (
                        <img key={url} src={url} alt="" className="w-full h-32 object-cover rounded-lg" />
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-gray-600">
                    <span className="px-2 py-0.5 bg-gray-100 rounded">{catName(p.category_slug)}</span>
                    {p.budget_range && <span className="px-2 py-0.5 bg-gray-100 rounded">💰 {p.budget_range}</span>}
                    {p.address && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.address}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t flex items-center justify-around h-16 z-50">
        <button className="flex flex-col items-center text-green-600 text-xs">
          <Home className="w-5 h-5 mb-0.5" />Início
        </button>
        <button className="flex flex-col items-center text-gray-500 text-xs">
          <Users className="w-5 h-5 mb-0.5" />Ofertantes
        </button>
        <button
          onClick={() => setOpen(true)}
          className="flex flex-col items-center text-white text-xs bg-green-600 rounded-full w-14 h-14 -mt-8 shadow-lg"
        >
          <Plus className="w-7 h-7" />
        </button>
        <button onClick={() => navigate('/servicos/chat')} className="flex flex-col items-center text-gray-500 text-xs">
          <MessageCircle className="w-5 h-5 mb-0.5" />Mensagens
        </button>
        <button className="flex flex-col items-center text-gray-500 text-xs">
          <User className="w-5 h-5 mb-0.5" />Perfil
        </button>
      </nav>

      {/* Modal nova demanda */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Publicar demanda</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPostType('paid')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                  postType === 'paid' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700'
                }`}
              >Serviço pago</button>
              <button
                type="button"
                onClick={() => setPostType('volunteer')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                  postType === 'volunteer' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'
                }`}
              >Voluntário</button>
            </div>

            <div>
              <Label htmlFor="title">Título *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Preciso de pedreiro" />
            </div>

            <div>
              <Label htmlFor="desc">Descrição *</Label>
              <Textarea id="desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva o serviço..." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={categorySlug} onValueChange={setCategorySlug}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="budget">Orçamento</Label>
                <Input id="budget" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="R$ 100 - 200" />
              </div>
            </div>

            <div>
              <Label htmlFor="addr">Endereço / bairro</Label>
              <Input id="addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Bairro, cidade" />
            </div>

            <div>
              <Label>Fotos (até 4)</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {files.map((f, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                    <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                      className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5"
                    ><X className="w-3 h-3" /></button>
                  </div>
                ))}
                {files.length < 4 && (
                  <label className="w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer text-gray-400 hover:text-green-600 hover:border-green-600">
                    <ImagePlus className="w-6 h-6" />
                    <input type="file" accept="image/*" multiple className="hidden" onChange={onPickFiles} />
                  </label>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button onClick={submitDemand} disabled={submitting} className="bg-green-600 hover:bg-green-700">
              {submitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Publicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
