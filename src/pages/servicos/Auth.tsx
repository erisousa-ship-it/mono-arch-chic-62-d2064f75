import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { SEOHead } from '@/components/SEOHead';

export default function ServicosAuth() {
  const [params] = useSearchParams();
  const [isLogin, setIsLogin] = useState(params.get('mode') !== 'register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/servicos/home', { replace: true });
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate('/servicos/home', { replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/servicos/home`,
            data: { display_name: name },
          },
        });
        if (error) throw error;
        if (!data.session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) throw signInError;
        }
        toast({ title: 'Conta criada', description: 'Bem-vindo!' });
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <SEOHead title={isLogin ? 'Entrar — PertoDeMimServicos' : 'Cadastrar — PertoDeMimServicos'} description="Acesse a plataforma solidária PertoDeMimServicos." />
      <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-2xl shadow-lg">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-orange-400 rounded-lg flex items-center justify-center text-white font-bold text-xl mb-3">W</div>
          <h1 className="text-2xl font-bold">{isLogin ? 'Entrar' : 'Criar conta'}</h1>
          <p className="text-sm text-gray-500 mt-1">{isLogin ? 'Bem-vindo de volta' : 'Junte-se à rede solidária'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <Input type="text" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
          )}
          <Input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Senha (mín. 6 caracteres)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <Button type="submit" disabled={loading} className="w-full bg-green-500 hover:bg-green-600 text-white h-11 rounded-full">
            {loading ? 'Carregando...' : isLogin ? 'Entrar' : 'Cadastrar'}
          </Button>
        </form>

        <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-green-600 hover:underline w-full text-center">
          {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
        </button>

        <div className="text-center">
          <Link to="/servicos" className="text-xs text-gray-500 hover:underline">← Voltar para o início</Link>
        </div>
      </div>
    </div>
  );
}
