import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../ClonedAuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import BottomNav from '../components/BottomNav';
import { Search, MapPin, Star, Clock, MessageCircle, Plus, Filter, Briefcase, Wrench, Home, Car, Utensils, Heart, GraduationCap, Monitor, Baby, Flower2, Package, MoreHorizontal, ExternalLink, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Plataformas de emprego externas (Brasil)
const JOB_PLATFORMS = [
  {
    id: 'indeed',
    name: 'Indeed Brasil',
    logo: '🔵',
    color: 'bg-blue-600',
    baseUrl: 'https://br.indeed.com/jobs',
    searchParam: 'q',
    locationParam: 'l',
    description: 'Maior site de empregos do mundo'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    logo: '💼',
    color: 'bg-blue-700',
    baseUrl: 'https://www.linkedin.com/jobs/search',
    searchParam: 'keywords',
    locationParam: 'location',
    description: 'Rede profissional mundial'
  },
  {
    id: 'catho',
    name: 'Catho',
    logo: '🟢',
    color: 'bg-green-600',
    baseUrl: 'https://www.catho.com.br/vagas',
    searchParam: 'q',
    locationParam: 'l',
    description: 'Vagas de emprego no Brasil'
  },
  {
    id: 'vagas',
    name: 'Vagas.com',
    logo: '🟡',
    color: 'bg-yellow-500',
    baseUrl: 'https://www.vagas.com.br/vagas-de',
    searchParam: 'q',
    locationParam: 'l',
    description: 'Portal brasileiro de vagas'
  },
  {
    id: 'infojobs',
    name: 'InfoJobs',
    logo: '🟠',
    color: 'bg-orange-500',
    baseUrl: 'https://www.infojobs.com.br/empregos.aspx',
    searchParam: 'palabra',
    locationParam: 'provincia',
    description: 'Empregos em todo Brasil'
  },
  {
    id: 'gupy',
    name: 'Gupy',
    logo: '🟣',
    color: 'bg-orange-600',
    baseUrl: 'https://portal.gupy.io/job-search',
    searchParam: 'name',
    locationParam: 'city',
    description: 'Vagas em empresas brasileiras'
  },
  {
    id: 'sine',
    name: 'SINE',
    logo: '🇧🇷',
    color: 'bg-emerald-700',
    baseUrl: 'https://servicos.mte.gov.br/sine',
    searchParam: 'q',
    locationParam: 'l',
    description: 'Sistema Nacional de Emprego'
  },
  {
    id: 'glassdoor',
    name: 'Glassdoor',
    logo: '🟩',
    color: 'bg-green-700',
    baseUrl: 'https://www.glassdoor.com.br/Vaga/index.htm',
    searchParam: 'sc.keyword',
    locationParam: 'locKeyword',
    description: 'Vagas e avaliações de empresas'
  }
];

// Categorias de serviços (estilo AlloVoisins)
const SERVICE_CATEGORIES = [
  { value: 'all', label: 'Todos', icon: Filter },
  { value: 'bricolage', label: 'Bricolagem', icon: Wrench, emoji: '🔧' },
  { value: 'cleaning', label: 'Limpeza', icon: Home, emoji: '🧹' },
  { value: 'transport', label: 'Transporte', icon: Car, emoji: '🚗' },
  { value: 'food', label: 'Alimentação', icon: Utensils, emoji: '🍽️' },
  { value: 'care', label: 'Bem-estar', icon: Heart, emoji: '💆' },
  { value: 'education', label: 'Aulas', icon: GraduationCap, emoji: '📚' },
  { value: 'tech', label: 'Informática', icon: Monitor, emoji: '💻' },
  { value: 'childcare', label: 'Crianças', icon: Baby, emoji: '👶' },
  { value: 'garden', label: 'Jardinagem', icon: Flower2, emoji: '🌱' },
  { value: 'moving', label: 'Mudança', icon: Package, emoji: '📦' },
  { value: 'other', label: 'Outros', icon: MoreHorizontal, emoji: '➕' }
];

// Termos de busca sugeridos por categoria (Brasil - Português)
const SEARCH_SUGGESTIONS = {
  'bricolage': ['eletricista', 'encanador', 'marceneiro', 'pintor'],
  'cleaning': ['auxiliar de limpeza', 'faxineira', 'diarista'],
  'transport': ['motorista', 'entregador', 'motoboy'],
  'food': ['cozinheiro', 'garçom', 'auxiliar de cozinha', 'atendente'],
  'care': ['cuidador de idosos', 'técnico de enfermagem', 'enfermeiro'],
  'education': ['professor', 'instrutor', 'monitor'],
  'tech': ['desenvolvedor', 'analista de sistemas', 'técnico de TI'],
  'childcare': ['babá', 'auxiliar de creche', 'pajem'],
  'garden': ['jardineiro', 'paisagista'],
  'moving': ['ajudante de mudança', 'carregador', 'logística']
};

export default function JobsPage() {
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('São Paulo');
  const [jobOffers, setJobOffers] = useState([]);
  const [jobSeekers, setJobSeekers] = useState([]);
  const [externalJobs, setExternalJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showCreateOffer, setShowCreateOffer] = useState(false);
  const [viewMode, setViewMode] = useState('search'); // 'search', 'platforms', 'offers' ou 'seekers'
  const [showAllPlatforms, setShowAllPlatforms] = useState(false);
  const [totalJobs, setTotalJobs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobDetails, setShowJobDetails] = useState(false);

  // Sem tradução: busca usa termos em português (Brasil)
  const translateSearchTerm = (term) => term;

  useEffect(() => {
    fetchJobs();
    // Buscar vagas externas na inicialização
    searchExternalJobs('emprego', 'Brasil');
  }, []);

  useEffect(() => {
    if (selectedCategory !== 'all') {
      const categoryQuery = SEARCH_SUGGESTIONS[selectedCategory]?.[0] || selectedCategory;
      searchExternalJobs(categoryQuery, locationQuery);
    }
  }, [selectedCategory]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      // Buscar todos os posts
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ""}/api/posts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Filtrar posts de trabalho
        const workPosts = data.filter(p => p.category === 'work');
        
        // Separar ofertas e procuras
        const offers = workPosts.filter(p => p.type === 'offer');
        const seekers = workPosts.filter(p => p.type === 'need');
        
        setJobOffers(offers);
        setJobSeekers(seekers);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Buscar vagas via edge function (carrega resultados DENTRO do app)
  const searchExternalJobs = async (query, location, page = 1) => {
    setSearchLoading(true);
    try {
      const q = (query || 'emprego').trim();
      const loc = (location || 'Brasil').trim();

      const { data, error } = await supabase.functions.invoke('jobs-search', {
        body: { query: q, location: loc },
        // Suporte a query string também
        method: 'POST',
      });

      if (error) throw error;

      const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
      setExternalJobs(jobs);
      setTotalJobs(jobs.length);
      setCurrentPage(page);
      setViewMode('search');

      if (jobs.length > 0) {
        toast.success(`${jobs.length} vagas carregadas!`);
      } else {
        toast.info('Nenhuma vaga encontrada. Tente outros termos.');
      }
    } catch (err) {
      console.error('Erro ao buscar vagas:', err);
      toast.error('Não foi possível carregar as vagas. Tente novamente.');
      setExternalJobs([]);
      setTotalJobs(0);
    } finally {
      setSearchLoading(false);
    }
  };



  // Executar busca
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast.error('Digite algo para buscar');
      return;
    }
    searchExternalJobs(searchQuery, locationQuery, 1);
    setViewMode('search');
  };

  const getTimeAgo = (dateString) => {
    if (!dateString) return 'Recente';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    return `${diffDays} dias atrás`;
  };

  // Gerar URL de busca para cada plataforma (Brasil)
  const generateSearchUrl = (platform, query, location) => {
    const searchTerm = query || (selectedCategory !== 'all' ? SEARCH_SUGGESTIONS[selectedCategory]?.[0] : 'emprego');
    const loc = location || 'São Paulo';
    const slug = (s) => encodeURIComponent(String(s).toLowerCase().trim().replace(/\s+/g, '-'));

    switch(platform.id) {
      case 'indeed':
        return `${platform.baseUrl}?q=${encodeURIComponent(searchTerm)}&l=${encodeURIComponent(loc)}`;
      case 'linkedin':
        return `${platform.baseUrl}?keywords=${encodeURIComponent(searchTerm)}&location=${encodeURIComponent(loc + ', Brasil')}&f_TPR=r86400`;
      case 'catho':
        return `https://www.catho.com.br/vagas/${slug(searchTerm)}/${slug(loc)}/`;
      case 'vagas':
        return `https://www.vagas.com.br/vagas-de-${slug(searchTerm)}?l[]=${encodeURIComponent(loc)}`;
      case 'infojobs':
        return `${platform.baseUrl}?palabra=${encodeURIComponent(searchTerm)}&provincia=${encodeURIComponent(loc)}`;
      case 'gupy':
        return `${platform.baseUrl}?jobName=${encodeURIComponent(searchTerm)}&city=${encodeURIComponent(loc)}`;
      case 'glassdoor':
        return `https://www.glassdoor.com.br/Vaga/${slug(loc)}-${slug(searchTerm)}-vagas-SRCH_IL.0,${loc.length}_IC2487341_KO${loc.length + 1},${loc.length + 1 + searchTerm.length}.htm`;
      case 'sine':
        return `https://www.google.com/search?q=${encodeURIComponent(`SINE vagas ${searchTerm} ${loc}`)}`;
      default:
        return platform.baseUrl;
    }
  };

  // Abrir busca em todas as plataformas
  const searchAllPlatforms = () => {
    if (!searchQuery.trim()) {
      toast.error('Digite algo para buscar');
      return;
    }
    
    // Abrir as 3 principais plataformas
    const mainPlatforms = JOB_PLATFORMS.slice(0, 3);
    mainPlatforms.forEach((platform, index) => {
      setTimeout(() => {
        window.open(generateSearchUrl(platform, searchQuery, locationQuery), '_blank');
      }, index * 500);
    });
    
    toast.success(`Buscando "${searchQuery}" em ${mainPlatforms.length} plataformas!`);
  };

  // Abrir busca em uma plataforma específica
  const searchOnPlatform = (platform) => {
    const url = generateSearchUrl(platform, searchQuery, locationQuery);
    window.open(url, '_blank');
    toast.success(`Abrindo ${platform.name}...`);
  };

  const displayData = viewMode === 'offers' ? jobOffers : jobSeekers;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-20" data-testid="jobs-page">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-800">💼 Buscar Emprego</h1>
            <Button
              onClick={() => navigate('/home')}
              variant="outline"
              size="sm"
              className="rounded-full"
            >
              <Plus size={16} className="mr-1" />
              Publicar
            </Button>
          </div>

          {/* Barra de Pesquisa Principal */}
          <div className="bg-gradient-to-r from-blue-600 to-orange-600 rounded-2xl p-4 mb-4">
            <p className="text-white text-sm mb-3 font-medium">🔍 Busque vagas em todas as plataformas</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  placeholder="Ex: garçom, eletricista, cozinheiro..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchAllPlatforms()}
                  className="pl-10 rounded-xl bg-white h-12"
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  placeholder="Cidade"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  className="pl-10 rounded-xl bg-white h-12 w-full sm:w-36"
                />
              </div>
              <Button 
                onClick={handleSearch}
                disabled={searchLoading}
                className="h-12 px-6 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
              >
                {searchLoading ? (
                  <>🔄 Buscando...</>
                ) : (
                  <><Search size={18} className="mr-2" /> Buscar Vagas</>
                )}
              </Button>
            </div>
            
            {/* Sugestões de busca */}
            {selectedCategory !== 'all' && SEARCH_SUGGESTIONS[selectedCategory] && (
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-white/70 text-xs">Sugestões:</span>
                {SEARCH_SUGGESTIONS[selectedCategory].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => setSearchQuery(suggestion)}
                    className="px-2 py-1 bg-white/20 rounded-full text-xs text-white hover:bg-white/30"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Toggle de Modos */}
          <div className="flex gap-2 mb-4 overflow-x-auto">
            <button
              onClick={() => setViewMode('search')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                viewMode === 'search'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              🔍 Vagas ({externalJobs.length})
            </button>
            <button
              onClick={() => setViewMode('platforms')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                viewMode === 'platforms'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              🌐 Plataformas
            </button>
            <button
              onClick={() => setViewMode('offers')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                viewMode === 'offers'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              🛠️ Serviços ({jobOffers.length})
            </button>
            <button
              onClick={() => setViewMode('seekers')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                viewMode === 'seekers'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              👥 Procuram ({jobSeekers.length})
            </button>
          </div>

          {/* Categorias de Serviços */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {SERVICE_CATEGORIES.map(cat => {
              const IconComponent = cat.icon;
              return (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`flex flex-col items-center gap-1 min-w-[60px] p-2 rounded-xl transition-all ${
                    selectedCategory === cat.value
                      ? 'bg-primary text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <IconComponent size={20} />
                  <span className="text-xs font-medium whitespace-nowrap">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="container mx-auto max-w-4xl px-4 py-4">
        
        {/* Modo: Resultados de Busca de Vagas */}
        {viewMode === 'search' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">
                🔍 {totalJobs > 0 ? `${totalJobs} vagas encontradas` : 'Resultados da busca'}
              </h2>
              {externalJobs.length > 0 && (
                <span className="text-sm text-gray-500">
                  Página {currentPage}
                </span>
              )}
            </div>

            {searchLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Buscando vagas em Indeed, LinkedIn, Glassdoor...</p>
              </div>
            ) : externalJobs.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl">
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="font-bold text-gray-800 mb-2">Busque por vagas</h3>
                <p className="text-gray-500 mb-4">
                  Digite um cargo ou área de interesse para encontrar vagas disponíveis
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {['Garçom', 'Faxineira', 'Motorista', 'Cozinheiro', 'Eletricista'].map(term => (
                    <button
                      key={term}
                      onClick={() => {
                        setSearchQuery(term);
                        searchExternalJobs(term, locationQuery);
                      }}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Lista de Vagas */}
                <div className="space-y-3">
                  {externalJobs.map((job) => (
                    <div 
                      key={job.id}
                      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => {
                        setSelectedJob(job);
                        setShowJobDetails(true);
                      }}
                    >
                      <div className="flex gap-4">
                        {/* Logo da Empresa */}
                        <div className="flex-shrink-0">
                          {job.company_logo ? (
                            <img 
                              src={job.company_logo} 
                              alt={job.company}
                              className="w-14 h-14 rounded-xl object-cover border"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-orange-600 flex items-center justify-center text-white text-xl font-bold">
                              {job.company?.charAt(0) || '?'}
                            </div>
                          )}
                        </div>
                        
                        {/* Informações da Vaga */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-bold text-gray-800 line-clamp-1">{job.title}</h3>
                            {job.is_remote && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs whitespace-nowrap">
                                🏠 Remoto
                              </span>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 mt-1">{job.company}</p>
                          
                          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <MapPin size={12} />
                              {job.location || 'Brasil'}
                            </span>
                            {job.posted && (
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {job.posted}
                              </span>
                            )}
                            {(job.type || job.employment_type) && (
                              <span className="px-2 py-0.5 bg-gray-100 rounded-full">
                                {job.type || job.employment_type}
                              </span>
                            )}
                          </div>

                          {/* Salário se disponível */}
                          {job.salary && (
                            <div className="mt-2 text-sm font-medium text-green-600">
                              💰 {job.salary}
                            </div>
                          )}

                          {/* Descrição resumida */}
                          {job.description && (
                            <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                              {String(job.description).replace(/<[^>]*>/g, '').substring(0, 180)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Botão de candidatar */}
                      <div className="mt-3 flex gap-2">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            const target = job.apply_url || job.url;
                            if (target) window.open(target, '_blank');
                          }}
                          className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700"
                          size="sm"
                        >
                          <ExternalLink size={14} className="mr-1" />
                          Candidatar-se
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedJob(job);
                            setShowJobDetails(true);
                          }}
                          variant="outline"
                          className="rounded-xl"
                          size="sm"
                        >
                          Ver mais
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Paginação */}
                {totalJobs > 10 && (
                  <div className="flex justify-center gap-2 mt-6">
                    <Button
                      onClick={() => searchExternalJobs(searchQuery, locationQuery, currentPage - 1)}
                      disabled={currentPage <= 1 || searchLoading}
                      variant="outline"
                      className="rounded-xl"
                    >
                      ← Anterior
                    </Button>
                    <span className="px-4 py-2 bg-gray-100 rounded-xl">
                      Página {currentPage}
                    </span>
                    <Button
                      onClick={() => searchExternalJobs(searchQuery, locationQuery, currentPage + 1)}
                      disabled={searchLoading}
                      variant="outline"
                      className="rounded-xl"
                    >
                      Próxima →
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Modal de Detalhes da Vaga */}
        <Dialog open={showJobDetails} onOpenChange={setShowJobDetails}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                💼 {selectedJob?.title}
              </DialogTitle>
            </DialogHeader>
            
            {selectedJob && (
              <div className="space-y-4">
                {/* Header da empresa */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  {selectedJob.company_logo ? (
                    <img 
                      src={selectedJob.company_logo} 
                      alt={selectedJob.company}
                      className="w-16 h-16 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                      {selectedJob.company?.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-lg">{selectedJob.company}</h3>
                    <p className="text-gray-600 flex items-center gap-1">
                      <MapPin size={14} />
                      {selectedJob.location}
                    </p>
                  </div>
                </div>

                {/* Informações */}
                <div className="grid grid-cols-2 gap-3">
                  {selectedJob.employment_type && (
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <p className="text-xs text-gray-500">Tipo</p>
                      <p className="font-medium">{selectedJob.employment_type}</p>
                    </div>
                  )}
                  {selectedJob.date_posted && (
                    <div className="p-3 bg-green-50 rounded-xl">
                      <p className="text-xs text-gray-500">Publicado</p>
                      <p className="font-medium">{getTimeAgo(selectedJob.date_posted)}</p>
                    </div>
                  )}
                  {(selectedJob.salary_min || selectedJob.salary_max) && (
                    <div className="p-3 bg-yellow-50 rounded-xl col-span-2">
                      <p className="text-xs text-gray-500">Salário</p>
                      <p className="font-medium text-green-600">
                        💰 {selectedJob.salary_min?.toLocaleString()} - {selectedJob.salary_max?.toLocaleString()} {selectedJob.salary_currency}
                      </p>
                    </div>
                  )}
                </div>

                {/* Descrição */}
                {selectedJob.description && (
                  <div>
                    <h4 className="font-bold mb-2">📝 Descrição da Vaga</h4>
                    <div 
                      className="text-sm text-gray-600 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ 
                        __html: selectedJob.description.substring(0, 2000) 
                      }}
                    />
                  </div>
                )}

                {/* Qualificações */}
                {selectedJob.qualifications?.length > 0 && (
                  <div>
                    <h4 className="font-bold mb-2">✅ Qualificações</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {selectedJob.qualifications.slice(0, 5).map((q, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-green-500">•</span>
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Botões de ação */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => window.open(selectedJob.url, '_blank')}
                    className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700"
                  >
                    <ExternalLink size={16} className="mr-2" />
                    Candidatar-se Agora
                  </Button>
                  <Button
                    onClick={() => setShowJobDetails(false)}
                    variant="outline"
                    className="rounded-xl"
                  >
                    Fechar
                  </Button>
                </div>
                
                <p className="text-xs text-gray-400 text-center">
                  Fonte: {selectedJob.source} • Você será redirecionado para o site original
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
        
        {/* Modo: Plataformas de Emprego */}
        {viewMode === 'platforms' && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-gray-800 mb-2">🌍 Busque em {JOB_PLATFORMS.length} Plataformas</h2>
              <p className="text-sm text-gray-600">Clique em uma plataforma para buscar vagas disponíveis</p>
            </div>

            {/* Grid de Plataformas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(showAllPlatforms ? JOB_PLATFORMS : JOB_PLATFORMS.slice(0, 4)).map(platform => (
                <button
                  key={platform.id}
                  onClick={() => searchOnPlatform(platform)}
                  className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-all border border-gray-100 hover:border-blue-300 group"
                >
                  <div className={`w-12 h-12 ${platform.color} rounded-xl flex items-center justify-center text-2xl mx-auto mb-2 group-hover:scale-110 transition-transform`}>
                    {platform.logo}
                  </div>
                  <h3 className="font-bold text-sm text-gray-800">{platform.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{platform.description}</p>
                  <div className="mt-2 flex items-center justify-center text-blue-600 text-xs">
                    <ExternalLink size={12} className="mr-1" />
                    Buscar
                  </div>
                </button>
              ))}
            </div>

            {!showAllPlatforms && (
              <button
                onClick={() => setShowAllPlatforms(true)}
                className="w-full py-3 text-blue-600 font-medium text-sm hover:bg-blue-50 rounded-xl transition-colors"
              >
                Ver mais {JOB_PLATFORMS.length - 4} plataformas →
              </button>
            )}

            {/* Dicas de Busca */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mt-6">
              <h3 className="font-bold text-yellow-800 mb-2">💡 Dicas para Encontrar Emprego</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Use palavras-chave específicas (ex: &quot;auxiliar de cozinha&quot; em vez de apenas &quot;cozinha&quot;)</li>
                <li>• Cadastre-se nas plataformas para receber alertas de vagas</li>
                <li>• O <strong>SINE</strong> é o sistema oficial de emprego do Brasil</li>
                <li>• Mantenha seu currículo atualizado e completo</li>
              </ul>
            </div>

            {/* Links Úteis */}
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <h3 className="font-bold text-gray-800 mb-3">🔗 Links Úteis</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <a
                  href="https://www.gov.br/trabalho-e-emprego/pt-br"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <span className="text-lg">📋</span>
                  <div>
                    <p className="font-medium text-sm text-gray-800">Direitos do Trabalhador</p>
                    <p className="text-xs text-gray-500">gov.br/trabalho</p>
                  </div>
                </a>
                <a
                  href="https://servicos.mte.gov.br/sine"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <span className="text-lg">🇧🇷</span>
                  <div>
                    <p className="font-medium text-sm text-gray-800">SINE</p>
                    <p className="text-xs text-gray-500">Sistema Nacional de Emprego</p>
                  </div>
                </a>
                <a
                  href="https://www.gov.br/inss/pt-br"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <span className="text-lg">👥</span>
                  <div>
                    <p className="font-medium text-sm text-gray-800">INSS</p>
                    <p className="text-xs text-gray-500">Previdência Social</p>
                  </div>
                </a>
                <a
                  href="https://www.jovemaprendiz.com.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <span className="text-lg">🎓</span>
                  <div>
                    <p className="font-medium text-sm text-gray-800">Jovem Aprendiz</p>
                    <p className="text-xs text-gray-500">Primeiro emprego</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Modo: Ofertas e Procuras da Comunidade */}
        {(viewMode === 'offers' || viewMode === 'seekers') && (
          <>
            {/* Toggle Ofertas / Procuras */}
            <div className="flex gap-2 mb-4">
              <Button
                onClick={() => setViewMode('offers')}
                variant={viewMode === 'offers' ? 'default' : 'outline'}
                className={`flex-1 rounded-full ${viewMode === 'offers' ? 'bg-primary' : ''}`}
              >
                🛠️ Ofertas de Serviço ({jobOffers.length})
              </Button>
              <Button
                onClick={() => setViewMode('seekers')}
                variant={viewMode === 'seekers' ? 'default' : 'outline'}
                className={`flex-1 rounded-full ${viewMode === 'seekers' ? 'bg-green-600' : ''}`}
              >
                🔍 Procuram Trabalho ({jobSeekers.length})
              </Button>
            </div>

            {/* Seção de Cards */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-800">
                  {viewMode === 'offers' ? '🛠️ Profissionais & Serviços' : '🔍 Pessoas Procurando Trabalho'}
                </h2>
                <span className="text-sm text-gray-500">
                  {displayData.length} {viewMode === 'offers' ? 'ofertas' : 'pessoas'}
                </span>
              </div>

              {loading ? (
                <div className="text-center py-8 text-gray-500">Carregando...</div>
              ) : displayData.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-2xl">
                  <div className="text-5xl mb-3">{viewMode === 'offers' ? '🛠️' : '🔍'}</div>
                  <p className="text-gray-500">
                    {viewMode === 'offers' 
                      ? 'Nenhuma oferta de serviço encontrada' 
                      : 'Ninguém procurando trabalho no momento'}
                  </p>
                  <Button
                    onClick={() => navigate('/home')}
                    className="mt-4 rounded-full"
                  >
                    <Plus size={16} className="mr-1" />
                    Seja o primeiro a publicar
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {displayData.map((item) => (
                    <div 
                      key={item.id}
                      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => navigate(`/direct-chat/${item.user_id}`)}
                    >
                      <div className="flex gap-3">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold ${
                        viewMode === 'offers' ? 'bg-gradient-to-br from-blue-500 to-orange-600' : 'bg-gradient-to-br from-green-500 to-emerald-600'
                      }`}>
                        {item.user?.name?.charAt(0) || 'U'}
                      </div>
                    </div>

                    {/* Informações */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <h3 className="font-bold text-gray-800">{item.user?.name || 'Usuário'}</h3>
                          <p className="text-sm text-primary font-medium">{item.title}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          viewMode === 'offers' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {viewMode === 'offers' ? 'Oferece' : 'Procura'}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {item.description}
                      </p>

                      {/* Informações extras de emprego */}
                      {item.job_languages && item.job_languages.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {item.job_languages.map(lang => (
                            <span key={lang} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                              🗣️ {lang}
                            </span>
                          ))}
                        </div>
                      )}

                      {item.job_availability && (
                        <span className="inline-block px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full mr-2">
                          🕐 {item.job_availability === 'full_time' ? 'Tempo Integral' : 
                              item.job_availability === 'part_time' ? 'Meio Período' :
                              item.job_availability === 'flexible' ? 'Flexível' : 'Finais de Semana'}
                        </span>
                      )}

                      {/* Rodapé do Card */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          {item.location && (
                            <span className="flex items-center gap-1">
                              <MapPin size={12} />
                              {item.location || 'Brasil'}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {getTimeAgo(item.created_at)}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          className="rounded-full text-xs h-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/direct-chat/${item.user_id}`);
                          }}
                        >
                          <MessageCircle size={12} className="mr-1" />
                          Contatar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Seção de Mapa */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            🗺️ Mapa de Oportunidades
          </h3>
          <div 
            className="h-48 bg-gradient-to-br from-blue-100 to-orange-100 rounded-xl flex items-center justify-center cursor-pointer hover:from-blue-200 hover:to-orange-200 transition-all"
            onClick={() => navigate('/nearby')}
          >
            <div className="text-center">
              <MapPin size={40} className="mx-auto text-primary mb-2" />
              <p className="text-sm text-gray-600">Ver no mapa completo</p>
              <p className="text-xs text-gray-400">Encontre oportunidades perto de você</p>
            </div>
          </div>
        </div>

            {/* Call to Action */}
            <div className="mt-4 bg-gradient-to-r from-primary to-secondary rounded-2xl p-6 text-white text-center">
              <h3 className="font-bold text-lg mb-2">
                {viewMode === 'offers' ? '🔍 Procurando Trabalho?' : '🛠️ Oferece Algum Serviço?'}
              </h3>
              <p className="text-sm text-white/80 mb-4">
                {viewMode === 'offers' 
                  ? 'Publique seu perfil e deixe os empregadores te encontrarem'
                  : 'Publique sua oferta de serviço e encontre clientes'}
              </p>
              <Button
                onClick={() => navigate('/home')}
                variant="secondary"
                className="rounded-full bg-white text-primary hover:bg-gray-100"
              >
                <Plus size={16} className="mr-1" />
                Publicar Agora
              </Button>
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
