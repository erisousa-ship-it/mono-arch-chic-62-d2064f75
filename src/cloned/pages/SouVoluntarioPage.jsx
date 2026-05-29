import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Star } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function SouVoluntarioPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <header className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
          <ArrowLeft className="w-5 h-5" /> Voltar
        </button>
        <Button onClick={() => navigate('/auth?mode=register&role=volunteer')} className="rounded-full">
          Cadastrar como voluntário
        </Button>
      </header>

      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full mb-6 font-medium">
          <Shield className="w-4 h-4" /> Sou voluntário
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">Voluntário profissional verificado</h1>
        <p className="text-lg text-gray-600 max-w-2xl mb-10">
          Para advogados, médicos, psicólogos, tradutores e demais profissionais que querem oferecer serviços voluntários a quem precisa.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {[
            { t: 'Perfil verificado', d: 'Validamos sua área profissional e especialidades.' },
            { t: 'Atendimentos pro bono', d: 'Defina disponibilidade e seja contactado conforme sua agenda.' },
            { t: 'Selo de confiança', d: 'Voluntários verificados recebem destaque na plataforma.' },
            { t: 'Comunidade ativa', d: 'Conecte-se com outros profissionais voluntários.' },
          ].map((s, i) => (
            <div key={i} className="p-6 bg-white rounded-2xl shadow-sm border flex gap-4">
              <Star className="w-6 h-6 text-blue-500 fill-blue-500 shrink-0 mt-1" />
              <div>
                <h3 className="font-bold mb-1">{s.t}</h3>
                <p className="text-sm text-gray-600">{s.d}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button
            onClick={() => navigate('/auth?mode=register&role=volunteer')}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full h-14 px-10 text-base"
          >
            Quero ser voluntário
          </Button>
        </div>
      </section>
    </div>
  );
}