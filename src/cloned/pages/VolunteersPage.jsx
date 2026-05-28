import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../ClonedAuthContext';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import BottomNav from '../components/BottomNav';
import { MessageCircle, Plus, Check, Heart, Users, Sparkles, MapPin, Image as ImageIcon, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// Imagens de pessoas felizes sendo ajudadas
const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=800&q=80', // Mãos unidas
  'https://images.unsplash.com/photo-1527525443983-6e60c75fff46?w=800&q=80', // Equipe unida
  'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80', // Voluntários felizes
];

// Categorias principais (4 no grid)
const MAIN_CATEGORIES = [
  { value: 'housing', label: 'Moradia', icon: '🏠', color: 'from-orange-400 to-orange-600' },
  { value: 'work', label: 'Trabalho', icon: '💼', color: 'from-yellow-400 to-orange-500' },
  { value: 'food', label: 'Alimentação', icon: '🍽️', color: 'from-green-400 to-green-600' },
  { value: 'education', label: 'Educação', icon: '📚', color: 'from-blue-400 to-blue-600' }
];

// Todas as categorias
const ALL_CATEGORIES = [
  { value: 'social', label: 'Social', icon: '🤝' },
  { value: 'clothes', label: 'Roupas', icon: '👕' },
  { value: 'furniture', label: 'Móveis', icon: '🪑' },
  { value: 'transport', label: 'Transporte', icon: '🚗' },
  { value: 'food', label: 'Alimentação', icon: '🍽️' },
  { value: 'legal', label: 'Jurídico', icon: '⚖️' },
  { value: 'health', label: 'Saúde', icon: '🏥' },
  { value: 'housing', label: 'Moradia', icon: '🏠' },
  { value: 'work', label: 'Trabalho', icon: '💼' },
  { value: 'education', label: 'Educação', icon: '📚' }
];

