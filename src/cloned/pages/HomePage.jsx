import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../ClonedAuthContext';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import BottomNav from '../components/BottomNav';
import { Plus, MapPin, User, Clock, MessageCircle, Image as ImageIcon, MessageSquare, Send, X, Filter, Info, ExternalLink, Lock, Utensils, Scale, Heart, Home as HomeIcon, Briefcase, GraduationCap, Users, Shirt, Armchair, Car, Wrench, Sparkles, Baby, Flower2, Monitor, Package, Search, ChevronLeft, ChevronRight, Building2, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';

const RESOURCES_INFO = {
  work: {
    icon: '💼',
    title: 'Recursos para Emprego',
    items: [
      { name: 'France Travail', desc: 'Serviço público para encontrar emprego', link: 'https://www.francetravail.fr' },
      { name: 'ENIC-NARIC', desc: 'Reconhecimento de diplomas', link: 'https://www.france-education-international.fr' },
      { name: 'Mission Locale', desc: 'Para jovens 16-25 anos' }
    ]
  },
  housing: {
    icon: '🏠',
    title: 'Recursos para Moradia',
    items: [
      { name: 'SAMU Social - 115', desc: 'Emergência 24/7 gratuito', urgent: true },
      { name: 'Logement Social (HLM)', desc: 'Aluguel adaptado aos rendimentos', link: 'https://www.demande-logement-social.gouv.fr' },
      { name: 'France Terre d\'Asile', desc: '24 Rue Marc Seguin, 75018 Paris • 01 53 04 39 99' }
    ]
  },
  legal: {
    icon: '⚖️',
    title: 'Assistência Jurídica',
    items: [
      { name: 'La Cimade', desc: 'Assistência jurídica gratuita • 176 Rue de Grenelle, 75007 Paris' },
      { name: 'GISTI', desc: 'Direitos dos estrangeiros • 3 Villa Marcès, 75011 Paris' },
      { name: 'OFPRA', desc: 'Asilo e proteção' }
    ]
  },
  health: {
    icon: '🏥',
    title: 'Recursos de Saúde',
    items: [
      { name: 'SAMU - 15', desc: 'Emergências médicas', urgent: true },
      { name: 'PASS', desc: 'Atendimento gratuito • Hôpital Saint-Louis' },
      { name: 'AME', desc: 'Cobertura de saúde gratuita' }
    ]
  },
  food: {
    icon: '🍽️',
    title: 'Alimentação',
    items: [
      { name: 'Restaurants du Cœur', desc: 'Refeições gratuitas • 42 Rue Championnet, 75018' },
      { name: 'Secours Catholique', desc: 'Distribuição de alimentos • 15 Rue de Maubeuge, 75009' },
      { name: 'Croix-Rouge', desc: 'Alimentos e produtos básicos' }
    ]
  },
  education: {
    icon: '📚',
    title: 'Educação',
    items: [
      { name: 'CASNAV', desc: 'Escolarização de crianças • 12 Boulevard d\'Indochine, 75019' },
      { name: 'Universidades', desc: 'Programas especiais para refugiados' },
      { name: 'ENIC-NARIC', desc: 'Validação de diplomas' }
    ]
  },
  social: {
    icon: '🤝',
    title: 'Apoio Social',
    items: [
      { name: 'Emmaüs Solidarité', desc: 'Apoio social • 4 Rue des Amandiers, 75020' },
      { name: 'CAF', desc: 'Ajuda financeira', link: 'https://www.caf.fr' },
      { name: 'France Bénévolat', desc: 'Voluntariado' }
    ]
  },
  clothes: {
    icon: '👕',
    title: 'Roupas',
    items: [
      { name: 'Croix-Rouge Vestiaire', desc: 'Roupas gratuitas • 43 Rue de Valmy, 93100' },
      { name: 'Emmaüs', desc: 'Roupas e calçados a preços baixos' },
      { name: 'Secours Catholique', desc: 'Vestiários sociais' }
    ]
  },
  furniture: {
    icon: '🪑',
    title: 'Móveis',
    items: [
      { name: 'Emmaüs', desc: 'Móveis acessíveis' },
      { name: 'Ressourceries', desc: 'Móveis de segunda mão' },
      { name: 'Donnons.org', desc: 'Doações online', link: 'https://donnons.org' }
    ]
  },
  transport: {
    icon: '🚗',
    title: 'Transporte',
    items: [
      { name: 'Navigo', desc: 'Tarifas reduzidas disponíveis' },
      { name: 'Mob\'In France', desc: 'Formação para carteira de motorista' },
      { name: 'Vélib\'', desc: 'Bicicletas públicas' }
    ]
  }
};

export default function HomePage() {
  const { user, token } = useContext(AuthContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showResourcesModal, setShowResourcesModal] = useState(false);
  const [selectedResourceCategory, setSelectedResourceCategory] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  
  // Estados para o fluxo de emprego estilo LinkedIn
  const [jobSearchStep, setJobSearchStep] = useState(0); // 0: categoria, 1: busca emprego, 2: detalhes
  const [jobSearchQuery, setJobSearchQuery] = useState('');
  const [jobSearchLocation, setJobSearchLocation] = useState('');
  const [jobSearchResults, setJobSearchResults] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  
  // Vagas personalizadas do usuário
  const [personalizedJobs, setPersonalizedJobs] = useState([]);
  const [jobPreferences, setJobPreferences] = useState(null);
  
  const [newPost, setNewPost] = useState({
    type: user?.role === 'migrant' ? 'need' : 'offer',
    category: 'food',
    title: '',
    description: '',
    images: [],
    location: null,
    // Campos extras para emprego
    job_languages: [],
    job_availability: '',
    job_experience: '',
    job_looking_for: '',
    job_types: [],
    job_search_query: '',
    job_search_location: ''
  });
  const [showComments, setShowComments] = useState({});
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState('');
  const [commentingOn, setCommentingOn] = useState(null);
  const [advertisements, setAdvertisements] = useState([]);

  const categories = [
    { value: 'food', label: t('food'), color: 'bg-green-100 text-green-700 border-green-200', icon: Utensils },
    { value: 'legal', label: t('legal'), color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Scale },
    { value: 'health', label: t('health'), color: 'bg-red-100 text-red-700 border-red-200', icon: Heart },
    { value: 'housing', label: t('housing'), color: 'bg-orange-100 text-orange-700 border-orange-200', icon: HomeIcon },
    { value: 'work', label: t('work'), color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Briefcase },
    { value: 'education', label: t('education'), color: 'bg-orange-100 text-orange-700 border-orange-200', icon: GraduationCap },
    { value: 'social', label: t('social'), color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Users },
    { value: 'clothes', label: t('clothes'), color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Shirt },
    { value: 'furniture', label: t('furniture'), color: 'bg-teal-100 text-teal-700 border-teal-200', icon: Armchair },
    { value: 'transport', label: t('transport'), color: 'bg-cyan-100 text-cyan-700 border-cyan-200', icon: Car }
  ];

  useEffect(() => {
    fetchPosts();
    fetchAdvertisements();
    fetchPersonalizedJobs();
  }, []);

  // Auto-open SOS modal when navigated via BottomNav floating "+"
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('openSOS') === '1' && user?.role === 'migrant') {
      setShowCreatePost(true);
      // Clean the URL so refreshing won't re-open
      navigate('/home', { replace: true });
    }
  }, [location.search, user, navigate]);

  useEffect(() => {
    filterPosts();
  }, [posts, categoryFilter, typeFilter]);

  // Buscar vagas personalizadas do usuário
  const fetchPersonalizedJobs = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ""}/api/user/personalized-jobs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPersonalizedJobs(data.jobs || []);
        setJobPreferences(data.preferences || null);
      }
    } catch (error) {
      console.error('Error fetching personalized jobs:', error);
    }
  };

  const fetchAdvertisements = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ""}/api/sidebar-content`);
      if (response.ok) {
        const data = await response.json();
        setAdvertisements(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching sidebar content:', error);
    }
  };

  const syncJobsToFeed = async () => {
    try {
      // Sincronizar vagas de emprego para o feed automaticamente
      await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ""}/api/jobs/auto-post?limit=5`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Error syncing jobs to feed:', error);
    }
  };

  // Mapeamento de termos de busca Português → Francês
  const jobSearchTranslations = {
    // Profissões
    'garçom': 'serveur',
    'garcom': 'serveur',
    'garçon': 'serveur',
    'garconete': 'serveuse',
    'garçonete': 'serveuse',
    'cozinheiro': 'cuisinier',
    'cozinha': 'cuisine',
    'chef': 'chef cuisinier',
    'limpeza': 'nettoyage',
    'faxineiro': 'agent de nettoyage',
    'faxineira': 'agent de nettoyage',
    'construção': 'construction',
    'pedreiro': 'maçon',
    'pintor': 'peintre',
    'eletricista': 'électricien',
    'encanador': 'plombier',
    'motorista': 'chauffeur',
    'entregador': 'livreur',
    'entrega': 'livraison',
    'babá': 'nounou',
    'baba': 'nounou',
    'cuidador': 'aide-soignant',
    'cuidadora': 'aide-soignante',
    'jardineiro': 'jardinier',
    'jardinagem': 'jardinage',
    'segurança': 'agent de sécurité',
    'porteiro': 'gardien',
    'recepcionista': 'réceptionniste',
    'vendedor': 'vendeur',
    'vendedora': 'vendeuse',
    'caixa': 'caissier',
    'atendente': 'employé',
    'auxiliar': 'assistant',
    'ajudante': 'aide',
    'operador': 'opérateur',
    'montador': 'monteur',
    'mecânico': 'mécanicien',
    'mecanico': 'mécanicien',
    'padeiro': 'boulanger',
    'açougueiro': 'boucher',
    'acougueiro': 'boucher',
    'carpinteiro': 'charpentier',
    'soldador': 'soudeur',
    'técnico': 'technicien',
    'tecnico': 'technicien',
    'enfermeiro': 'infirmier',
    'enfermeira': 'infirmière',
    'professor': 'professeur',
    'professora': 'professeur',
    'secretário': 'secrétaire',
    'secretaria': 'secrétaire',
    'contador': 'comptable',
    'advogado': 'avocat',
    'programador': 'développeur',
    'desenvolvedor': 'développeur',
    'designer': 'designer',
    'marketing': 'marketing',
    'vendas': 'vente',
    'administrativo': 'administratif',
    'logística': 'logistique',
    'logistica': 'logistique',
    'armazém': 'entrepôt',
    'armazem': 'entrepôt',
    'estoque': 'stock',
    'empilhadeira': 'cariste',
    'carregador': 'manutentionnaire',
    'mudança': 'déménagement',
    'mudanca': 'déménagement',
    'hotel': 'hôtel',
    'restaurante': 'restaurant',
    'bar': 'bar',
    'café': 'café',
    'padaria': 'boulangerie',
    'supermercado': 'supermarché',
    'loja': 'magasin',
    'escritório': 'bureau',
    'escritorio': 'bureau',
    'fábrica': 'usine',
    'fabrica': 'usine',
    'obra': 'chantier',
    'hospital': 'hôpital',
    'clínica': 'clinique',
    'clinica': 'clinique',
    'escola': 'école',
    'creche': 'crèche'
  };

  // Função para traduzir termo de busca
  const translateSearchTerm = (term) => {
    const lowerTerm = term.toLowerCase().trim();
    // Verificar tradução direta
    if (jobSearchTranslations[lowerTerm]) {
      return jobSearchTranslations[lowerTerm];
    }
    // Verificar se contém algum termo conhecido
    for (const [pt, fr] of Object.entries(jobSearchTranslations)) {
      if (lowerTerm.includes(pt)) {
        return lowerTerm.replace(pt, fr);
      }
    }
    return term; // Retorna original se não encontrar tradução
  };

  // Função para buscar vagas de emprego (estilo LinkedIn)
  const searchJobsForUser = async () => {
    if (!jobSearchQuery.trim()) {
      toast.error('Digite o que você procura');
      return;
    }
    
    setLoadingJobs(true);
    try {
      const location = jobSearchLocation || 'France';
      // Traduzir termo de busca para francês
      const translatedQuery = translateSearchTerm(jobSearchQuery);
      
      const response = await fetch(
        `${import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ""}/api/jobs/search?query=${encodeURIComponent(translatedQuery)}&location=${encodeURIComponent(location)}&page=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        setJobSearchResults(data.jobs || []);
        
        // Atualizar os dados do post com a busca (manter termo original em português)
        setNewPost(prev => ({
          ...prev,
          job_search_query: jobSearchQuery,
          job_search_location: location,
          title: `Procuro emprego: ${jobSearchQuery}`,
          description: `Estou procurando oportunidades de emprego na área de ${jobSearchQuery}${location ? ` em ${location}` : ''}.`
        }));
        
        // Avançar para a próxima etapa
        setJobSearchStep(2);
      }
    } catch (error) {
      console.error('Error searching jobs:', error);
      toast.error('Erro ao buscar vagas');
    } finally {
      setLoadingJobs(false);
    }
  };

  // Resetar fluxo de emprego quando fechar modal
  const handleCloseCreatePost = (open) => {
    setShowCreatePost(open);
    if (!open) {
      setJobSearchStep(0);
      setJobSearchQuery('');
      setJobSearchLocation('');
      setJobSearchResults([]);
    }
  };

  const filterPosts = () => {
    let filtered = posts;
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }
    
    if (typeFilter !== 'all') {
      if (typeFilter === 'job') {
        filtered = filtered.filter(p => p.type === 'job' || p.is_job_post);
      } else {
        filtered = filtered.filter(p => p.type === typeFilter);
      }
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
        setPosts(data.filter(p => !p.is_auto_response));
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPost = async () => {
    // Para posts de busca de emprego, salvar preferências e NÃO criar post
    if (newPost.category === 'work' && jobSearchStep === 2 && jobSearchQuery) {
      try {
        // Salvar preferências de emprego do usuário
        const prefsResponse = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ""}/api/user/job-preferences`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            search_query: jobSearchQuery,
            search_location: jobSearchLocation || 'França',
            availability: newPost.job_availability,
            experience: newPost.job_experience
          })
        });

        if (prefsResponse.ok) {
          toast.success('🔔 Pronto! Vagas personalizadas no seu feed.');
          toast.info(`Mostrando vagas de "${jobSearchQuery}" para você!`, { duration: 4000 });
          handleCloseCreatePost(false);
          // Recarregar feed para mostrar vagas personalizadas
          fetchPosts();
          fetchPersonalizedJobs();
        }
      } catch (error) {
        toast.error('Erro ao salvar preferências');
      }
      return;
    }

    // Post normal
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
        if (newPost.type === 'need') {
          toast.info('📩 Verifique suas mensagens para recursos úteis!', { duration: 5000 });
        }
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
      toast.info('Obtendo localização...');
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
        (error) => {
          console.error('Geolocation error:', error);
          if (error.code === 1) {
            toast.error('Permissão de localização negada. Ative nas configurações do navegador.');
          } else if (error.code === 2) {
            toast.error('Localização indisponível. Verifique sua conexão.');
          } else if (error.code === 3) {
            toast.error('Tempo esgotado ao obter localização. Tente novamente.');
          } else {
            toast.error('Erro ao obter localização. Tente novamente.');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    } else {
      toast.error('Seu navegador não suporta geolocalização');
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

  const openResourcesModal = (category) => {
    setSelectedResourceCategory(category);
    setShowResourcesModal(true);
  };

  const getCategoryStyle = (category) => {
    return categories.find(c => c.value === category)?.color || 'bg-gray-100 text-gray-700';
  };

  const getCategoryIcon = (category) => {
    const cat = categories.find(c => c.value === category);
    if (cat && cat.icon) {
      const IconComponent = cat.icon;
      return <IconComponent size={14} />;
    }
    return <Filter size={14} />;
  };

  return (
    <div
      className="min-h-screen bg-gray-50 pb-20"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}
      data-testid="home-page"
    >
      {/* Jataí-Style Top Brand Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-[1200px] mx-auto px-3 lg:px-4 py-2">
          <div className="flex items-center justify-between gap-2">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-orange-400 text-white font-bold text-sm">
                W
              </div>
              <span className="text-base font-bold">
                <span className="text-green-500">Wati</span>
                <span className="text-orange-500">zat</span>
              </span>
              <p className="hidden lg:block text-[10px] text-gray-500 ml-1">{t('landingTagline') || 'Apoio Solidário'}</p>
            </div>

            {/* Emergency quick-actions + Avatar (right corner) */}
            <div className="flex items-center gap-1.5">
              <a
                href="tel:112"
                className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-full text-xs shadow"
                data-testid="emergency-sos-link"
              >
                🆘 SOS
              </a>
              <a
                href="https://wa.me/5514996078465?text=Olá! Preciso de ajuda."
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-full text-xs shadow"
              >
                💬 {t('talkToMe')}
              </a>
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-orange-400 text-white font-bold overflow-hidden ml-1"
                data-testid="brand-avatar"
                aria-label="Perfil"
              >
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  user?.name?.charAt(0)?.toUpperCase() || 'W'
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Premium / Welcome Banner (Jataí-style) */}
      <div className="bg-gradient-to-r from-orange-100 to-orange-200 px-4 py-3">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs sm:text-sm text-gray-800 font-medium text-center sm:text-left">
            ✨ Bem-vindo{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! Conectando você à comunidade solidária.
          </p>
          <Button
            onClick={() => navigate('/housing')}
            className="bg-white hover:bg-gray-50 text-gray-800 font-semibold rounded-full px-5 h-8 text-xs shadow-sm"
            data-testid="banner-housing-btn"
          >
            🏡 {t('solidaryHousing') || 'Moradia Solidária'}
          </Button>
        </div>
      </div>

      {/* Filters area */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3 max-w-[1200px]">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-base sm:text-lg font-bold text-gray-900">{t('feedTitle') || 'Feed'}</h1>
          </div>
          
          {/* Categorias com ícones visuais */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`flex flex-col items-center gap-1 min-w-[55px] p-2 rounded-xl transition-all flex-shrink-0 ${
                categoryFilter === 'all'
                  ? 'bg-green-500 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Filter size={18} />
              <span className="text-[10px] font-medium">{t('allFilter')}</span>
            </button>
            {categories.map(cat => {
              const IconComponent = cat.icon;
              return (
                <button
                  key={cat.value}
                  onClick={() => setCategoryFilter(cat.value)}
                  className={`flex flex-col items-center gap-1 min-w-[55px] p-2 rounded-xl transition-all flex-shrink-0 ${
                    categoryFilter === cat.value
                      ? 'bg-green-500 text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <IconComponent size={18} />
                  <span className="text-[10px] font-medium whitespace-nowrap">{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Filtro de Tipo */}
          <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0 ${
                typeFilter === 'all'
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {t('allFilter')}
            </button>
            <button
              onClick={() => setTypeFilter('need')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0 flex items-center gap-1 ${
                typeFilter === 'need'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-green-50'
              }`}
            >
              🆘 {t('needsHelpFilter')}
            </button>
            <button
              onClick={() => setTypeFilter('offer')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0 flex items-center gap-1 ${
                typeFilter === 'offer'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-blue-50'
              }`}
            >
              🤝 {t('offersHelpFilter')}
            </button>
            <button
              onClick={() => setTypeFilter('job')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0 flex items-center gap-1 ${
                typeFilter === 'job'
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-orange-50'
              }`}
            >
              💼 {t('jobVacancies')}
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 max-w-6xl overflow-x-hidden">
        <div className="flex gap-6">
          {/* Sidebar Esquerda - Anúncios do Dashboard */}
          <div className="hidden lg:block w-80 flex-shrink-0 space-y-4">
            {/* Header da Sidebar */}
            <div className="bg-gradient-to-r from-blue-600 to-orange-600 text-white rounded-2xl p-4 shadow-lg">
              <h3 className="font-bold text-sm">📢 {t('advertisementsTitle')}</h3>
              <p className="text-xs text-white/80 mt-1">{t('jobsAndMessagesDesc')}</p>
            </div>

            {/* Renderizar anúncios */}
            {advertisements.length > 0 ? (
              advertisements.map((item, idx) => {
                // Vaga de Emprego
                if (item.type === 'job' || item.item_type === 'job') {
                  return (
                    <div key={item.id || idx} className="bg-white rounded-2xl shadow-md overflow-hidden border border-blue-100 hover:shadow-lg transition-all">
                      {item.image_url && (
                        <img 
                          src={item.image_url} 
                          alt={item.title} 
                          className="w-full h-28 object-cover"
                        />
                      )}
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold px-2 py-1 bg-blue-600 text-white rounded-full">💼 VAGA</span>
                          {item.source && (
                            <span className="text-xs text-blue-600">{item.source}</span>
                          )}
                        </div>
                        <h3 className="font-bold text-sm text-gray-800 mb-1 line-clamp-2">{item.title}</h3>
                        <p className="text-xs text-gray-600 mb-3 line-clamp-2">{item.content}</p>
                        {item.link_url && (
                          <a 
                            href={item.link_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block w-full text-center py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors"
                          >
                            {item.link_text || t('viewJob')} →
                          </a>
                        )}
                      </div>
                    </div>
                  );
                }
                
                // Anúncio de Doação
                if (item.type === 'donation') {
                  return (
                    <div key={item.id || idx} className="bg-white rounded-2xl shadow-md overflow-hidden border border-orange-100">
                      {item.image_url && (
                        <img 
                          src={item.image_url} 
                          alt={item.title} 
                          className="w-full h-32 object-cover"
                        />
                      )}
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold px-2 py-1 bg-orange-500 text-white rounded-full">❤️ DOAÇÃO</span>
                        </div>
                        <h3 className="font-bold text-sm text-gray-800 mb-2">{item.title}</h3>
                        <p className="text-xs text-gray-600 leading-relaxed mb-3">{item.content}</p>
                        {item.link_url && (
                          <a 
                            href={item.link_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block w-full text-center py-2 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-sm transition-colors"
                          >
                            {item.link_text || t('donateNow')} →
                          </a>
                        )}
                      </div>
                    </div>
                  );
                }
                
                // Mensagem de Motivação ou outro tipo
                return (
                  <div key={item.id || idx} className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">
                    {item.image_url && (
                      <img 
                        src={item.image_url} 
                        alt={item.title} 
                        className="w-full h-28 object-cover"
                      />
                    )}
                    <div className="p-4">
                      <h3 className="font-bold text-sm text-gray-800 mb-2">{item.title}</h3>
                      <p className="text-xs text-gray-600 leading-relaxed">{item.content}</p>
                      {item.link_url && (
                        <a 
                          href={item.link_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block w-full text-center py-2 px-4 mt-3 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-xl text-sm transition-colors"
                        >
                          {item.link_text || t('learnMore')} →
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white rounded-2xl p-6 text-center border border-gray-200">
                <p className="text-gray-500 text-sm">{t('noAdsMessage')}</p>
                <p className="text-xs text-gray-400 mt-1">{t('comeBackLater')}</p>
              </div>
            )}

            {/* Link para mais vagas */}
            <a 
              href="https://rozgarline.me/jobs/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block bg-gradient-to-r from-blue-500 to-orange-600 text-white rounded-2xl p-4 text-center hover:shadow-lg transition-all"
            >
              <span className="font-bold">🔍 {t('viewAllJobsLink')}</span>
              <p className="text-xs text-white/80 mt-1">{t('accessMoreOpportunities')}</p>
            </a>
          </div>

          {/* Conteúdo Principal - Feed */}
          <div className="flex-1 max-w-2xl">

        {/* Botão para Migrantes - Abre modal */}
        {user?.role === 'migrant' ? (
          <Dialog open={showCreatePost} onOpenChange={handleCloseCreatePost}>
            <DialogTrigger asChild>
              <Button 
                data-testid="create-post-button"
                className="w-full rounded-full py-6 mb-6 bg-green-500 hover:bg-green-600 text-white font-bold shadow-lg"
              >
                <Plus size={20} className="mr-2" />
                🆘 {t('iNeedHelpBtn')}
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl max-w-2xl mx-2 sm:mx-4 p-0 max-h-[90vh] overflow-y-auto" data-testid="create-post-dialog">
              <div className="flex flex-col">
                
                {/* ETAPA 0: Seleção de Categoria */}
                {jobSearchStep === 0 && (
                  <>
                    <DialogHeader className="p-4 sm:p-6 pb-4 border-b flex-shrink-0">
                      <DialogTitle className="text-xl sm:text-2xl font-heading">
                        🆘 {t('iNeedHelpBtn')}
                      </DialogTitle>
                      <DialogDescription className="text-sm">
                        {t('whatDoYouNeed')}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                      <div className="space-y-4">
                        <Label className="text-sm sm:text-base font-bold block">📂 {t('selectCategoryLabel')}</Label>
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                          {categories.map(cat => (
                            <button
                              key={cat.value}
                              type="button"
                              onClick={() => {
                                // Se for moradia, redirecionar para página de hospedagem
                                if (cat.value === 'housing') {
                                  setShowCreatePost(false);
                                  navigate('/housing');
                                  return;
                                }
                                setNewPost({...newPost, category: cat.value});
                                // Se for trabalho, ir para etapa de busca
                                if (cat.value === 'work') {
                                  setJobSearchStep(1);
                                }
                              }}
                              className={`p-3 sm:p-4 rounded-xl border-2 transition-all text-left ${
                                newPost.category === cat.value
                                  ? 'bg-primary text-white border-primary shadow-lg scale-105'
                                  : 'bg-white border-gray-200 hover:border-primary hover:shadow-md'
                              }`}
                            >
                              <cat.icon size={20} className="mb-1 sm:mb-2" />
                              <div className={`font-bold text-xs sm:text-sm ${newPost.category === cat.value ? 'text-white' : 'text-textPrimary'}`}>
                                {cat.label}
                              </div>
                            </button>
                          ))}
                        </div>
                        
                        {/* Se não for trabalho ou moradia, mostrar formulário padrão */}
                        {newPost.category && newPost.category !== 'work' && newPost.category !== 'housing' && (
                          <div className="mt-6 space-y-4">
                            {/* Título */}
                            <div className="bg-white border-2 border-gray-200 p-4 rounded-2xl">
                              <Label className="text-sm font-bold mb-2 block">✏️ {t('requestTitleLabel')}</Label>
                              <Input
                                data-testid="post-title-input"
                                value={newPost.title}
                                onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                                placeholder={t('postTitlePlaceholder')}
                                className="rounded-xl h-11 text-sm w-full"
                              />
                            </div>
                            
                            {/* Descrição */}
                            <div className="bg-white border-2 border-gray-200 p-4 rounded-2xl">
                              <Label className="text-sm font-bold mb-2 block">📝 {t('detailsLabel')}</Label>
                              <Textarea
                                data-testid="post-description-input"
                                value={newPost.description}
                                onChange={(e) => setNewPost({...newPost, description: e.target.value})}
                                rows={4}
                                placeholder={t('describeInDetail')}
                                className="rounded-xl text-sm"
                              />
                            </div>

                            {/* Fotos */}
                            <div className="bg-white border-2 border-gray-200 p-4 rounded-2xl">
                              <Label className="text-sm font-bold mb-2 block">📸 {t('addPhotos')} <span className="text-gray-400 font-normal text-xs">(opcional)</span></Label>

                              {newPost.images && newPost.images.length > 0 && (
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                  {newPost.images.map((img, idx) => (
                                    <div key={idx} className="relative aspect-square bg-gray-50 rounded-lg overflow-hidden border border-gray-200" data-testid={`post-photo-preview-${idx}`}>
                                      <img src={img} alt="Preview" className="w-full h-full object-cover" />
                                      <button
                                        type="button"
                                        onClick={() => removeImage(idx)}
                                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600"
                                        data-testid={`remove-post-photo-${idx}`}
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {(!newPost.images || newPost.images.length < 3) && (
                                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors" data-testid="post-photo-upload-label">
                                  <Camera size={28} className="text-gray-400 mb-2" />
                                  <span className="text-sm text-gray-600 font-medium">{t('addPhotos')}</span>
                                  <span className="text-xs text-gray-400 mt-1">Máx. 3 fotos · 5MB cada</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    data-testid="post-photo-input"
                                  />
                                </label>
                              )}
                            </div>
                            
                            {/* Botão Publicar */}
                            <Button 
                              data-testid="submit-post-button"
                              onClick={createPost} 
                              className="w-full rounded-full py-5 text-base font-bold bg-primary hover:bg-primary-hover shadow-lg"
                            >
                              📢 {t('publishNowBtn')}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* ETAPA 1: Busca de Emprego (Estilo LinkedIn) */}
                {jobSearchStep === 1 && (
                  <>
                    <DialogHeader className="p-4 sm:p-6 pb-4 border-b flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setJobSearchStep(0)}
                          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <div>
                          <DialogTitle className="text-xl sm:text-2xl font-heading flex items-center gap-2">
                            💼 {t('searchForJob')}
                          </DialogTitle>
                          <DialogDescription className="text-sm">
                            {t('likeLinkedIn')}
                          </DialogDescription>
                        </div>
                      </div>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                      <div className="space-y-5">
                        {/* Ilustração */}
                        <div className="bg-gradient-to-br from-blue-500 to-orange-600 rounded-2xl p-6 text-white text-center">
                          <Search size={48} className="mx-auto mb-3 opacity-90" />
                          <h3 className="text-lg font-bold mb-1">{t('findYourOpportunityTitle')}</h3>
                          <p className="text-sm text-white/80">{t('searchJobsProfileDesc')}</p>
                        </div>
                        
                        {/* Campo de Busca - O que procura */}
                        <div className="bg-white border-2 border-gray-200 p-4 rounded-2xl">
                          <Label className="text-sm font-bold mb-2 block flex items-center gap-2">
                            <Search size={18} className="text-blue-600" />
                            {t('whatAreYouLookingForJob')}
                          </Label>
                          <Input
                            value={jobSearchQuery}
                            onChange={(e) => setJobSearchQuery(e.target.value)}
                            placeholder={`Ex: ${t('waiter')}, ${t('cleaning')}, ${t('cook')}...`}
                            className="rounded-xl h-12 text-base w-full"
                            onKeyPress={(e) => e.key === 'Enter' && searchJobsForUser()}
                          />
                          <p className="text-xs text-gray-500 mt-1">💡 {t('typeInPortuguese')}</p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {[t('waiter'), t('cook'), t('cleaning'), t('driver'), t('construction'), t('salesperson'), t('cashier'), t('deliveryPerson')].map(tag => (
                              <button
                                key={tag}
                                onClick={() => setJobSearchQuery(tag)}
                                className="px-3 py-1.5 bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 rounded-full text-xs font-medium transition-colors"
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Campo de Localização */}
                        <div className="bg-white border-2 border-gray-200 p-4 rounded-2xl">
                          <Label className="text-sm font-bold mb-2 block flex items-center gap-2">
                            <MapPin size={18} className="text-red-500" />
                            {t('location')}
                          </Label>
                          <Input
                            value={jobSearchLocation}
                            onChange={(e) => setJobSearchLocation(e.target.value)}
                            placeholder="Ex: Paris, Lyon, Marseille..."
                            className="rounded-xl h-12 text-base w-full"
                          />
                          <div className="flex flex-wrap gap-2 mt-3">
                            {['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice'].map(city => (
                              <button
                                key={city}
                                onClick={() => setJobSearchLocation(city)}
                                className="px-3 py-1.5 bg-gray-100 hover:bg-red-100 text-gray-700 hover:text-red-700 rounded-full text-xs font-medium transition-colors"
                              >
                                📍 {city}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Botão de Buscar */}
                        <Button 
                          onClick={searchJobsForUser}
                          disabled={loadingJobs || !jobSearchQuery.trim()}
                          className="w-full rounded-full py-5 text-base font-bold bg-blue-600 hover:bg-blue-700 shadow-lg"
                        >
                          {loadingJobs ? (
                            <span className="flex items-center gap-2">
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              {t('searchingJobsText')}
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <Search size={20} />
                              {t('searchJobsCreateProfileBtn')}
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {/* ETAPA 2: Resultados e Confirmação do Perfil */}
                {jobSearchStep === 2 && (
                  <>
                    <DialogHeader className="p-4 sm:p-6 pb-4 border-b flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setJobSearchStep(1)}
                          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <div>
                          <DialogTitle className="text-lg sm:text-xl font-heading">
                            🎯 {t('jobsFoundTitle')}
                          </DialogTitle>
                          <DialogDescription className="text-xs sm:text-sm">
                            {jobSearchResults.length} {t('jobVacancies').toLowerCase()} &ldquo;{jobSearchQuery}&rdquo; - {jobSearchLocation || 'France'}
                          </DialogDescription>
                        </div>
                      </div>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6" style={{maxHeight: 'calc(85vh - 120px)', overflowY: 'auto'}}>
                      <div className="space-y-4">
                        {/* Card do Perfil RESUMIDO que será publicado */}
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 p-4 rounded-2xl">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                              <User size={20} className="text-white" />
                            </div>
                            <div>
                              <p className="font-bold text-sm text-green-800">{t('yourFeedProfileTitle')}</p>
                              <p className="text-xs text-green-600">{t('summarizedDirectTitle')}</p>
                            </div>
                          </div>
                          <div className="bg-white rounded-xl p-3 space-y-1">
                            <p className="font-bold text-sm text-gray-800">🔍 {t('lookingForLabel')}: {jobSearchQuery}</p>
                            <p className="text-xs text-gray-600">📍 {jobSearchLocation || 'France'}</p>
                            {newPost.job_availability && (
                              <p className="text-xs text-gray-600">⏰ {
                                newPost.job_availability === 'full_time' ? t('fullTimeOption') :
                                newPost.job_availability === 'part_time' ? t('partTimeOption') :
                                newPost.job_availability === 'flexible' ? t('flexibleOption') : t('weekendsOption')
                              }</p>
                            )}
                            {newPost.job_experience && (
                              <p className="text-xs text-gray-600">📋 {
                                newPost.job_experience === 'none' ? t('noExperienceOption') :
                                newPost.job_experience === '1year' ? t('oneYearOption') :
                                newPost.job_experience === '2years' ? t('twoYearsPlusOption') : t('fiveYearsPlusOption')
                              }</p>
                            )}
                          </div>
                        </div>
                        
                        {/* Informações Adicionais */}
                        <div className="bg-white border-2 border-gray-200 p-4 rounded-2xl space-y-3">
                          <Label className="text-sm font-bold block">📋 {t('completeYourProfileTitle')}</Label>
                          
                          {/* Experiência */}
                          <div>
                            <Label className="text-xs text-gray-600 mb-1 block">{t('experienceLabel')}</Label>
                            <Select value={newPost.job_experience} onValueChange={(val) => setNewPost({...newPost, job_experience: val})}>
                              <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder={t('select')} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">{t('noExperienceOption')}</SelectItem>
                                <SelectItem value="1year">{t('oneYearOption')}</SelectItem>
                                <SelectItem value="2years">{t('twoYearsPlusOption')}</SelectItem>
                                <SelectItem value="5years">{t('fiveYearsPlusOption')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Disponibilidade */}
                          <div>
                            <Label className="text-xs text-gray-600 mb-1 block">{t('availabilityLabel')}</Label>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { value: 'full_time', label: t('fullTimeOption') },
                                { value: 'part_time', label: t('partTimeOption') },
                                { value: 'flexible', label: t('flexibleOption') },
                                { value: 'weekends', label: t('weekendsOption') }
                              ].map(opt => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => setNewPost({...newPost, job_availability: opt.value})}
                                  className={`p-2 rounded-xl text-xs font-medium transition-all ${
                                    newPost.job_availability === opt.value
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        {/* Vagas Encontradas - Mostrar TODAS como na página de trabalho */}
                        {jobSearchResults.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between sticky top-0 bg-white py-2 z-10">
                              <div className="flex items-center gap-2">
                                <Label className="text-sm font-bold flex items-center gap-2">
                                  💼 {t('jobsAvailableTitle')} 
                                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                                    {jobSearchResults.length}
                                  </span>
                                </Label>
                              </div>
                              <span className="text-xs text-gray-400">{t('scrollToSeeMoreJobs')} ↓</span>
                            </div>
                            <div className="space-y-2 overflow-y-auto pr-1" style={{maxHeight: '350px'}}>
                              {jobSearchResults.map((job, idx) => (
                                <a 
                                  key={idx}
                                  href={job.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all"
                                >
                                  <div className="flex items-start gap-3">
                                    {job.company_logo ? (
                                      <img 
                                        src={job.company_logo} 
                                        alt={job.company}
                                        className="w-12 h-12 rounded-lg object-contain bg-gray-50 flex-shrink-0"
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                      />
                                    ) : (
                                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                                        <Building2 size={24} className="text-white" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="font-bold text-sm text-gray-800 line-clamp-2">{job.title}</p>
                                      <p className="text-xs text-gray-600 mt-0.5">🏢 {job.company}</p>
                                      <p className="text-xs text-gray-500">📍 {job.location}</p>
                                      {job.salary_min && (
                                        <p className="text-xs text-green-600 font-medium mt-1">
                                          💰 {job.salary_min}{job.salary_max ? `-${job.salary_max}` : ''} {job.salary_currency || 'EUR'}
                                        </p>
                                      )}
                                      <div className="flex items-center gap-2 mt-2">
                                        {job.is_remote && (
                                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                                            🏠 {t('remoteTag')}
                                          </span>
                                        )}
                                        <span className="text-xs text-gray-400">
                                          {job.date_posted || t('recentTag')}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                      <ExternalLink size={16} className="text-blue-500" />
                                      <span className="text-xs text-blue-600 font-medium">{t('viewJob')}</span>
                                    </div>
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Mensagem se não encontrou vagas */}
                        {jobSearchResults.length === 0 && (
                          <div className="text-center py-6 bg-gray-50 rounded-xl">
                            <Search size={32} className="mx-auto text-gray-400 mb-2" />
                            <p className="text-sm text-gray-600">{t('noJobsFoundText')}</p>
                            <p className="text-xs text-gray-500 mt-1">{t('tryOtherTerms')}</p>
                          </div>
                        )}
                        
                        {/* Card de Alerta de Vagas */}
                        <div className="bg-gradient-to-r from-blue-500 to-orange-600 rounded-2xl p-4 text-white">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                              <span className="text-xl">🔔</span>
                            </div>
                            <div>
                              <p className="font-bold text-sm">{t('receiveJobsEveryDayText')}</p>
                              <p className="text-xs text-white/80">{t('newOpportunitiesText')}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Botão Receber Vagas */}
                        <Button 
                          onClick={createPost}
                          className="w-full rounded-full py-5 text-base font-bold bg-green-600 hover:bg-green-700 shadow-lg"
                        >
                          🔔 {t('receiveDailyJobsBtn')}
                        </Button>
                        
                        <p className="text-xs text-center text-gray-500">
                          {t('receivePersonalizedJobs')} &ldquo;{jobSearchQuery}&rdquo; {t('inYourFeed')}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
        </Dialog>
        ) : (
          /* Botão para Helpers/Admins - Redireciona para página Ajudar */
          <Button 
            data-testid="create-post-button"
            onClick={() => navigate('/volunteers')}
            className="w-full rounded-full py-6 mb-6 bg-primary hover:bg-primary-hover text-white font-bold shadow-lg"
          >
            <Users size={20} className="mr-2" />
            🤝 {t('iWantToHelpBtn')}
          </Button>
        )}

        {/* Modal de Recursos */}
        <Dialog open={showResourcesModal} onOpenChange={setShowResourcesModal}>
          <DialogContent className="rounded-3xl max-w-2xl max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-heading flex items-center gap-2">
                {selectedResourceCategory && RESOURCES_INFO[selectedResourceCategory]?.icon}
                {selectedResourceCategory && RESOURCES_INFO[selectedResourceCategory]?.title}
              </DialogTitle>
              <DialogDescription>
                Organizações e serviços que podem ajudar
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 overflow-y-auto max-h-[calc(85vh-140px)]">
              {selectedResourceCategory && RESOURCES_INFO[selectedResourceCategory]?.items.map((item, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 rounded-2xl border-2 ${item.urgent ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-lg text-textPrimary">{item.name}</h3>
                    {item.urgent && (
                      <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                        URGENTE
                      </span>
                    )}
                  </div>
                  <p className="text-textSecondary mb-2">{item.desc}</p>
                  {item.link && (
                    <a 
                      href={item.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary font-medium hover:underline"
                    >
                      <ExternalLink size={16} />
                      Acessar site
                    </a>
                  )}
                </div>
              ))}
              <div className="p-4 bg-blue-50 rounded-2xl border-2 border-blue-200">
                <p className="text-sm text-textSecondary">
                  <strong>💡 Dica:</strong> Visite{' '}
                  <a href="https://refugies.info" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    Refugies.info
                  </a>{' '}
                  para mais recursos e informações atualizadas.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {loading ? (
          <div className="text-center py-12 text-textMuted">{t('loading')}</div>
        ) : (
          <>
            {/* Vagas Personalizadas do Usuário */}
            {personalizedJobs.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💼</span>
                    <h3 className="font-bold text-sm text-gray-800">
                      {t('jobsForYouTitle')}
                      {jobPreferences?.query && (
                        <span className="ml-2 text-blue-600 font-normal">
                          ({jobPreferences.query})
                        </span>
                      )}
                    </h3>
                  </div>
                  <button
                    onClick={fetchPersonalizedJobs}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {t('update')}
                  </button>
                </div>
                
                <div className="space-y-3">
                  {personalizedJobs.slice(0, 5).map((job, idx) => (
                    <div
                      key={job.id || idx}
                      className="bg-white rounded-2xl p-4 shadow-card border border-blue-100 hover:border-blue-300 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        {job.company_logo ? (
                          <img
                            src={job.company_logo}
                            alt={job.company}
                            className="w-12 h-12 rounded-xl object-contain bg-gray-50 flex-shrink-0"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                            <Briefcase size={24} className="text-white" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-gray-800 line-clamp-2">{job.title}</h4>
                          <p className="text-xs text-gray-600 mt-0.5">🏢 {job.company}</p>
                          <p className="text-xs text-gray-500">📍 {job.location}</p>
                          {job.salary_min && (
                            <p className="text-xs text-green-600 font-medium mt-1">
                              💰 {job.salary_min}{job.salary_max ? `-${job.salary_max}` : ''} {job.salary_currency}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {job.is_remote && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                                🏠 {t('remoteTag')}
                              </span>
                            )}
                            <span className="text-xs text-gray-400">{job.date_posted}</span>
                          </div>
                        </div>
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-xl transition-colors flex items-center gap-1"
                        >
                          {t('viewJob')}
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  ))}
                  
                  {personalizedJobs.length > 5 && (
                    <button
                      onClick={() => navigate('/jobs')}
                      className="w-full py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-sm font-medium transition-colors"
                    >
                      {t('seeAllJobsCount')} ({personalizedJobs.length}) →
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Posts do Feed */}
            {filteredPosts.length === 0 && personalizedJobs.length === 0 ? (
              <div className="text-center py-12 text-textMuted" data-testid="no-posts-message">
                {categoryFilter !== 'all' || typeFilter !== 'all' ? t('noPostsFilter') : t('noPostsYet')}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <div 
                key={post.id} 
                data-testid="post-card"
                className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-card card-hover overflow-hidden max-w-full"
              >
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                      <User size={20} className="text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-textPrimary truncate">{post.user?.name}</p>
                      <p className="text-sm text-textMuted capitalize truncate">{post.user?.role}</p>
                    </div>
                  </div>
                  <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium border ${getCategoryStyle(post.category)} flex items-center gap-1 flex-shrink-0 whitespace-nowrap`}>
                    <span>{getCategoryIcon(post.category)}</span>
                    <span className="hidden sm:inline">{categories.find(c => c.value === post.category)?.label}</span>
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-textPrimary mb-2 break-words overflow-hidden">{post.title}</h3>
                
                {/* Descrição - Para vagas de emprego, mostrar sem a URL */}
                {post.is_job_post ? (
                  <div className="mb-3">
                    <p className="text-sm sm:text-base text-textSecondary leading-relaxed">
                      {post.job_company && <span className="font-medium">🏢 {post.job_company}</span>}
                    </p>
                    <p className="text-sm text-textSecondary mt-1 line-clamp-3">
                      {post.description?.split('🔗')[0]?.trim()}
                    </p>
                    {/* Botão para Ver Vaga */}
                    {post.job_url && (
                      <a 
                        href={post.job_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-colors"
                      >
                        💼 {t('viewFullJob')}
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-sm sm:text-base text-textSecondary mb-3 leading-relaxed overflow-hidden whitespace-pre-wrap" style={{wordBreak: 'break-word', overflowWrap: 'anywhere'}}>{post.description}</p>
                )}

                {/* Imagens - NÃO mostrar para posts de vagas de emprego */}
                {post.images && post.images.length > 0 && !post.is_job_post && (
                  <div className={`mb-3 ${post.images.length === 1 ? '' : 'grid grid-cols-2 gap-2'}`}>
                    {post.images.map((img, idx) => (
                      <div key={idx} className={`${post.images.length === 1 ? 'w-full' : ''} rounded-2xl overflow-hidden bg-gray-100`}>
                        <img 
                          src={img} 
                          alt="" 
                          className={`w-full ${post.images.length === 1 ? 'max-h-[500px] object-contain' : 'h-48 object-cover'} rounded-2xl`}
                          onClick={() => window.open(img, '_blank')}
                          style={{ cursor: 'pointer' }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {post.location && (
                  <div className="flex items-center gap-2 text-sm text-textMuted mb-3 p-2 bg-blue-50 rounded-lg">
                    <MapPin size={16} className="text-primary" />
                    <span>{post.location.address || 'Localização disponível'}</span>
                  </div>
                )}

                {/* Info do Post - Mobile Friendly */}
                <div className="border-t pt-3 mt-3 space-y-3">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-textMuted flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {new Date(post.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    {post.type === 'need' && !post.is_job_post && (
                      <span className="text-green-600 font-medium text-xs">Precisa de ajuda</span>
                    )}
                    {post.type === 'offer' && (
                      <span className="text-primary font-medium text-xs">Oferece ajuda</span>
                    )}
                    {post.is_job_post && (
                      <span className="text-blue-600 font-medium text-xs">💼 Vaga de Emprego</span>
                    )}
                  </div>
                  
                  {/* Botões em Grid Responsivo - NÃO mostrar para posts de vagas de emprego */}
                  {!post.is_job_post && (
                    <div className="grid grid-cols-2 sm:flex gap-2">
                      {post.type === 'need' && (
                        <Button
                          onClick={() => openResourcesModal(post.category)}
                          size="sm"
                          variant="outline"
                          className="rounded-full border-primary text-primary hover:bg-primary hover:text-white text-xs sm:text-sm px-3 py-2 w-full sm:w-auto"
                        >
                          <Info size={14} className="sm:mr-1" />
                          <span className="hidden sm:inline ml-1">{t('viewResources')}</span>
                          <span className="sm:hidden ml-1">{t('resources')}</span>
                        </Button>
                      )}
                      <Button
                        onClick={() => toggleComments(post.id)}
                        size="sm"
                        variant="outline"
                        className="rounded-full text-xs sm:text-sm px-3 py-2 w-full sm:w-auto"
                      >
                        <MessageSquare size={14} className="sm:mr-1" />
                        <span className="ml-1">{showComments[post.id] ? t('hideMap') : t('commentsBtn')}</span>
                      </Button>
                      {post.user_id !== user.id && post.can_help && (
                        <Button
                          onClick={() => navigate(`/direct-chat/${post.user_id}`)}
                          size="sm"
                          className="rounded-full bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm px-3 py-2 w-full sm:w-auto col-span-2 sm:col-span-1"
                        >
                          <MessageCircle size={14} className="sm:mr-1" />
                          <span className="ml-1">{t('chatBtn')}</span>
                        </Button>
                      )}
                    </div>
                  )}
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
                      <p className="text-sm text-textMuted text-center py-2">{t('noMessagesYet')}</p>
                    )}

                    <div className="flex gap-2 mt-3">
                      <Input
                        placeholder={t('askQuestion')}
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
                        className="rounded-full bg-primary hover:bg-primary-hover text-white"
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
          </>
        )}
        </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
