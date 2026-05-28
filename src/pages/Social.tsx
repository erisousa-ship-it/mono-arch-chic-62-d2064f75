import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Image as ImageIcon, Calendar, Send, Trash2, Instagram, Facebook, Loader2 } from "lucide-react";

type Platform = "instagram" | "facebook";
type PostStatus = "draft" | "scheduled" | "publishing" | "published" | "failed";

interface Post {
  id: string;
  caption: string;
  hashtags: string | null;
  media_url: string | null;
  platforms: Platform[];
  scheduled_for: string | null;
  status: PostStatus;
  published_at: string | null;
  created_at: string;
}

interface Account {
  id: string;
  platform: Platform;
  account_name: string;
  account_handle: string;
  is_connected: boolean;
}

const Social = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // composer
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("envolvente e profissional");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>(["instagram"]);
  const [scheduledFor, setScheduledFor] = useState("");
  const [genTextLoading, setGenTextLoading] = useState(false);
  const [genImgLoading, setGenImgLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user ?? null);
      if (!s) navigate("/auth");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    void loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const [{ data: p }, { data: a }] = await Promise.all([
      supabase.from("scheduled_posts").select("*").order("created_at", { ascending: false }),
      supabase.from("social_accounts").select("*").order("created_at", { ascending: false }),
    ]);
    setPosts((p as Post[]) ?? []);
    setAccounts((a as Account[]) ?? []);
    setLoading(false);
  };

  const togglePlatform = (p: Platform) =>
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const generateText = async () => {
    if (!topic.trim()) {
      toast({ title: "Informe um tópico", variant: "destructive" });
      return;
    }
    setGenTextLoading(true);
    const { data, error } = await supabase.functions.invoke("generate-post-content", {
      body: { topic, tone, platform: platforms.join(", ") },
    });
    setGenTextLoading(false);
    if (error || data?.error) {
      toast({ title: "Erro ao gerar", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    setCaption(data.caption);
    setHashtags(data.hashtags);
    toast({ title: "Conteúdo gerado!" });
  };

  const generateImage = async () => {
    if (!topic.trim() && !caption.trim()) {
      toast({ title: "Informe um tópico ou legenda", variant: "destructive" });
      return;
    }
    setGenImgLoading(true);
    const { data, error } = await supabase.functions.invoke("generate-post-image", {
      body: { prompt: topic || caption.slice(0, 200) },
    });
    setGenImgLoading(false);
    if (error || data?.error) {
      toast({ title: "Erro ao gerar imagem", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    setMediaUrl(data.image);
    toast({ title: "Imagem gerada!" });
  };

  const savePost = async (status: PostStatus) => {
    if (!user) return;
    if (!caption.trim()) {
      toast({ title: "Legenda obrigatória", variant: "destructive" });
      return;
    }
    if (status === "scheduled" && !scheduledFor) {
      toast({ title: "Defina data e hora", variant: "destructive" });
      return;
    }
    if (platforms.length === 0) {
      toast({ title: "Selecione ao menos uma plataforma", variant: "destructive" });
      return;
    }

    const setBusy = status === "draft" ? setSavingDraft : setScheduling;
    setBusy(true);

    const { error } = await supabase.from("scheduled_posts").insert({
      user_id: user.id,
      caption,
      hashtags: hashtags || null,
      media_url: mediaUrl || null,
      platforms,
      scheduled_for: status === "scheduled" ? new Date(scheduledFor).toISOString() : null,
      status,
    });

    setBusy(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: status === "scheduled" ? "Post agendado!" : "Rascunho salvo!" });
    setTopic(""); setCaption(""); setHashtags(""); setMediaUrl(""); setScheduledFor("");
    void loadData();
  };

  const deletePost = async (id: string) => {
    const { error } = await supabase.from("scheduled_posts").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Removido" }); void loadData(); }
  };

  const connectMockAccount = async (platform: Platform) => {
    if (!user) return;
    const handle = prompt(`@username da conta ${platform}:`);
    if (!handle) return;
    const { error } = await supabase.from("social_accounts").insert({
      user_id: user.id,
      platform,
      account_name: handle,
      account_handle: handle.startsWith("@") ? handle : `@${handle}`,
      is_connected: true,
    });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: `Conta ${platform} conectada (mock)` }); void loadData(); }
  };

  const removeAccount = async (id: string) => {
    await supabase.from("social_accounts").delete().eq("id", id);
    void loadData();
  };

  const statusColors: Record<PostStatus, string> = {
    draft: "bg-muted text-muted-foreground",
    scheduled: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    publishing: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
    published: "bg-green-500/10 text-green-700 dark:text-green-300",
    failed: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container max-w-6xl mx-auto pt-32 pb-16 px-4">
        <header className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Postagens Sociais</h1>
          <p className="text-muted-foreground mt-2">
            Gere conteúdo com IA, agende e publique no Instagram e Facebook.
          </p>
        </header>

        <Tabs defaultValue="compose" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-xl">
            <TabsTrigger value="compose">Criar</TabsTrigger>
            <TabsTrigger value="posts">Posts ({posts.length})</TabsTrigger>
            <TabsTrigger value="media">Mídia ({posts.filter(p => p.media_url).length})</TabsTrigger>
            <TabsTrigger value="accounts">Contas</TabsTrigger>
          </TabsList>

          {/* COMPOSER */}
          <TabsContent value="compose">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="p-6 space-y-4">
                <div>
                  <Label htmlFor="topic">Tópico do post</Label>
                  <Input
                    id="topic"
                    placeholder="Ex: lançamento do novo curso de marketing"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="tone">Tom</Label>
                  <Input
                    id="tone"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={generateText} disabled={genTextLoading} className="flex-1">
                    {genTextLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    Gerar texto com IA
                  </Button>
                  <Button onClick={generateImage} disabled={genImgLoading} variant="secondary" className="flex-1">
                    {genImgLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                    Gerar imagem
                  </Button>
                </div>

                <div>
                  <Label htmlFor="caption">Legenda</Label>
                  <Textarea
                    id="caption"
                    rows={6}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Sua legenda aqui..."
                  />
                </div>
                <div>
                  <Label htmlFor="hashtags">Hashtags</Label>
                  <Textarea
                    id="hashtags"
                    rows={2}
                    value={hashtags}
                    onChange={(e) => setHashtags(e.target.value)}
                    placeholder="#marketing #vendas..."
                  />
                </div>
                <div>
                  <Label htmlFor="media">URL da mídia (opcional)</Label>
                  <Input
                    id="media"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <Label>Plataformas</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      type="button"
                      variant={platforms.includes("instagram") ? "default" : "outline"}
                      size="sm"
                      onClick={() => togglePlatform("instagram")}
                    >
                      <Instagram className="w-4 h-4 mr-2" /> Instagram
                    </Button>
                    <Button
                      type="button"
                      variant={platforms.includes("facebook") ? "default" : "outline"}
                      size="sm"
                      onClick={() => togglePlatform("facebook")}
                    >
                      <Facebook className="w-4 h-4 mr-2" /> Facebook
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="scheduled">Agendar para</Label>
                  <Input
                    id="scheduled"
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={() => savePost("draft")} variant="outline" disabled={savingDraft} className="flex-1">
                    {savingDraft && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Salvar rascunho
                  </Button>
                  <Button onClick={() => savePost("scheduled")} disabled={scheduling} className="flex-1">
                    {scheduling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calendar className="w-4 h-4 mr-2" />}
                    Agendar
                  </Button>
                </div>
              </Card>

              {/* PREVIEW */}
              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Send className="w-4 h-4" /> Pré-visualização
                </h3>
                <div className="border border-border rounded-lg overflow-hidden bg-card">
                  {mediaUrl ? (
                    <img src={mediaUrl} alt="preview" className="w-full aspect-square object-cover" />
                  ) : (
                    <div className="w-full aspect-square bg-muted flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="w-12 h-12" />
                    </div>
                  )}
                  <div className="p-4 space-y-2">
                    <p className="text-sm whitespace-pre-wrap">{caption || "Sua legenda aparecerá aqui..."}</p>
                    {hashtags && <p className="text-sm text-primary">{hashtags}</p>}
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* POSTS LIST */}
          <TabsContent value="posts">
            {loading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : posts.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground">
                Nenhum post ainda. Crie o primeiro na aba "Criar".
              </Card>
            ) : (
              <div className="grid gap-4">
                {posts.map((post) => (
                  <Card key={post.id} className="p-4 flex gap-4">
                    {post.media_url ? (
                      <img src={post.media_url} alt="" className="w-24 h-24 rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-24 h-24 rounded bg-muted flex-shrink-0 flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge className={statusColors[post.status]}>{post.status}</Badge>
                        {post.platforms.map((p) => (
                          <Badge key={p} variant="outline" className="capitalize">{p}</Badge>
                        ))}
                        {post.scheduled_for && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(post.scheduled_for).toLocaleString("pt-BR")}
                          </span>
                        )}
                      </div>
                      <p className="text-sm line-clamp-2">{post.caption}</p>
                      {post.hashtags && (
                        <p className="text-xs text-primary line-clamp-1 mt-1">{post.hashtags}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deletePost(post.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* MEDIA GALLERY */}
          <TabsContent value="media">
            {(() => {
              const mediaPosts = posts.filter((p) => p.media_url);
              if (loading) return <p className="text-muted-foreground">Carregando...</p>;
              if (mediaPosts.length === 0) {
                return (
                  <Card className="p-12 text-center text-muted-foreground">
                    Nenhuma imagem criada ainda. Gere uma na aba "Criar" e salve como rascunho.
                  </Card>
                );
              }
              return (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    Imagens armazenadas no banco em <code className="text-xs bg-muted px-1.5 py-0.5 rounded">scheduled_posts.media_url</code>.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {mediaPosts.map((post) => (
                      <Card key={post.id} className="overflow-hidden group">
                        <div className="aspect-square bg-muted relative">
                          <img
                            src={post.media_url!}
                            alt={post.caption.slice(0, 40)}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setMediaUrl(post.media_url!);
                                toast({ title: "Imagem reutilizada no compositor" });
                              }}
                            >
                              Reutilizar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(post.media_url!);
                                toast({ title: "URL copiada" });
                              }}
                            >
                              Copiar URL
                            </Button>
                            <a
                              href={post.media_url!}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-primary underline"
                            >
                              Abrir em nova aba
                            </a>
                          </div>
                        </div>
                        <div className="p-3">
                          <Badge className={statusColors[post.status]} >{post.status}</Badge>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-2">{post.caption}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              );
            })()}
          </TabsContent>

          {/* ACCOUNTS */}
          <TabsContent value="accounts">
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <Card className="p-6">
                <Instagram className="w-8 h-8 mb-3" />
                <h3 className="font-semibold mb-2">Instagram</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Conecte sua conta business para publicar automaticamente (modo demo).
                </p>
                <Button onClick={() => connectMockAccount("instagram")} className="w-full">
                  Conectar conta
                </Button>
              </Card>
              <Card className="p-6">
                <Facebook className="w-8 h-8 mb-3" />
                <h3 className="font-semibold mb-2">Facebook</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Conecte uma página do Facebook para publicar automaticamente (modo demo).
                </p>
                <Button onClick={() => connectMockAccount("facebook")} className="w-full">
                  Conectar página
                </Button>
              </Card>
            </div>

            {accounts.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Contas conectadas</h3>
                {accounts.map((acc) => (
                  <Card key={acc.id} className="p-4 flex items-center gap-4">
                    {acc.platform === "instagram" ? (
                      <Instagram className="w-5 h-5" />
                    ) : (
                      <Facebook className="w-5 h-5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{acc.account_name}</p>
                      <p className="text-xs text-muted-foreground">{acc.account_handle}</p>
                    </div>
                    <Badge variant="outline">demo</Badge>
                    <Button variant="ghost" size="icon" onClick={() => removeAccount(acc.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}

            <Card className="p-4 mt-6 bg-muted/30 border-dashed">
              <p className="text-xs text-muted-foreground">
                <strong>Modo demo:</strong> as conexões e publicações são simuladas. Para publicação real, é necessário cadastrar
                um App no Meta for Developers e adicionar as credenciais.
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Social;
