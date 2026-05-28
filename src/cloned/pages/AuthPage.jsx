import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../ClonedAuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Check, User, Heart, Shield, MapPin, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getOrCreateSvcProfile, normalizeAuthUser } from '../lib/authProfile';
import jataiWorkImage from '@/assets/jatai-work.jpg';
import { CUSTOM_CATEGORY_VALUE, WORK_SERVICE_CATEGORIES, slugifyCategoryName } from '../lib/serviceCategories';

const HELP_CATEGORIES = WORK_SERVICE_CATEGORIES;

const professionalAreas = [
  { value: 'legal', label: 'Jurídico', icon: '⚖️' },
  { value: 'health', label: 'Saúde', icon: '🏥' },
  { value: 'education', label: 'Educação', icon: '📚' },
  { value: 'translation', label: 'Tradução', icon: '🌍' },
  { value: 'family', label: 'Família e Social', icon: '👨‍👩‍👧' },
  { value: 'employment', label: 'Orientação Profissional', icon: '💼' },
  { value: 'housing', label: 'Habitação', icon: '🏠' },
  { value: 'administration', label: 'Administração', icon: '📋' },
  { value: 'finance', label: 'Finanças', icon: '💰' },
  { value: 'technology', label: 'Tecnologia', icon: '💻' }
];

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const roleFromUrl = searchParams.get('role');
  const nextPath = searchParams.get('next');
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState(roleFromUrl || 'migrant');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  // Categorias selecionadas
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [customCategory, setCustomCategory] = useState('');
  
  // Localização
  const [location, setLocation] = useState(null);
  const [showLocation, setShowLocation] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationAddress, setLocationAddress] = useState('');
  
  // Campos para voluntários (cadastro rápido)
  const [professionalArea, setProfessionalArea] = useState('legal');
  const [specialties, setSpecialties] = useState('');
  const [availability, setAvailability] = useState('');
  const [experience, setExperience] = useState('');

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const getPostAuthPath = () => {
    if (nextPath?.startsWith('/') && !nextPath.startsWith('//')) return nextPath;
    return '/home';
  };

  const toggleCategory = (category) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Seu navegador não suporta geolocalização');
      return;
    }

    setLoadingLocation(true);
    
    toast.info('📍 Solicitando permissão de localização...', {
      description: 'Por favor, permita o acesso à sua localização quando solicitado pelo navegador',
      duration: 5000
    });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        
        // Tentar obter endereço via Nominatim (OpenStreetMap)
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            {
              headers: {
                'User-Agent': 'PertoDeMimServicos-App'
              }
            }
          );
          const data = await response.json();
          if (data.display_name) {
            setLocationAddress(data.display_name);
          }
        } catch (error) {
          console.error('Error getting address:', error);
          setLocationAddress('Endereço não disponível');
        }
        
        setLoadingLocation(false);
        toast.success('✅ Localização obtida com sucesso!', {
          description: 'Sua localização foi capturada e será salva no seu perfil'
        });
      },
      (error) => {
        setLoadingLocation(false);
        console.error('Geolocation error:', error);
        
        let errorMessage = 'Erro ao obter localização';
        let errorDescription = '';

        if (error.code === 1) {
          errorMessage = '🔒 Permissão de localização negada';
          errorDescription = 'Você negou o acesso à localização. Ative nas configurações do navegador/celular para usar este recurso.';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Se é cadastro de migrante ou helper e está na etapa 1, vai para etapa 2
    if (!isLogin && (role === 'migrant' || role === 'helper') && step === 1) {
      setStep(2);
      return;
    }
    
    // Se é helper e está na etapa 2, vai para etapa 3 (localização)
    if (!isLogin && role === 'helper' && step === 2) {
      if (selectedCategories.length === 0) {
        toast.error('Selecione pelo menos uma categoria que você quer ajudar');
        return;
      }
      setStep(3);
      return;
    }
    
    // Validação para migrantes
    if (!isLogin && role === 'migrant' && selectedCategories.length === 0) {
      toast.error('Selecione pelo menos uma categoria de ajuda que você precisa');
      return;
    }

    if (!isLogin && selectedCategories.includes(CUSTOM_CATEGORY_VALUE) && !customCategory.trim()) {
      toast.error('Escreva sua categoria');
      return;
    }

    const categoriesForProfile = selectedCategories.includes(CUSTOM_CATEGORY_VALUE)
      ? [...selectedCategories.filter((category) => category !== CUSTOM_CATEGORY_VALUE), slugifyCategoryName(customCategory) || 'outros']
      : selectedCategories;
    
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const profile = await getOrCreateSvcProfile(data.user);
        await login(data.session?.access_token, normalizeAuthUser(data.user, profile));
        toast.success('Login bem-sucedido!');
        navigate(getPostAuthPath(), { replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/home`,
            data: { display_name: name, role, location: locationAddress },
          },
        });
        if (error) throw error;

        if (data.session) {
          const profile = await getOrCreateSvcProfile(data.user, {
            display_name: name,
            role,
            city: locationAddress,
            categories: categoriesForProfile,
          });
          await login(data.session.access_token, normalizeAuthUser(data.user, profile));
          toast.success('Conta criada com sucesso!');
          navigate(getPostAuthPath(), { replace: true });
        } else {
          toast.success('Verifique seu email para confirmar a conta');
          setIsLogin(true);
          setStep(1);
        }
      }
    } catch (error) {
      toast.error(error.message || 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigate('/');
    }
  };

  const getStepTitle = () => {
    if (isLogin) return t('login');
    if (step === 1) return t('register');
    if (step === 2) {
      if (role === 'migrant') return 'O que você precisa?';
      if (role === 'helper') return 'Como você quer ajudar?';
    }
    if (step === 3 && role === 'helper') return 'Sua Localização';
    return t('register');
  };

  const getStepSubtitle = () => {
    if (step === 2 && role === 'migrant') return 'Selecione as áreas em que você precisa de ajuda';
    if (step === 2 && role === 'helper') return 'Selecione as áreas em que você pode oferecer ajuda';
    if (step === 3 && role === 'helper') return 'Compartilhe sua localização para ajudar pessoas próximas';
    return null;
  };

  const getTotalSteps = () => {
    if (role === 'helper') return 3;
    if (role === 'migrant') return 2;
    return 1;
  };

  return (
    <div className="min-h-screen flex">
      {/* Lado Esquerdo - Imagem de Fundo */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Imagem de trabalho em Jataí */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700"
          style={{ backgroundImage: `url(${jataiWorkImage})` }}
        />
        {/* Overlay verde Goiás → âmbar */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/75 via-primary/50 to-secondary/60" />

        {/* Conteúdo sobre a imagem */}
        <div className="relative z-10 flex flex-col justify-center items-center text-primary-foreground p-12 text-center">
          <h1 className="text-4xl font-bold mb-4">
            {role === 'helper' ? 'Ofereça Trabalho' : 'Encontre Trabalho em Jataí'}
          </h1>
          <p className="text-xl text-primary-foreground/90 max-w-md">
            {role === 'helper'
              ? 'Conecte-se com profissionais qualificados da região de Goiás e impulsione seu negócio.'
              : 'Acesse vagas, demandas e oportunidades de trabalho em Jataí e região do Cerrado.'}
          </p>
          <div className="mt-8 flex items-center gap-4">
            <div className="bg-background/20 backdrop-blur-sm rounded-full px-6 py-3 border border-background/30">
              <span className="text-lg font-semibold">+500 oportunidades em Jataí</span>
            </div>
          </div>
        </div>
      </div>


      {/* Lado Direito - Formulário */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 gradient-bg">
        <button
          onClick={goBack}
          className="absolute top-6 left-6 p-2 rounded-full hover:bg-white/50 transition-all lg:left-auto lg:right-6"
          data-testid="back-button"
        >
          <ArrowLeft size={24} />
        </button>

        <div className="w-full max-w-md bg-white rounded-3xl shadow-card p-8 animate-fade-in" data-testid="auth-form">
        {/* Step indicator for registration */}
        {!isLogin && (role === 'migrant' || role === 'helper') && (
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2">
              {[...Array(getTotalSteps())].map((_, idx) => (
                <React.Fragment key={idx}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    step > idx ? 'bg-primary text-white' : step === idx + 1 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step > idx + 1 ? <Check size={16} /> : idx + 1}
                  </div>
                  {idx < getTotalSteps() - 1 && (
                    <div className={`w-8 h-1 ${step > idx + 1 ? 'bg-primary' : 'bg-gray-200'}`}></div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        <h2 className="text-3xl font-heading font-bold text-textPrimary mb-2 text-center">
          {getStepTitle()}
        </h2>
        
        {getStepSubtitle() && (
          <p className="text-center text-textSecondary mb-6">
            {getStepSubtitle()}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step 1: Basic Information */}
          {(isLogin || step === 1) && (
            <>
              {!isLogin && (
                <div>
                  <Label htmlFor="name">{t('name')}</Label>
                  <Input
                    id="name"
                    data-testid="name-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLogin}
                    className="rounded-xl"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  data-testid="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-xl"
                />
              </div>

              <div>
                <Label htmlFor="password">{t('password')}</Label>
                <Input
                  id="password"
                  data-testid="password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="rounded-xl"
                />
              </div>

              {!isLogin && (
                <div>
                  <Label>Você é</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <button
                      type="button"
                      data-testid="role-migrant"
                      onClick={() => { setRole('migrant'); setSelectedCategories([]); }}
                      className={`py-4 px-3 rounded-xl font-medium transition-all text-sm flex flex-col items-center gap-2 ${
                        role === 'migrant'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <User size={24} />
                      <span>{t('needHelp')}</span>
                    </button>
                    <button
                      type="button"
                      data-testid="role-helper"
                      onClick={() => { setRole('helper'); setSelectedCategories([]); }}
                      className={`py-4 px-3 rounded-xl font-medium transition-all text-sm flex flex-col items-center gap-2 ${
                        role === 'helper'
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Heart size={24} />
                      <span>{t('wantToHelp')}</span>
                    </button>
                  </div>
                </div>
              )}

              {!isLogin && role === 'volunteer' && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-xl border-2 border-primary/20">
                  <h3 className="font-bold text-primary flex items-center gap-2">
                    <Shield size={20} />
                    Informações Profissionais
                  </h3>
                  
                  <div>
                    <Label>Área de Atuação</Label>
                    <select
                      value={professionalArea}
                      onChange={(e) => setProfessionalArea(e.target.value)}
                      className="w-full mt-1 p-3 border rounded-xl bg-white"
                    >
                      {professionalAreas.map(area => (
                        <option key={area.value} value={area.value}>
                          {area.icon} {area.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>Especialidades (separadas por vírgula)</Label>
                    <Input
                      value={specialties}
                      onChange={(e) => setSpecialties(e.target.value)}
                      placeholder="Ex: Direito de Família, Asilo, Imigração"
                      className="rounded-xl mt-1"
                    />
                  </div>

                  <div>
                    <Label>Disponibilidade</Label>
                    <Input
                      value={availability}
                      onChange={(e) => setAvailability(e.target.value)}
                      placeholder="Ex: Fins de semana, Noites"
                      className="rounded-xl mt-1"
                    />
                  </div>

                  <div>
                    <Label>Experiência</Label>
                    <textarea
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      placeholder="Descreva sua experiência profissional..."
                      rows={3}
                      className="w-full mt-1 p-3 border rounded-xl bg-white"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step 2: Categories (for migrants and helpers) */}
          {!isLogin && step === 2 && (role === 'migrant' || role === 'helper') && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {HELP_CATEGORIES.map(cat => {
                  const categoryValue = cat.value === 'outros' ? CUSTOM_CATEGORY_VALUE : cat.value;
                  const selected = selectedCategories.includes(categoryValue);
                  return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => toggleCategory(categoryValue)}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      selected
                        ? role === 'migrant' 
                          ? 'bg-green-600 text-white border-green-600 shadow-lg'
                          : 'bg-primary text-white border-primary shadow-lg'
                        : 'bg-white border-gray-200 hover:border-primary hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{cat.icon}</span>
                      <div>
                        <div className={`text-sm font-bold ${selected ? 'text-white' : 'text-textPrimary'}`}>
                          {cat.label}
                        </div>
                        <div className={`text-xs ${selected ? 'text-white/80' : 'text-textSecondary'}`}>
                          {cat.desc}
                        </div>
                      </div>
                    </div>
                  </button>
                  );
                })}
              </div>
              {selectedCategories.includes(CUSTOM_CATEGORY_VALUE) && (
                <Input
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Escreva sua categoria. Ex: soldador, confeiteiro"
                  maxLength={40}
                  className="rounded-xl"
                />
              )}
              
              {selectedCategories.length > 0 && (
                <div className={`p-3 rounded-xl border ${
                  role === 'migrant' 
                    ? 'bg-green-100 border-green-300' 
                    : 'bg-primary/10 border-primary/30'
                }`}>
                  <p className={`text-sm font-medium flex items-center gap-2 ${
                    role === 'migrant' ? 'text-green-800' : 'text-primary'
                  }`}>
                    <Check size={18} />
                    {selectedCategories.length} categoria{selectedCategories.length > 1 ? 's' : ''} selecionada{selectedCategories.length > 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Location (for helpers only) */}
          {!isLogin && step === 3 && role === 'helper' && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-2xl p-6 border-2 border-blue-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <MapPin size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-textPrimary">Localização</h3>
                    <p className="text-sm text-textSecondary">Ajude pessoas próximas de você</p>
                  </div>
                </div>

                {!location ? (
                  <Button
                    type="button"
                    onClick={getLocation}
                    disabled={loadingLocation}
                    className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {loadingLocation ? (
                      <>
                        <Loader2 size={18} className="mr-2 animate-spin" />
                        Obtendo localização...
                      </>
                    ) : (
                      <>
                        <MapPin size={18} className="mr-2" />
                        Obter Minha Localização
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-green-100 rounded-xl p-3 border border-green-300">
                      <p className="text-green-800 text-sm font-medium flex items-center gap-2">
                        <Check size={18} />
                        Localização obtida!
                      </p>
                      {locationAddress && (
                        <p className="text-green-700 text-xs mt-1 line-clamp-2">{locationAddress}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      onClick={getLocation}
                      variant="outline"
                      size="sm"
                      className="w-full rounded-xl"
                    >
                      Atualizar Localização
                    </Button>
                  </div>
                )}
              </div>

              {/* Opção de mostrar localização */}
              <div className="bg-yellow-50 rounded-2xl p-4 border-2 border-yellow-200">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLocation}
                    onChange={(e) => setShowLocation(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div>
                    <p className="font-medium text-textPrimary">Mostrar minha localização no mapa</p>
                    <p className="text-sm text-textSecondary">
                      Pessoas que precisam de ajuda poderão ver você no mapa de ajudantes próximos
                    </p>
                  </div>
                </label>
              </div>

              <p className="text-xs text-center text-textMuted">
                Você pode alterar essa configuração a qualquer momento no seu perfil
              </p>
            </div>
          )}

          <Button
            type="submit"
            data-testid="submit-button"
            disabled={loading}
            className={`w-full rounded-full py-6 text-lg font-bold ${
              role === 'migrant' && !isLogin
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-primary hover:bg-primary-hover'
            }`}
          >
            {loading ? 'Carregando...' : (
              isLogin ? t('login') : (
                (step < getTotalSteps()) ? t('next') : t('register')
              )
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            data-testid="toggle-auth-mode"
            onClick={() => {
              setIsLogin(!isLogin);
              setStep(1);
              setSelectedCategories([]);
              setLocation(null);
              setShowLocation(false);
            }}
            className="text-textSecondary hover:text-primary transition-colors"
          >
            {isLogin ? t('noAccount') : t('hasAccount')}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
