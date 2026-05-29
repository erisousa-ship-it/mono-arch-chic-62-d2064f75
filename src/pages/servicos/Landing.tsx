import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Search, Wrench, MapPin, Star } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import CountryMonuments from '@/components/CountryMonuments';

export default function ServicosLanding() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}>
      <SEOHead title="PertoDeMimServicos — Apoio para Migrantes" description="Plataforma solidária conectando migrantes e voluntários." />

      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-orange-400 rounded-lg flex items-center justify-center text-white font-bold text-lg">W</div>
            <div className="flex flex-col">
              <span className="text-xl font-bold">
                <span className="text-green-500">Wati</span>
                <span className="text-orange-500">zat</span>
              </span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">Apoio para Migrantes</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={() => navigate('/servicos/auth')} className="border-gray-300 rounded-full">Entrar</Button>
            <Button onClick={() => navigate('/servicos/auth?mode=register')} className="bg-gray-900 hover:bg-gray-800 text-white rounded-full">Cadastrar-se</Button>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center space-x-2 bg-green-50 px-4 py-2 rounded-full mb-4">
              <span className="text-green-600 font-semibold flex items-center space-x-1">
                <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                <span>4.9/5</span>
              </span>
              <span className="text-gray-600 text-sm">+500 pessoas ajudadas</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              Conectando migrantes
              <br />
              <span className="text-green-600">e voluntários</span>
            </h1>
            <p className="text-lg text-gray-600 mb-4">A maior plataforma de apoio solidário para migrantes.</p>
            <div className="flex items-center space-x-2 mb-8 text-sm text-gray-600">
              <MapPin className="w-5 h-5 text-green-600" />
              <span>Disponível em várias cidades</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Button onClick={() => navigate('/servicos/auth?role=migrant')} className="bg-gray-900 hover:bg-gray-800 text-white h-14 px-8 text-base rounded-full">
                <Search className="w-5 h-5 mr-2" />Preciso de Ajuda
              </Button>
              <Button onClick={() => navigate('/servicos/auth?role=helper')} variant="outline" className="border-2 border-green-500 text-green-600 hover:bg-green-50 h-14 px-8 text-base rounded-full">
                <Wrench className="w-5 h-5 mr-2" />Quero Ajudar
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center"><p className="text-3xl font-bold text-green-600">500+</p><p className="text-sm text-gray-600">Migrantes apoiados</p></div>
              <div className="text-center"><p className="text-3xl font-bold text-green-600">200+</p><p className="text-sm text-gray-600">Voluntários ativos</p></div>
              <div className="text-center"><p className="text-3xl font-bold text-green-600">1.2k+</p><p className="text-sm text-gray-600">Conexões feitas</p></div>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-2xl">
            <img src="https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=85" alt="Comunidade PertoDeMimServicos" className="w-full h-[500px] object-cover" />
          </div>
        </div>
      </section>

      <CountryMonuments />

      <div className="bg-green-500 py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between">
          <p className="text-white text-lg font-medium mb-4 md:mb-0">Junte-se à rede solidária PertoDeMimServicos</p>
          <Button onClick={() => navigate('/servicos/auth?mode=register')} className="bg-white text-green-600 hover:bg-gray-100 rounded-full px-8 h-12">Começar Agora</Button>
        </div>
      </div>
    </div>
  );
}
