import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function OferecoAjudaPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <header className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
          <ArrowLeft className="w-5 h-5" /> Voltar
        </button>
        <Button onClick={() => navigate('/auth?mode=register&role=helper')} className="rounded-full">
          Quero ajudar agora
        </Button>
      </header>

      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-full mb-6 font-medium">
          <Heart className="w-4 h-4 fill-orange-500" /> Ofereço ajuda
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">Doe seu tempo e habilidades</h1>
        <p className="text-lg text-gray-600 max-w-2xl mb-10">
          Conecte-se com pessoas que precisam de apoio na sua região. Sem compromisso financeiro — apenas vontade de ajudar.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { t: 'Cadastre-se grátis', d: 'Crie seu perfil em menos de 2 minutos.' },
            { t: 'Escolha como ajudar', d: 'Selecione áreas em que pode oferecer apoio.' },
            { t: 'Faça a diferença', d: 'Receba pedidos de ajuda perto de você.' },
          ].map((s, i) => (
            <div key={i} className="p-6 bg-white rounded-2xl shadow-sm border">
              <CheckCircle2 className="w-8 h-8 text-orange-500 mb-3" />
              <h3 className="font-bold mb-2">{s.t}</h3>
              <p className="text-sm text-gray-600">{s.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button
            onClick={() => navigate('/auth?mode=register&role=helper')}
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-full h-14 px-10 text-base"
          >
            Começar a ajudar
          </Button>
        </div>
      </section>
    </div>
  );
}