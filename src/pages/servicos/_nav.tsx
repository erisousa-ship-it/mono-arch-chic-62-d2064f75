import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, Users, Plus, MessageCircle, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function SvcHeader({ onCreate }: { onCreate?: () => void }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const link = (to: string, label: string) => (
    <button
      onClick={() => navigate(to)}
      className={`hover:underline ${pathname === to ? 'font-semibold underline' : ''}`}
    >
      {label}
    </button>
  );
  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/servicos', { replace: true });
  };
  return (
    <header className="bg-green-600 text-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <button onClick={() => navigate('/servicos/home')}>
          <h1 className="text-lg font-bold">Jataí Região Trabalho</h1>
        </button>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          {link('/servicos/home', 'Acolhida')}
          {link('/servicos/ofertantes', 'Ofertantes')}
          {onCreate ? (
            <button onClick={onCreate} className="hover:underline">Demanda +</button>
          ) : link('/servicos/home', 'Demanda +')}
          {link('/servicos/assinatura', 'Assinatura')}
          {link('/servicos/chat', 'Mensagens')}
          {link('/servicos/perfil', 'Perfil')}
        </nav>
        <Button onClick={logout} variant="ghost" size="sm" className="text-white hover:bg-green-700">Sair</Button>
      </div>
    </header>
  );
}

export function SvcBottomNav({ active, onCreate }: { active: 'home' | 'ofertantes' | 'chat' | 'perfil'; onCreate?: () => void }) {
  const navigate = useNavigate();
  const cls = (k: string) => `flex flex-col items-center text-xs ${active === k ? 'text-green-600' : 'text-gray-500'}`;
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t flex items-center justify-around h-16 z-50">
      <button onClick={() => navigate('/servicos/home')} className={cls('home')}>
        <Home className="w-5 h-5 mb-0.5" />Início
      </button>
      <button onClick={() => navigate('/servicos/ofertantes')} className={cls('ofertantes')}>
        <Users className="w-5 h-5 mb-0.5" />Ofertantes
      </button>
      <button
        onClick={() => (onCreate ? onCreate() : navigate('/servicos/home'))}
        className="flex flex-col items-center text-white text-xs bg-green-600 rounded-full w-14 h-14 -mt-8 shadow-lg"
      >
        <Plus className="w-7 h-7" />
      </button>
      <button onClick={() => navigate('/servicos/chat')} className={cls('chat')}>
        <MessageCircle className="w-5 h-5 mb-0.5" />Mensagens
      </button>
      <button onClick={() => navigate('/servicos/perfil')} className={cls('perfil')}>
        <User className="w-5 h-5 mb-0.5" />Perfil
      </button>
    </nav>
  );
}
