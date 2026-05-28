import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/button';
import { Search, Briefcase, MapPin, Star } from 'lucide-react';
import i18n from '../i18n';
import AuthModal from '../components/AuthModal';
import goiasTrabalhoImg from '@/assets/goias-trabalho.jpg';

export default function LandingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [language, setLanguage] = useState((i18n.language || 'pt').toUpperCase().slice(0, 2));
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const openAuth = (mode) => { setAuthMode(mode); setAuthOpen(true); };

  const changeLanguage = (lang) => {
    const code = lang.toLowerCase();
    i18n.changeLanguage(code);
    setLanguage(lang);
  };

  return (
    <div
      className="min-h-screen bg-white"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}
    >
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-orange-400 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              W
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold">
                <span className="text-green-500">PertoDeMim</span>
                <span className="text-orange-500">Servicos</span>
              </span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">Trabalho em Goiás</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 text-xs sm:text-sm">
              {['PT', 'FR', 'EN', 'ES'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => changeLanguage(lang)}
                  data-testid={`lang-${lang.toLowerCase()}`}
                  className={`px-2 py-1 rounded ${language === lang ? 'bg-green-100 text-green-700 font-semibold' : 'text-gray-600 hover:text-green-600'}`}
                >
                  {lang}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={() => openAuth('login')}
              className="border-gray-300 rounded-full"
              data-testid="landing-login-btn"
            >
              {t('login') || 'Entrar'}
            </Button>
            <Button
              onClick={() => openAuth('signup')}
              className="bg-gray-900 hover:bg-gray-800 text-white rounded-full"
              data-testid="landing-register-btn"
            >
              {t('register') || 'Criar conta'}
            </Button>
          </div>
        </div>
      </header>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} mode={authMode} onModeChange={setAuthMode} />


      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="mb-8">
              <div className="inline-flex items-center space-x-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
                <span className="text-primary font-semibold flex items-center space-x-1">
                  <Star className="w-4 h-4 fill-secondary text-secondary" />
                  <span>4.9/5</span>
                </span>
                <span className="text-gray-600 text-sm">+2.000 vagas preenchidas em Goiás</span>
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              Seu próximo emprego
              <br />
              <span className="text-primary">está aqui em Goiás</span>
            </h1>
            <p className="text-lg text-gray-700 mb-2 font-medium">
              Conectamos trabalhadores e empresas em todo o estado — do Cerrado às grandes cidades.
            </p>
            <p className="text-base text-gray-600 mb-4">
              Agronegócio, indústria, comércio, serviços e tecnologia: encontre oportunidades reais perto de você ou anuncie sua vaga em minutos.
            </p>
            <div className="flex items-center space-x-2 mb-8 text-sm text-gray-600">
              <MapPin className="w-5 h-5 text-primary" />
              <span>Goiânia, Anápolis, Aparecida, Rio Verde, Jataí, Catalão e mais</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Button
                onClick={() => openAuth('signup')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground h-14 px-8 text-base rounded-full"
                data-testid="cta-need-help"
              >
                <Search className="w-5 h-5 mr-2" />
                Buscar Vagas
              </Button>
              <Button
                onClick={() => openAuth('signup')}
                variant="outline"
                className="border-2 border-secondary text-secondary-foreground bg-secondary/10 hover:bg-secondary/20 h-14 px-8 text-base rounded-full"
                data-testid="cta-want-help"
              >
                <Briefcase className="w-5 h-5 mr-2" />
                Publicar Vaga
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-8">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">2.000+</p>
                <p className="text-sm text-gray-600">Vagas ativas</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">800+</p>
                <p className="text-sm text-gray-600">Empresas parceiras</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">246</p>
                <p className="text-sm text-gray-600">Municípios goianos</p>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-2xl overflow-hidden shadow-2xl">
              <img
                src={goiasTrabalhoImg}
                alt="Trabalhadores de Goiás — agronegócio, indústria e serviços"
                width={1024}
                height={1024}
                className="w-full h-[500px] object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="bg-primary py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between">
          <div className="mb-4 md:mb-0">
            <p className="text-primary-foreground text-lg font-medium mb-1">
              Goiás está contratando. Não fique de fora.
            </p>
            <p className="text-primary-foreground/90 text-sm">
              Cadastre-se grátis e receba vagas da sua região direto no seu perfil.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => openAuth('signup')}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-8 rounded-full"
              data-testid="bottom-cta-register"
            >
              Cadastrar-se Grátis
            </Button>
          </div>
        </div>
      </div>

      {/* Trust badges */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
          <div className="p-6 bg-muted rounded-2xl">
            <div className="flex items-center justify-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-5 h-5 fill-secondary text-secondary" />
              ))}
              <span className="text-lg font-bold ml-2">4.9/5</span>
            </div>
            <p className="text-sm text-gray-600">Avaliado por trabalhadores em Goiás</p>
          </div>
          <div className="p-6 bg-muted rounded-2xl">
            <div className="flex items-center justify-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-5 h-5 fill-secondary text-secondary" />
              ))}
              <span className="text-lg font-bold ml-2">4.8/5</span>
            </div>
            <p className="text-sm text-gray-600">Recomendado por empresas contratantes</p>
          </div>
        </div>
      </div>
    </div>
  );
}