export default function VolunteersPage() {
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [showModal, setShowModal] = useState(true);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [helpRequests, setHelpRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Estado para o formulário de oferta pública
  const [publicOffer, setPublicOffer] = useState({
    title: '',
    description: '',
    categories: [],
    location: null,
    images: []
  });

  // Rotacionar imagens de fundo
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedCategories.length > 0) {
      fetchHelpRequests();
    } else {
      setHelpRequests([]);
    }
  }, [selectedCategories]);

  const fetchHelpRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ""}/api/posts?type=need`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const filtered = data.filter(post => {
          const postCategories = post.categories || [post.category];
          return postCategories.some(cat => selectedCategories.includes(cat));
        });
        setHelpRequests(filtered);
      }
    } catch (error) {
      console.error('Error fetching help requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const getCategoryInfo = (categoryValue) => {
    return ALL_CATEGORIES.find(c => c.value === categoryValue) || { icon: '📝', label: categoryValue };
  };

  // Funções para o formulário de oferta pública
  const toggleOfferCategory = (category) => {
    if (publicOffer.categories.includes(category)) {
      setPublicOffer({...publicOffer, categories: publicOffer.categories.filter(c => c !== category)});
    } else {
      setPublicOffer({...publicOffer, categories: [...publicOffer.categories, category]});
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
        setPublicOffer({...publicOffer, images: [...publicOffer.images, reader.result]});
        toast.success('Foto adicionada!');
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (index) => {
    const newImages = publicOffer.images.filter((_, idx) => idx !== index);
    setPublicOffer({...publicOffer, images: newImages});
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      toast.info('Obtendo localização...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPublicOffer({
            ...publicOffer,
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              address: 'Localização atual'
            }
          });
          toast.success('Localização adicionada!');
        },
        (error) => {
          toast.error('Erro ao obter localização. Tente novamente.');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }
  };

  const submitPublicOffer = async () => {
    if (!publicOffer.title || !publicOffer.description) {
      toast.error('Preencha o título e a descrição');
      return;
    }
    if (publicOffer.categories.length === 0) {
      toast.error('Selecione pelo menos uma categoria');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ""}/api/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'offer',
          category: publicOffer.categories[0],
          categories: publicOffer.categories,
          title: publicOffer.title,
          description: publicOffer.description,
          images: publicOffer.images,
          location: publicOffer.location
        })
      });

      if (response.ok) {
        toast.success('Oferta publicada com sucesso!');
        setShowOfferModal(false);
        setPublicOffer({ title: '', description: '', categories: [], location: null, images: [] });
        navigate('/home');
      } else {
        toast.error('Erro ao publicar oferta');
      }
    } catch (error) {
      toast.error('Erro ao publicar oferta');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-20" data-testid="volunteers-page">
      {/* Hero Section com Imagem de Fundo */}
      <div className="relative h-64 overflow-hidden">
        {/* Imagem de fundo com transição */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
          style={{ 
            backgroundImage: `url(${HERO_IMAGES[currentImageIndex]})`,
          }}
        />
        {/* Overlay gradiente */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/80 via-primary/60 to-primary/90" />
        
        {/* Conteúdo do Header */}
        <div className="relative z-10 h-full flex flex-col justify-center px-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-8 h-8 text-red-400 animate-pulse" />
            <h1 className="text-3xl font-bold">Quero Ajudar</h1>
          </div>
          <p className="text-white/90 text-lg">Sua ajuda transforma vidas</p>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
              <Users size={18} />
              <span className="text-sm font-medium">+500 pessoas ajudadas</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
              <Sparkles size={18} />
              <span className="text-sm font-medium">Faça a diferença</span>
            </div>
          </div>
        </div>

        {/* Indicadores de imagem */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {HERO_IMAGES.map((_, idx) => (
            <div 
              key={idx}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentImageIndex ? 'bg-white w-6' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Modal Quero Ajudar */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="rounded-3xl max-w-lg mx-2 sm:mx-4 max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
              Quero Ajudar
            </DialogTitle>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
              Selecione as categorias em que você pode ajudar
            </p>
          </DialogHeader>

          {/* Imagem inspiradora no modal */}
          <div className="relative h-28 sm:h-32 rounded-2xl overflow-hidden mb-4">
            <img 
              src="https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=600&q=80" 
              alt="Pessoas unidas"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3 sm:p-4">
              <p className="text-white text-xs sm:text-sm font-medium">Juntos somos mais fortes 💪</p>
            </div>
          </div>

          {/* Grid de 4 Categorias Principais */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {MAIN_CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => toggleCategory(cat.value)}
                className={`relative p-3 sm:p-4 rounded-xl border-2 transition-all text-left overflow-hidden ${
                  selectedCategories.includes(cat.value)
                    ? 'border-primary shadow-lg scale-105'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Background gradiente quando selecionado */}
                {selectedCategories.includes(cat.value) && (
                  <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-20`} />
                )}
                <div className="relative z-10">
                  <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">{cat.icon}</div>
                  <div className="font-medium text-sm sm:text-base text-gray-800 truncate">{cat.label}</div>
                  {selectedCategories.includes(cat.value) && (
                    <Check size={16} className="absolute top-1 right-1 sm:top-2 sm:right-2 text-primary" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Indicador de categorias selecionadas */}
          {selectedCategories.length > 0 && (
            <div className="flex items-center gap-2 mt-4 p-2 sm:p-3 bg-green-50 rounded-xl border border-green-200">
              <Check size={14} className="text-green-600 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-green-700 flex-1 min-w-0 truncate">
                {selectedCategories.length} {selectedCategories.length === 1 ? 'selecionada' : 'selecionadas'}
              </span>
              <div className="flex gap-1 flex-shrink-0">
                {selectedCategories.slice(0, 3).map(cat => (
                  <span key={cat} className="text-base sm:text-lg">{getCategoryInfo(cat).icon}</span>
                ))}
                {selectedCategories.length > 3 && <span className="text-xs text-gray-500">+{selectedCategories.length - 3}</span>}
              </div>
            </div>
          )}

          {/* Solicitações de Ajuda Disponíveis */}
          {selectedCategories.length > 0 && (
            <div className="mt-3 sm:mt-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-3 sm:p-4 border border-green-200">
              <h3 className="font-bold text-sm sm:text-base text-green-800 mb-1 flex items-center gap-2">
                <Heart size={16} className="text-red-500 flex-shrink-0" />
                <span className="truncate">Pessoas que precisam de você</span>
              </h3>
              <p className="text-xs text-green-700 mb-3 sm:mb-4">
                Clique para conversar
              </p>

              {loading ? (
                <div className="text-center py-4 text-gray-500">Carregando...</div>
              ) : helpRequests.length === 0 ? (
                <div className="text-center py-4">
                  <div className="text-4xl mb-2">🌟</div>
                  <p className="text-gray-600 text-sm">Nenhuma solicitação no momento</p>
                  <p className="text-gray-400 text-xs">Volte em breve!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {helpRequests.map(request => (
                    <div 
                      key={request.id}
                      onClick={() => navigate(`/direct-chat/${request.user_id}`)}
                      className="bg-white rounded-xl p-4 border border-green-200 cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-lg">
                            {request.user?.name?.charAt(0) || 'U'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-gray-800">
                              {request.user?.name || 'Usuário'}
                            </p>
                            <MessageCircle size={18} className="text-green-500" />
                          </div>
                          <span className="text-xs text-green-600 font-medium">Precisa de ajuda</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {request.description || request.title}
                      </p>
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                        {getCategoryInfo(request.category).icon} {getCategoryInfo(request.category).label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Opção de criar oferta pública */}
          <div 
            onClick={() => {
              setShowModal(false);
              setShowOfferModal(true);
            }}
            className="mt-3 sm:mt-4 p-3 sm:p-4 border-2 border-dashed border-primary/30 rounded-xl text-center cursor-pointer hover:bg-primary/5 transition-all"
          >
            <div className="flex items-center justify-center gap-2 text-primary">
              <Plus size={16} className="flex-shrink-0" />
              <span className="font-medium text-sm sm:text-base">Criar oferta pública</span>
            </div>
            <p className="text-xs text-gray-500 mt-1 break-words">
              Pessoas que precisam podem te encontrar
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Criar Oferta Pública */}
      <Dialog open={showOfferModal} onOpenChange={setShowOfferModal}>
        <DialogContent className="rounded-3xl max-w-lg mx-2 sm:mx-4 max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
              <span className="break-words">Criar Oferta de Ajuda</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm break-words">
              Publique para que pessoas possam te encontrar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 sm:space-y-5 mt-3 sm:mt-4">
            {/* Seleção de Categorias */}
            <div className="bg-gray-50 p-3 sm:p-4 rounded-2xl">
              <Label className="text-sm sm:text-base font-bold mb-2 sm:mb-3 block">📂 Em que você pode ajudar?</Label>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {ALL_CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => toggleOfferCategory(cat.value)}
                    className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all flex items-center gap-1 ${
                      publicOffer.categories.includes(cat.value)
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-primary'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Título */}
            <div className="bg-white border-2 border-gray-200 p-3 sm:p-4 rounded-2xl">
              <Label className="text-sm sm:text-base font-bold mb-2 block flex items-center gap-2">
                <span className="text-lg sm:text-xl">✏️</span>
                <span>Título da Oferta</span>
              </Label>
              <Input
                value={publicOffer.title}
                onChange={(e) => setPublicOffer({...publicOffer, title: e.target.value})}
                placeholder="Ex: Aulas de francês"
                className="rounded-xl h-10 sm:h-12 text-sm sm:text-base w-full"
              />
            </div>

            {/* Descrição */}
            <div className="bg-white border-2 border-gray-200 p-3 sm:p-4 rounded-2xl">
              <Label className="text-sm sm:text-base font-bold mb-2 block flex items-center gap-2">
                <span className="text-lg sm:text-xl">📝</span>
                <span>Descrição</span>
              </Label>
              <Textarea
                value={publicOffer.description}
                onChange={(e) => setPublicOffer({...publicOffer, description: e.target.value})}
                rows={3}
                placeholder="Como você pode ajudar..."
                className="rounded-xl text-sm sm:text-base w-full"
              />
            </div>

            {/* Localização */}
            <div className="bg-blue-50 border-2 border-blue-200 p-3 sm:p-4 rounded-2xl">
              <Label className="text-sm sm:text-base font-bold mb-2 block flex items-center gap-2">
                <MapPin className="text-blue-600 flex-shrink-0" size={18} />
                <span>Localização (opcional)</span>
              </Label>
              {publicOffer.location ? (
                <div className="flex items-center justify-between bg-white p-2 sm:p-3 rounded-xl gap-2">
                  <span className="text-xs sm:text-sm text-gray-600 truncate flex-1 min-w-0">📍 {publicOffer.location.address}</span>
                  <button 
                    onClick={() => setPublicOffer({...publicOffer, location: null})}
                    className="text-red-500 hover:text-red-700 flex-shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={getLocation}
                  variant="outline"
                  className="w-full rounded-xl text-xs sm:text-sm"
                >
                  <MapPin size={16} className="mr-2 flex-shrink-0" />
                  Adicionar localização
                </Button>
              )}
            </div>

            {/* Upload de Foto */}
            <div className="bg-orange-50 border-2 border-orange-200 p-3 sm:p-4 rounded-2xl">
              <Label className="text-sm sm:text-base font-bold mb-2 block flex items-center gap-2">
                <ImageIcon className="text-orange-600 flex-shrink-0" size={18} />
                <span>Foto (opcional)</span>
              </Label>
              
              {publicOffer.images.length > 0 && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {publicOffer.images.map((img, idx) => (
                    <div key={idx} className="relative w-16 sm:w-20 h-16 sm:h-20">
                      <img src={img} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full rounded-xl"
              >
                <ImageIcon size={16} className="mr-2" />
                {publicOffer.images.length > 0 ? 'Adicionar outra foto' : 'Adicionar foto'}
              </Button>
            </div>

            {/* Botão de Publicar */}
            <Button
              onClick={submitPublicOffer}
              className="w-full rounded-full py-6 bg-gradient-to-r from-primary to-secondary text-white font-bold shadow-lg"
            >
              <Heart size={20} className="mr-2" />
              Publicar Oferta de Ajuda
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Conteúdo Principal */}
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Cards de inspiração */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="relative h-40 rounded-2xl overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=400&q=80" 
              alt="Voluntários"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4">
              <p className="text-white text-sm font-medium">Cada gesto conta ❤️</p>
            </div>
          </div>
          <div className="relative h-40 rounded-2xl overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1527525443983-6e60c75fff46?w=400&q=80" 
              alt="Equipe unida"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4">
              <p className="text-white text-sm font-medium">Juntos somos fortes 💪</p>
            </div>
          </div>
        </div>

        {/* Botão para reabrir modal */}
        <Button
          onClick={() => setShowModal(true)}
          className="w-full mb-6 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-6 shadow-lg"
        >
          <Heart size={20} className="mr-2" />
          Quero Ajudar Alguém
        </Button>

        {/* Lista de solicitações fora do modal */}
        {selectedCategories.length > 0 && helpRequests.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Heart size={20} className="text-red-500" />
              Pessoas que precisam de ajuda ({helpRequests.length})
            </h2>
            {helpRequests.map(request => (
              <div 
                key={request.id}
                className="bg-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                    <span className="text-white font-bold text-xl">
                      {request.user?.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{request.user?.name}</p>
                    <span className="text-xs text-green-600 font-medium">Precisa de ajuda</span>
                  </div>
                </div>
                <p className="text-gray-600 mb-4">{request.description || request.title}</p>
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-gray-100 rounded-full text-sm flex items-center gap-1">
                    {getCategoryInfo(request.category).icon} {getCategoryInfo(request.category).label}
                  </span>
                  <Button
                    onClick={() => navigate(`/direct-chat/${request.user_id}`)}
                    className="rounded-full bg-primary"
                  >
                    <MessageCircle size={16} className="mr-2" />
                    Ajudar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Mensagem inspiradora */}
        <div className="mt-8 bg-gradient-to-br from-orange-50 to-orange-50 rounded-3xl p-6 text-center border border-orange-200">
          <div className="text-4xl mb-3">🌟</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            Sua ajuda faz a diferença
          </h3>
          <p className="text-gray-600 text-sm max-w-md mx-auto">
            Cada pequeno gesto de bondade pode transformar a vida de alguém. 
            Obrigado por fazer parte dessa comunidade de pessoas incríveis!
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
