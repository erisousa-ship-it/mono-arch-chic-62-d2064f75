import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../ClonedAuthContext';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import BottomNav from '../components/BottomNav';
import { Plus, MapPin, User, Clock, MessageCircle, Image as ImageIcon, MessageSquare, Send, X, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const { user, token } = useContext(AuthContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
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
  const [commentingOn, setCommentingOn] = useState(null);

  const categories = [
    { value: 'food', label: t('food'), color: 'bg-green-100 text-green-700 border-green-200', icon: '🍽️' },
    { value: 'legal', label: t('legal'), color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '⚖️' },
    { value: 'health', label: t('health'), color: 'bg-red-100 text-red-700 border-red-200', icon: '🏥' },
    { value: 'housing', label: t('housing'), color: 'bg-orange-100 text-orange-700 border-orange-200', icon: '🏠' },
    { value: 'work', label: t('work'), color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: '💼' },
    { value: 'education', label: t('education'), color: 'bg-orange-100 text-orange-700 border-orange-200', icon: '📚' },
    { value: 'social', label: t('social'), color: 'bg-orange-100 text-orange-700 border-orange-200', icon: '🤝' },
    { value: 'clothes', label: 'Roupas', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: '👕' },
    { value: 'furniture', label: 'Móveis', color: 'bg-teal-100 text-teal-700 border-teal-200', icon: '🪑' },
    { value: 'transport', label: 'Transporte', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', icon: '🚗' }
  ];

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    filterPosts();
  }, [posts, categoryFilter, typeFilter]);

  const filterPosts = () => {
    let filtered = posts;
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(p => p.type === typeFilter);
    }
    
    setFilteredPosts(filtered);
  };

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
        setNewPost({ type: user?.role === 'migrant' ? 'need' : 'offer', category: 'food', title: '', description: '', images: [], location: null });
        fetchPosts();
      }
    } catch (error) {
      toast.error('Erro ao criar post');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5000000) {
        toast.error('Imagem muito grande! Máximo 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPost({...newPost, images: [...(newPost.images || []), reader.result]});
        toast.success('Foto adicionada!');
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (index) => {
    const newImages = newPost.images.filter((_, idx) => idx !== index);
    setNewPost({...newPost, images: newImages});
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setNewPost({
            ...newPost,
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              address: 'Localização atual'
            }
          });
          toast.success('Localização adicionada!');
        },
        () => toast.error('Erro ao obter localização')
      );
    }
  };

  const fetchComments = async (postId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ""}/api/posts/${postId}/comments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setComments(prev => ({...prev, [postId]: data}));
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const toggleComments = (postId) => {
    const isShowing = showComments[postId];
    setShowComments(prev => ({...prev, [postId]: !isShowing}));
    if (!isShowing && !comments[postId]) {
      fetchComments(postId);
    }
  };

  const addComment = async (postId) => {
    if (!newComment.trim()) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ""}/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ comment: newComment })
      });

      if (response.ok) {
        setNewComment('');
        setCommentingOn(null);
        fetchComments(postId);
        toast.success('Comentário adicionado!');
      }
    } catch (error) {
      toast.error('Erro ao adicionar comentário');
    }
  };

  const getCategoryStyle = (category) => {
    return categories.find(c => c.value === category)?.color || 'bg-gray-100 text-gray-700';
  };

  const getCategoryIcon = (category) => {
    return categories.find(c => c.value === category)?.icon || '📝';
  };

  return (
    <div className="min-h-screen bg-background pb-20" data-testid="home-page">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 glassmorphism">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-heading font-bold text-textPrimary mb-4">Feed</h1>
          
          {/* Filtros */}
          <div className="flex gap-3 overflow-x-auto pb-2">
            <Button
              data-testid="filter-all"
              onClick={() => setCategoryFilter('all')}
              variant={categoryFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              className={`rounded-full whitespace-nowrap ${categoryFilter === 'all' ? 'bg-primary text-white' : ''}`}
            >
              <Filter size={16} className="mr-1" />
              Todos
            </Button>
            {categories.map(cat => (
              <Button
                key={cat.value}
                data-testid={`filter-${cat.value}`}
                onClick={() => setCategoryFilter(cat.value)}
                variant={categoryFilter === cat.value ? 'default' : 'outline'}
                size="sm"
                className={`rounded-full whitespace-nowrap ${categoryFilter === cat.value ? 'bg-primary text-white' : ''}`}
              >
                <span className="mr-1">{cat.icon}</span>
                {cat.label}
              </Button>
            ))}
          </div>

          <div className="flex gap-2 mt-3">
            <Button
              onClick={() => setTypeFilter('all')}
              variant={typeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              className={`rounded-full ${typeFilter === 'all' ? 'bg-primary text-white' : ''}`}
            >
              Todos
            </Button>
            <Button
              onClick={() => setTypeFilter('need')}
              variant={typeFilter === 'need' ? 'default' : 'outline'}
              size="sm"
              className={`rounded-full ${typeFilter === 'need' ? 'bg-green-600 text-white' : ''}`}
            >
              Precisa de Ajuda
            </Button>
            <Button
              onClick={() => setTypeFilter('offer')}
              variant={typeFilter === 'offer' ? 'default' : 'outline'}
              size="sm"
              className={`rounded-full ${typeFilter === 'offer' ? 'bg-primary text-white' : ''}`}
            >
              Oferece Ajuda
            </Button>
          </div>
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
          <DialogContent className="rounded-3xl max-w-lg" data-testid="create-post-dialog">
            <DialogHeader>
              <DialogTitle className="text-2xl font-heading">Criar Post</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <Label>Categoria</Label>
                <Select value={newPost.category} onValueChange={(v) => setNewPost({...newPost, category: v})}>
                  <SelectTrigger data-testid="category-select" className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <span className="mr-2">{cat.icon}</span>
                        {cat.label}
                      </SelectItem>
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
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  data-testid="add-image-button"
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="flex-1 rounded-xl"
                >
                  <ImageIcon size={18} className="mr-2" />
                  Adicionar Foto
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  data-testid="add-location-button"
                  onClick={getLocation}
                  variant="outline"
                  className="flex-1 rounded-xl"
                >
                  <MapPin size={18} className="mr-2" />
                  Localização
                </Button>
              </div>

              {newPost.images && newPost.images.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {newPost.images.map((img, idx) => (
                    <div key={idx} className="relative w-24 h-24 rounded-lg overflow-hidden border group">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {newPost.location && (
                <div className="p-3 bg-green-50 rounded-xl flex items-center gap-2 text-sm text-green-700">
                  <MapPin size={16} />
                  <span>Localização adicionada</span>
                </div>
              )}

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
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-12 text-textMuted" data-testid="no-posts-message">
            {categoryFilter !== 'all' || typeFilter !== 'all' ? 'Nenhum post encontrado com esses filtros.' : 'Nenhum post ainda. Seja o primeiro!'}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <div 
                key={post.id} 
                data-testid="post-card"
                className={`rounded-3xl p-6 shadow-card card-hover ${
                  post.is_auto_response 
                    ? 'bg-gradient-to-br from-blue-50 to-orange-50 border-2 border-primary' 
                    : 'bg-white'
                }`}
              >
                {post.is_auto_response && (
                  <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-primary/10 rounded-full w-fit">
                    <span className="text-lg">🤖</span>
                    <span className="text-sm font-bold text-primary">Resposta Automática PertoDeMimServicos</span>
                  </div>
                )}
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
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getCategoryStyle(post.category)} flex items-center gap-1`}>
                    <span>{getCategoryIcon(post.category)}</span>
                    {categories.find(c => c.value === post.category)?.label}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-textPrimary mb-2">{post.title}</h3>
                <p className="text-textSecondary mb-3 leading-relaxed">{post.description}</p>

                {post.images && post.images.length > 0 && (
                  <div className={`grid ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2 mb-3`}>
                    {post.images.map((img, idx) => (
                      <img key={idx} src={img} alt="" className="w-full h-48 object-cover rounded-2xl" />
                    ))}
                  </div>
                )}

                {post.location && (
                  <div className="flex items-center gap-2 text-sm text-textMuted mb-3 p-2 bg-blue-50 rounded-lg">
                    <MapPin size={16} className="text-primary" />
                    <span>{post.location.address || 'Localização disponível'}</span>
                  </div>
                )}

                <div className="flex items-center justify-between border-t pt-3 mt-3">
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
                  <div className="flex gap-2">
                    <Button
                      data-testid="toggle-comments-button"
                      onClick={() => toggleComments(post.id)}
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                    >
                      <MessageSquare size={16} className="mr-1" />
                      {showComments[post.id] ? 'Ocultar' : 'Comentários'}
                    </Button>
                    {post.user_id !== user.id && (
                      <Button
                        data-testid="chat-with-user-button"
                        onClick={() => navigate(`/direct-chat/${post.user_id}`)}
                        size="sm"
                        className="rounded-full bg-primary hover:bg-primary-hover text-white"
                      >
                        <MessageCircle size={16} className="mr-1" />
                        Conversar
                      </Button>
                    )}
                  </div>
                </div>

                {showComments[post.id] && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    {comments[post.id] && comments[post.id].length > 0 ? (
                      comments[post.id].map((comment) => (
                        <div key={comment.id} className="flex gap-3 p-3 bg-gray-50 rounded-2xl">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                            <User size={16} className="text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-textPrimary">{comment.user?.name}</p>
                            <p className="text-sm text-textSecondary">{comment.comment}</p>
                            <p className="text-xs text-textMuted mt-1">
                              {new Date(comment.created_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-textMuted text-center py-2">Nenhum comentário ainda</p>
                    )}

                    <div className="flex gap-2 mt-3">
                      <Input
                        placeholder="Escreva um comentário..."
                        value={commentingOn === post.id ? newComment : ''}
                        onChange={(e) => {
                          setCommentingOn(post.id);
                          setNewComment(e.target.value);
                        }}
                        className="rounded-full"
                        data-testid="comment-input"
                      />
                      <Button
                        onClick={() => addComment(post.id)}
                        disabled={!newComment.trim()}
                        size="sm"
                        className="rounded-full bg-primary hover:bg-primary-hover"
                        data-testid="submit-comment-button"
                      >
                        <Send size={16} />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
