import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../ClonedAuthContext';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import BottomNav from '../components/BottomNav';
import { Plus, MapPin, User, Clock, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const { user, token } = useContext(AuthContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPost, setNewPost] = useState({
    type: user?.role === 'migrant' ? 'need' : 'offer',
    category: 'food',
    title: '',
    description: '',
    images: [],
    location: null
  });
  const [showComments, setShowComments] = useState({});
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState('');

  const categories = [
    { value: 'food', label: t('food'), color: 'bg-green-100 text-green-700 border-green-200' },
    { value: 'legal', label: t('legal'), color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { value: 'health', label: t('health'), color: 'bg-red-100 text-red-700 border-red-200' },
    { value: 'housing', label: t('housing'), color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { value: 'work', label: t('work'), color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    { value: 'education', label: t('education'), color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { value: 'social', label: t('social'), color: 'bg-orange-100 text-orange-700 border-orange-200' }
  ];

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ""}/api/posts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPost = async () => {
    if (!newPost.title || !newPost.description) {
      toast.error('Preencha todos os campos');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ""}/api/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newPost)
      });

      if (response.ok) {
        toast.success('Post criado!');
        setShowCreatePost(false);
        setNewPost({ type: user?.role === 'migrant' ? 'need' : 'offer', category: 'food', title: '', description: '' });
        fetchPosts();
      }
    } catch (error) {
      toast.error('Erro ao criar post');
    }
  };

  const getCategoryStyle = (category) => {
    return categories.find(c => c.value === category)?.color || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-background pb-20" data-testid="home-page">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 glassmorphism">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-heading font-bold text-textPrimary">Feed</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <Dialog open={showCreatePost} onOpenChange={setShowCreatePost}>
          <DialogTrigger asChild>
            <Button 
              data-testid="create-post-button"
              className="w-full rounded-full py-6 mb-6 bg-primary hover:bg-primary-hover text-white font-bold shadow-lg"
            >
              <Plus size={20} className="mr-2" />
              {user?.role === 'migrant' ? 'Preciso de Ajuda' : 'Oferecer Ajuda'}
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl" data-testid="create-post-dialog">
            <DialogHeader>
              <DialogTitle className="text-2xl font-heading">Criar Post</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Categoria</Label>
                <Select value={newPost.category} onValueChange={(v) => setNewPost({...newPost, category: v})}>
                  <SelectTrigger data-testid="category-select" className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Título</Label>
                <Input
                  data-testid="post-title-input"
                  value={newPost.title}
                  onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  data-testid="post-description-input"
                  value={newPost.description}
                  onChange={(e) => setNewPost({...newPost, description: e.target.value})}
                  rows={4}
                  className="rounded-xl"
                />
              </div>
              <Button 
                data-testid="submit-post-button"
                onClick={createPost} 
                className="w-full rounded-full py-6 bg-primary hover:bg-primary-hover"
              >
                Publicar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {loading ? (
          <div className="text-center py-12 text-textMuted">Carregando...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-textMuted" data-testid="no-posts-message">
            Nenhum post ainda. Seja o primeiro!
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div 
                key={post.id} 
                data-testid="post-card"
                className="bg-white rounded-3xl p-6 shadow-card card-hover"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <User size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-textPrimary">{post.user?.name}</p>
                      <p className="text-sm text-textMuted capitalize">{post.user?.role}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getCategoryStyle(post.category)}`}>
                    {categories.find(c => c.value === post.category)?.label}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-textPrimary mb-2">{post.title}</h3>
                <p className="text-textSecondary mb-3 leading-relaxed">{post.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-textMuted">
                    <span className="flex items-center gap-1">
                      <Clock size={16} />
                      {new Date(post.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    {post.type === 'need' && (
                      <span className="text-green-600 font-medium">Precisa de ajuda</span>
                    )}
                    {post.type === 'offer' && (
                      <span className="text-primary font-medium">Oferece ajuda</span>
                    )}
                  </div>
                  {post.user_id !== user.id && (
                    <Button
                      data-testid="chat-with-user-button"
                      onClick={() => navigate(`/direct-chat/${post.user_id}`)}
                      size="sm"
                      className="rounded-full bg-primary hover:bg-primary-hover"
                    >
                      <MessageCircle size={16} className="mr-1" />
                      Conversar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
