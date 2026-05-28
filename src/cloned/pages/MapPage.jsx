import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { AuthContext } from '../ClonedAuthContext';
import { Button } from '../components/ui/button';
import BottomNav from '../components/BottomNav';
import { MapPin, Filter, Phone, Clock, ExternalLink, Navigation, Info, Target, Loader2, AlertCircle, Sun, Moon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const BACKEND_URL = import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || "";

// Função para verificar se é noite (entre 18h e 6h)
const isNightTime = () => {
  const hour = new Date().getHours();
  return hour >= 18 || hour < 6;
};

export default function MapPage() {
  const { token } = useContext(AuthContext);
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedService, setSelectedService] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [nearestLocation, setNearestLocation] = useState(null);
  const [showNearestModal, setShowNearestModal] = useState(false);
  const [isNight, setIsNight] = useState(isNightTime());
  
  // Estados para dados da API
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingNearest, setLoadingNearest] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Atualizar modo dia/noite a cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setIsNight(isNightTime());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Cores do mapa baseadas no modo dia/noite
  const mapColors = useMemo(() => ({
    background: isNight 
      ? 'from-slate-900 via-slate-800 to-orange-900' 
      : 'from-blue-50 via-sky-100 to-blue-200',
    grid: isNight ? '#3b82f6' : '#2563eb',
    streets: isNight ? '#60a5fa' : '#3b82f6',
    text: isNight ? 'text-white' : 'text-gray-800',
    cardBg: isNight ? 'bg-slate-800/90' : 'bg-white/95',
    cardText: isNight ? 'text-white' : 'text-gray-800',
    userMarker: isNight ? 'bg-cyan-400' : 'bg-blue-500',
    userPulse: isNight ? 'bg-cyan-400/30' : 'bg-blue-400/30',
  }), [isNight]);

  // Buscar categorias
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/help-locations/categories`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
      }
    } catch (err) {
      console.error('Erro ao buscar categorias:', err);
    }
  }, []);

  // Buscar locais de ajuda
  const fetchLocations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `${BACKEND_URL}/api/help-locations`;
      const params = new URLSearchParams();
      
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      
      if (userLocation) {
        params.append('lat', userLocation.lat);
        params.append('lng', userLocation.lng);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setServices(data.locations);
      } else {
        throw new Error('Erro ao buscar locais');
      }
    } catch (err) {
      setError('Não foi possível carregar os locais de ajuda');
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, userLocation]);

  // Buscar local mais próximo
  const findNearestLocation = async (category = null) => {
    if (!userLocation) {
      alert('Por favor, ative sua localização primeiro');
      return;
    }
    
    setLoadingNearest(true);
    try {
      let url = `${BACKEND_URL}/api/help-locations/nearest?lat=${userLocation.lat}&lng=${userLocation.lng}`;
      if (category && category !== 'all') {
        url += `&category=${category}`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setNearestLocation(data.nearest);
        setShowNearestModal(true);
      }
    } catch (err) {
      console.error('Erro ao buscar local mais próximo:', err);
      alert('Erro ao buscar local mais próximo');
    } finally {
      setLoadingNearest(false);
    }
  };

  // Obter localização do usuário
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Seu navegador não suporta geolocalização');
      return;
    }

    setLoadingLocation(true);
    
    toast.info('📍 Obtendo sua localização...', {
      description: 'Por favor, permita o acesso à localização quando solicitado',
      duration: 4000
    });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLoadingLocation(false);
        toast.success('✅ Localização obtida!', {
          description: 'Agora você pode ver locais de ajuda próximos a você'
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLoadingLocation(false);
        
        let errorMessage = 'Erro ao obter localização';
        let errorDescription = '';

        if (error.code === 1) {
          errorMessage = '🔒 Permissão de localização negada';
          errorDescription = 'Ative a permissão de localização nas configurações do navegador para ver locais próximos.';
        } else if (error.code === 2) {
          errorMessage = '📡 Localização indisponível';
          errorDescription = 'Não foi possível obter sua localização. Verifique se o GPS está ativado.';
        } else if (error.code === 3) {
          errorMessage = '⏱️ Tempo esgotado';
          errorDescription = 'A solicitação demorou muito. Tente novamente.';
        }

        toast.error(errorMessage, {
          description: errorDescription,
          duration: 6000
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Tentar obter localização ao carregar a página
  useEffect(() => {
    getUserLocation();
  }, []);

  const openGoogleMaps = (service) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${service.lat},${service.lng}`, '_blank');
  };

  const openStreetView = (service) => {
    window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${service.lat},${service.lng}`, '_blank');
  };

  const openServiceDetails = (service) => {
    setSelectedService(service);
    setShowDetails(true);
  };

  return (
    <div className={`min-h-screen pb-20 transition-colors duration-500 ${isNight ? 'bg-slate-900' : 'bg-background'}`} data-testid="map-page">
      {/* Header */}
      <div className={`bg-gradient-to-r ${isNight ? 'from-blue-900 to-orange-900' : 'from-blue-600 to-blue-700'} text-white py-4 px-4 sticky top-0 z-20 transition-colors duration-500`}>
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl sm:text-2xl font-heading font-bold flex items-center gap-2">
              <MapPin size={24} />
              Mapa de Ajuda - Paris
            </h1>
            {/* Indicador Dia/Noite */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${isNight ? 'bg-orange-800' : 'bg-blue-500'}`}>
              {isNight ? <Moon size={16} /> : <Sun size={16} />}
              <span className="text-xs font-medium">{isNight ? 'Modo Noturno' : 'Modo Diurno'}</span>
            </div>
          </div>
          
          {/* Botão de Localização */}
          <div className="flex items-center gap-2 mb-3">
            <Button
              onClick={getUserLocation}
              disabled={loadingLocation}
              variant="outline"
              size="sm"
              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
            >
              {loadingLocation ? (
                <Loader2 size={14} className="mr-2 animate-spin" />
              ) : (
                <Target size={14} className="mr-2" />
              )}
              {userLocation ? 'Atualizar Localização' : 'Ativar Localização'}
            </Button>
            
            {userLocation && (
              <Button
                onClick={() => findNearestLocation(selectedCategory)}
                disabled={loadingNearest}
                variant="outline"
                size="sm"
                className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              >
                {loadingNearest ? (
                  <Loader2 size={14} className="mr-2 animate-spin" />
                ) : (
                  <Navigation size={14} className="mr-2" />
                )}
                {t('nearestLocation')}
              </Button>
            )}
          </div>
          
          {/* Status da Localização */}
          {userLocation && (
            <div className="text-xs text-white/80 mb-2 flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Localização ativa
            </div>
          )}
          
          {/* Filtros por Categoria */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.length > 0 ? (
              categories.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${
                    selectedCategory === cat.value
                      ? 'bg-white text-blue-600 shadow-lg'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span className="hidden sm:inline">{cat.label}</span>
                  <span className="text-xs opacity-70">({cat.count})</span>
                </button>
              ))
            ) : (
              <div className="text-white/70 text-sm">Carregando categorias...</div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-2 sm:px-4 py-4 max-w-6xl">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12 min-h-[300px]">
            <Loader2 className="animate-spin text-blue-500" size={48} />
          </div>
        )}

        {!loading && (
          <>
            {/* Error State */}
            {error && (
              <div className={`${isNight ? 'bg-red-900/50 border-red-700' : 'bg-red-50 border-red-200'} border rounded-xl p-4 mb-4 flex items-center gap-3`}>
                <AlertCircle className="text-red-500" size={24} />
                <div>
                  <p className={`font-medium ${isNight ? 'text-red-300' : 'text-red-800'}`}>{error}</p>
                  <Button
                    onClick={fetchLocations}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    Tentar novamente
                  </Button>
                </div>
              </div>
            )}

            {/* Mapa Estilizado com Modo Dia/Noite */}
            <div className={`relative w-full min-h-[400px] h-[50vh] sm:h-[500px] lg:h-[600px] rounded-3xl overflow-hidden border-4 ${isNight ? 'border-blue-500/30' : 'border-blue-300/50'} bg-gradient-to-br ${mapColors.background} shadow-2xl mb-4 transition-colors duration-500`}>
              
              {/* Padrão de ruas estilo Street View */}
              <div className="absolute inset-0">
                {/* Ruas principais */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 500" preserveAspectRatio="none">
                  {/* Ruas horizontais */}
                  <rect x="0" y="100" width="500" height="8" fill={isNight ? '#1e40af' : '#93c5fd'} opacity="0.6" />
                  <rect x="0" y="200" width="500" height="12" fill={isNight ? '#1e40af' : '#60a5fa'} opacity="0.7" />
                  <rect x="0" y="300" width="500" height="8" fill={isNight ? '#1e40af' : '#93c5fd'} opacity="0.6" />
                  <rect x="0" y="400" width="500" height="10" fill={isNight ? '#1e40af' : '#60a5fa'} opacity="0.7" />
                  
                  {/* Ruas verticais */}
                  <rect x="80" y="0" width="6" height="500" fill={isNight ? '#1e40af' : '#93c5fd'} opacity="0.5" />
                  <rect x="170" y="0" width="10" height="500" fill={isNight ? '#1e40af' : '#60a5fa'} opacity="0.7" />
                  <rect x="280" y="0" width="6" height="500" fill={isNight ? '#1e40af' : '#93c5fd'} opacity="0.5" />
                  <rect x="380" y="0" width="12" height="500" fill={isNight ? '#1e40af' : '#60a5fa'} opacity="0.7" />
                  
                  {/* Praça central */}
                  <circle cx="250" cy="250" r="40" fill={isNight ? '#1e3a5f' : '#dbeafe'} stroke={isNight ? '#3b82f6' : '#60a5fa'} strokeWidth="3" />
                  
                  {/* Blocos de prédios */}
                  <rect x="90" y="110" width="70" height="80" fill={isNight ? '#0f172a' : '#e0f2fe'} rx="4" opacity="0.5" />
                  <rect x="180" y="110" width="90" height="80" fill={isNight ? '#0f172a' : '#e0f2fe'} rx="4" opacity="0.5" />
                  <rect x="310" y="110" width="60" height="80" fill={isNight ? '#0f172a' : '#e0f2fe'} rx="4" opacity="0.5" />
                  
                  <rect x="90" y="210" width="70" height="80" fill={isNight ? '#0f172a' : '#e0f2fe'} rx="4" opacity="0.5" />
                  <rect x="310" y="210" width="80" height="80" fill={isNight ? '#0f172a' : '#e0f2fe'} rx="4" opacity="0.5" />
                  
                  <rect x="90" y="310" width="70" height="80" fill={isNight ? '#0f172a' : '#e0f2fe'} rx="4" opacity="0.5" />
                  <rect x="180" y="310" width="90" height="80" fill={isNight ? '#0f172a' : '#e0f2fe'} rx="4" opacity="0.5" />
                  <rect x="310" y="310" width="60" height="80" fill={isNight ? '#0f172a' : '#e0f2fe'} rx="4" opacity="0.5" />
                </svg>

                {/* Efeito de iluminação noturna */}
                {isNight && (
                  <>
                    <div className="absolute top-[100px] left-[120px] w-4 h-4 bg-yellow-400 rounded-full blur-sm animate-pulse" />
                    <div className="absolute top-[200px] left-[220px] w-3 h-3 bg-yellow-300 rounded-full blur-sm animate-pulse" style={{ animationDelay: '0.5s' }} />
                    <div className="absolute top-[300px] left-[350px] w-4 h-4 bg-yellow-400 rounded-full blur-sm animate-pulse" style={{ animationDelay: '1s' }} />
                    <div className="absolute top-[150px] left-[400px] w-3 h-3 bg-orange-400 rounded-full blur-sm animate-pulse" style={{ animationDelay: '0.3s' }} />
                    <div className="absolute top-[350px] left-[150px] w-3 h-3 bg-yellow-300 rounded-full blur-sm animate-pulse" style={{ animationDelay: '0.7s' }} />
                  </>
                )}
              </div>

              {/* Localização do usuário */}
              {userLocation && (
                <div 
                  className="absolute z-20"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className="relative">
                    <div className={`absolute w-16 h-16 ${mapColors.userPulse} rounded-full animate-ping`} style={{ animationDuration: '2s', left: '-16px', top: '-16px' }} />
                    <div className={`absolute w-12 h-12 ${isNight ? 'bg-cyan-300/20' : 'bg-blue-300/20'} rounded-full`} style={{ left: '-8px', top: '-8px' }} />
                    <div className={`relative w-8 h-8 ${mapColors.userMarker} border-4 border-white rounded-full shadow-lg flex items-center justify-center`}>
                      <Target size={14} className="text-white" />
                    </div>
                    <div className={`absolute top-full mt-1 left-1/2 transform -translate-x-1/2 ${isNight ? 'bg-cyan-500' : 'bg-blue-600'} text-white text-[10px] px-2 py-1 rounded-full whitespace-nowrap font-bold`}>
                      Você
                    </div>
                  </div>
                </div>
              )}

              {/* Marcadores dos Serviços */}
              {services.slice(0, 30).map((service, index) => {
                const gridCols = 6;
                const xPos = 10 + (index % gridCols) * 14;
                const yPos = 10 + Math.floor(index / gridCols) * 18;

                return (
                  <div
                    key={service.id}
                    className="absolute z-10 cursor-pointer group"
                    style={{
                      left: `${xPos}%`,
                      top: `${yPos}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                    onClick={() => openServiceDetails(service)}
                  >
                    {/* Círculo de pulso */}
                    <div className={`absolute w-10 h-10 ${service.color} opacity-30 rounded-full animate-ping`} 
                      style={{ animationDuration: `${2.5 + (index * 0.1) % 2}s`, left: '-5px', top: '-5px' }} />
                    
                    {/* Marcador */}
                    <div className={`relative ${service.color} w-8 h-8 sm:w-10 sm:h-10 rounded-full border-3 ${isNight ? 'border-slate-700' : 'border-white'} shadow-xl flex items-center justify-center text-sm sm:text-lg transform group-hover:scale-125 transition-transform`}>
                      {service.icon}
                    </div>

                    {/* Distância */}
                    {service.distance && (
                      <div className={`absolute -bottom-5 left-1/2 transform -translate-x-1/2 ${isNight ? 'bg-slate-700' : 'bg-gray-800/80'} text-white text-[8px] px-1.5 py-0.5 rounded whitespace-nowrap`}>
                        {service.distance} km
                      </div>
                    )}

                    {/* Label - aparece no hover */}
                    <div className={`absolute top-full mt-6 left-1/2 transform -translate-x-1/2 ${mapColors.cardBg} px-3 py-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-30`}>
                      <p className={`text-xs font-bold ${mapColors.cardText}`}>{service.name}</p>
                      <p className={`text-[10px] ${isNight ? 'text-gray-400' : 'text-gray-500'}`}>{service.address?.substring(0, 30)}...</p>
                    </div>
                  </div>
                );
              })}

              {/* Legenda */}
              <div className={`absolute bottom-4 left-4 ${mapColors.cardBg} backdrop-blur-sm rounded-2xl p-3 shadow-xl`}>
                <p className={`text-xs font-bold ${mapColors.cardText} mb-2`}>📍 {services.length} Locais</p>
                <div className={`flex items-center gap-2 text-xs ${isNight ? 'text-gray-400' : 'text-gray-600'}`}>
                  <div className={`w-3 h-3 ${mapColors.userMarker} rounded-full`} />
                  <span>Sua localização</span>
                </div>
                {!userLocation && (
                  <p className={`text-[10px] ${isNight ? 'text-orange-400' : 'text-orange-600'} mt-1`}>
                    Ative a localização para ver distâncias
                  </p>
                )}
              </div>

              {/* Indicador de mais locais */}
              {services.length > 30 && (
                <div className={`absolute bottom-4 right-4 ${isNight ? 'bg-blue-600/90' : 'bg-blue-500/90'} text-white rounded-xl px-3 py-2 text-xs`}>
                  +{services.length - 30} locais na lista
                </div>
              )}
            </div>

            {/* Lista de Serviços */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {services.map(service => (
                <div
                  key={service.id}
                  className={`${isNight ? 'bg-slate-800 border-slate-700 hover:border-blue-500' : 'bg-white hover:border-blue-400'} rounded-2xl p-4 shadow-card hover:shadow-xl transition-all border-2 border-transparent cursor-pointer`}
                  onClick={() => openServiceDetails(service)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`${service.color} w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0`}>
                      {service.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold text-sm sm:text-base mb-1 ${isNight ? 'text-white' : 'text-gray-800'}`}>{service.name}</h3>
                      <div className={`space-y-1 text-xs ${isNight ? 'text-gray-400' : 'text-gray-600'}`}>
                        <p className="flex items-center gap-1 truncate">
                          <MapPin size={12} />
                          {service.address}
                        </p>
                        {service.phone && (
                          <p className="flex items-center gap-1">
                            <Phone size={12} />
                            {service.phone}
                          </p>
                        )}
                        {service.hours && (
                          <p className="flex items-center gap-1">
                            <Clock size={12} />
                            {service.hours}
                          </p>
                        )}
                        {service.distance && (
                          <p className="flex items-center gap-1 text-blue-500 font-semibold">
                            <Navigation size={12} />
                            {service.distance} km de você
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        openGoogleMaps(service);
                      }}
                      size="sm"
                      className="flex-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Navigation size={14} className="mr-2" />
                      Como Chegar
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        openStreetView(service);
                      }}
                      size="sm"
                      variant="outline"
                      className={`rounded-full ${isNight ? 'border-blue-500 text-blue-400 hover:bg-blue-900' : 'border-blue-500 text-blue-600 hover:bg-blue-50'}`}
                    >
                      <ExternalLink size={14} className="mr-1" />
                      Street View
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Mensagem se não houver resultados */}
            {services.length === 0 && (
              <div className="text-center py-12">
                <MapPin size={48} className={`mx-auto mb-4 ${isNight ? 'text-gray-600' : 'text-gray-300'}`} />
                <p className={isNight ? 'text-gray-400' : 'text-gray-500'}>Nenhum local encontrado para esta categoria</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialog de Detalhes */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className={`rounded-3xl max-w-lg ${isNight ? 'bg-slate-800 text-white' : ''}`}>
          {selectedService && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className={`${selectedService.color} w-12 h-12 rounded-full flex items-center justify-center text-2xl`}>
                    {selectedService.icon}
                  </div>
                  <span>{selectedService.name}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className={`p-4 ${isNight ? 'bg-slate-700' : 'bg-gray-50'} rounded-xl space-y-3`}>
                  <div className="flex items-start gap-2">
                    <MapPin size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className={`text-sm font-bold ${isNight ? 'text-white' : 'text-gray-800'}`}>Endereço</p>
                      <p className={`text-sm ${isNight ? 'text-gray-300' : 'text-gray-600'}`}>{selectedService.address}</p>
                    </div>
                  </div>
                  {selectedService.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={18} className="text-blue-500" />
                      <div>
                        <p className={`text-sm font-bold ${isNight ? 'text-white' : 'text-gray-800'}`}>Telefone</p>
                        <p className={`text-sm ${isNight ? 'text-gray-300' : 'text-gray-600'}`}>{selectedService.phone}</p>
                      </div>
                    </div>
                  )}
                  {selectedService.hours && (
                    <div className="flex items-start gap-2">
                      <Clock size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className={`text-sm font-bold ${isNight ? 'text-white' : 'text-gray-800'}`}>Horário</p>
                        <p className={`text-sm ${isNight ? 'text-gray-300' : 'text-gray-600'}`}>{selectedService.hours}</p>
                      </div>
                    </div>
                  )}
                  {selectedService.distance && (
                    <div className="flex items-center gap-2">
                      <Navigation size={18} className="text-green-500" />
                      <div>
                        <p className={`text-sm font-bold ${isNight ? 'text-white' : 'text-gray-800'}`}>Distância</p>
                        <p className="text-sm text-green-500 font-semibold">{selectedService.distance} km de você</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => openGoogleMaps(selectedService)}
                    className="flex-1 rounded-full bg-blue-600 hover:bg-blue-700 py-6"
                  >
                    <Navigation size={20} className="mr-2" />
                    Google Maps
                  </Button>
                  <Button
                    onClick={() => openStreetView(selectedService)}
                    variant="outline"
                    className={`flex-1 rounded-full py-6 ${isNight ? 'border-blue-500 text-blue-400' : 'border-blue-500 text-blue-600'}`}
                  >
                    <ExternalLink size={20} className="mr-2" />
                    Street View
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog do Local Mais Próximo */}
      <Dialog open={showNearestModal} onOpenChange={setShowNearestModal}>
        <DialogContent className={`rounded-3xl max-w-lg ${isNight ? 'bg-slate-800 text-white' : ''}`}>
          {nearestLocation && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Target className="text-green-500" size={24} />
                  <span>{t('nearestLocation')}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className={`flex items-center gap-4 p-4 ${isNight ? 'bg-green-900/30' : 'bg-green-50'} rounded-xl`}>
                  <div className={`${nearestLocation.color} w-14 h-14 rounded-full flex items-center justify-center text-3xl`}>
                    {nearestLocation.icon}
                  </div>
                  <div>
                    <h3 className={`font-bold ${isNight ? 'text-white' : 'text-gray-800'}`}>{nearestLocation.name}</h3>
                    <p className="text-green-500 font-semibold text-lg">{nearestLocation.distance} km</p>
                  </div>
                </div>
                <div className={`p-4 ${isNight ? 'bg-slate-700' : 'bg-gray-50'} rounded-xl space-y-3`}>
                  <div className="flex items-start gap-2">
                    <MapPin size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className={`text-sm font-bold ${isNight ? 'text-white' : 'text-gray-800'}`}>Endereço</p>
                      <p className={`text-sm ${isNight ? 'text-gray-300' : 'text-gray-600'}`}>{nearestLocation.address}</p>
                    </div>
                  </div>
                  {nearestLocation.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={18} className="text-blue-500" />
                      <div>
                        <p className={`text-sm font-bold ${isNight ? 'text-white' : 'text-gray-800'}`}>Telefone</p>
                        <p className={`text-sm ${isNight ? 'text-gray-300' : 'text-gray-600'}`}>{nearestLocation.phone}</p>
                      </div>
                    </div>
                  )}
                  {nearestLocation.hours && (
                    <div className="flex items-start gap-2">
                      <Clock size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className={`text-sm font-bold ${isNight ? 'text-white' : 'text-gray-800'}`}>Horário</p>
                        <p className={`text-sm ${isNight ? 'text-gray-300' : 'text-gray-600'}`}>{nearestLocation.hours}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => openGoogleMaps(nearestLocation)}
                    className="flex-1 rounded-full bg-green-500 hover:bg-green-600 py-6"
                  >
                    <Navigation size={20} className="mr-2" />
                    Ir Agora
                  </Button>
                  <Button
                    onClick={() => openStreetView(nearestLocation)}
                    variant="outline"
                    className={`flex-1 rounded-full py-6 ${isNight ? 'border-green-500 text-green-400' : 'border-green-500 text-green-600'}`}
                  >
                    <ExternalLink size={20} className="mr-2" />
                    Street View
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
