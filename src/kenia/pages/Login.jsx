import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/kenia/contexts/AuthContext";
import { api } from "@/kenia/lib/api";
import { lovable } from "@/integrations/lovable";
import { shouldUseExternalGoogleOAuth, signInWithExternalGoogleOAuth } from "@/kenia/lib/externalGoogleOAuth";
import { Button } from "@/kenia/components/ui/button";
import { Input } from "@/kenia/components/ui/input";
import { Label } from "@/kenia/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/kenia/components/ui/tabs";
import { Card } from "@/kenia/components/ui/card";
import { Gem, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const HERO_IMG =
  "https://customer-assets.emergentagent.com/job_nude-gold-dashboard/artifacts/3q8ey4x2_5.IMG_8848.jpg";
const LOGO_IMG =
  "https://customer-assets.emergentagent.com/job_nude-gold-dashboard/artifacts/ckw9kwam_IMG-20241228-WA0003.jpg";

export default function Login() {
  const navigate = useNavigate();
  const { login, register, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loginData, setLoginData] = useState({
    email: "admin@kenia-garcia.com.br",
    password: "Kenia@Admin2026",
  });

  const [regData, setRegData] = useState({ name: "", email: "", password: "", oab: "" });

  const handleForgotPassword = async () => {
    const email = (loginData.email || "").trim();
    if (!email) {
      toast.error("Digite seu e-mail no campo acima para receber o link");
      return;
    }
    setLoading(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("E-mail de recuperação enviado. Verifique sua caixa de entrada.");
    } catch (err) {
      toast.error(err?.message || "Erro ao enviar e-mail");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(loginData.email, loginData.password);
      toast.success("Bem-vinda de volta");
      const done = localStorage.getItem("onboarding_done");
      navigate(done ? "/app" : "/app/onboarding");
    } catch (err) {
      toast.error(err?.message || "Erro ao entrar");
    } finally { setLoading(false); }
  };
  // Após o callback do Google, o lovable SDK detecta os tokens na URL e dispara
  // onAuthStateChange. Quando o user ficar disponível, encaminhamos para /app.
  useEffect(() => {
    if (user) {
      const done = localStorage.getItem("onboarding_done");
      navigate(done ? "/app" : "/app/onboarding", { replace: true });
    }
  }, [user, navigate]);

  const handleOAuth = async (provider) => {
    setLoading(true);
    try {
      const result = provider === "google" && shouldUseExternalGoogleOAuth()
        ? await signInWithExternalGoogleOAuth()
        : await lovable.auth.signInWithOAuth(provider, {
            redirect_uri: `${window.location.origin}/login`,
          });
      if (result?.error) throw result.error;
      if (result?.redirected) return;
      const done = localStorage.getItem("onboarding_done");
      navigate(done ? "/app" : "/app/onboarding");
    } catch (err) {
      toast.error(err?.message || `Erro ao entrar com ${provider}`);
      setLoading(false);
    }
  };
  const handleGoogle = () => handleOAuth("google");
  const handleApple = () => handleOAuth("apple");



  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regData.name || !regData.email || regData.password.length < 6) {
      toast.error("Preencha nome, e-mail e senha (mín. 6 caracteres)"); return;
    }
    setLoading(true);
    try {
      await register(regData);
      toast.success("Conta criada. Vamos configurar seu escritório.");
      navigate("/app/onboarding");
    } catch (err) {
      toast.error(err?.message || "Erro no cadastro");
    } finally { setLoading(false); }
  };


  return (
    <div className="min-h-screen bg-background flex" data-testid="login-page">
      {/* Hero — editorial split */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        data-testid="login-hero"
      >
        <img
          src={HERO_IMG}
          alt="Escritório de advocacia"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-nude-900/80 via-nude-900/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-nude-900 via-transparent to-transparent" />

        <div className="relative z-10 w-full p-12 flex flex-col justify-between text-nude-50">
          <Link to="/" className="flex items-center gap-4" data-testid="login-logo-desktop">
            <img
              src={LOGO_IMG}
              alt="Kênia Garcia Advocacia"
              className="w-14 h-14 rounded-md object-cover shadow-md shadow-gold-900/30 ring-1 ring-gold-300/40"
            />
            <div>
              <div className="font-serif text-2xl leading-none tracking-tight">
                Kênia Garcia
              </div>
              <div className="overline text-gold-300 mt-1.5">Advocacia · IA</div>
            </div>
          </Link>

          <div className="max-w-lg animate-fade-up">
            <div className="overline text-gold-300 mb-5">Estúdio Jurídico Inteligente</div>
            <h2 className="font-serif text-5xl leading-[1.05] tracking-tight text-nude-50">
              Onde a <em className="text-gold-300 not-italic">tradição</em> encontra a
              <br />
              <span className="italic text-gold-200">inteligência</span>.
            </h2>
            <div className="gold-divider my-8" />
            <p className="font-serif italic text-lg text-nude-100/90 leading-relaxed">
              "Mas recebereis poder, ao descer sobre vós o Espírito Santo."
            </p>
            <p className="overline text-gold-300 mt-3">Atos 1:8</p>
          </div>

          <div className="overline text-nude-200/60">© 2026 Kênia Garcia Advocacia</div>
        </div>
      </div>

      {/* Form side — cream paper */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 paper-grain">
        <div className="w-full max-w-md animate-fade-up">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <img
              src={LOGO_IMG}
              alt="Kênia Garcia Advocacia"
              className="w-12 h-12 rounded-md object-cover ring-1 ring-gold-300/40"
              data-testid="login-logo-mobile"
            />
            <span className="font-serif text-2xl text-nude-900">Kênia Garcia</span>
          </div>

          <div className="mb-8">
            <div className="overline text-gold-600 mb-3">Acesso ao painel</div>
            <h1 className="font-serif text-4xl text-nude-900 leading-tight">
              Boa volta<span className="text-gold-500">.</span>
            </h1>
            <p className="text-sm text-nude-500 mt-2 font-sans-body">
              Seu estúdio jurídico inteligente te aguarda.
            </p>
          </div>

          <Card className="p-8 border-nude-200 shadow-sm shadow-nude-900/5 bg-card">
            <Tabs defaultValue="login">
              <TabsList
                className="grid w-full grid-cols-2 bg-nude-100 border border-nude-200"
                data-testid="auth-tabs"
              >
                <TabsTrigger
                  value="login"
                  data-testid="tab-login"
                  className="data-[state=active]:bg-card data-[state=active]:text-gold-600 data-[state=active]:shadow-sm text-nude-600 font-medium"
                >
                  Entrar
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  data-testid="tab-register"
                  className="data-[state=active]:bg-card data-[state=active]:text-gold-600 data-[state=active]:shadow-sm text-nude-600 font-medium"
                >
                  Criar conta
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-6">
                <form onSubmit={handleLogin} className="space-y-5" data-testid="login-form">
                  <div>
                    <Label className="text-nude-700 font-medium text-xs tracking-wider uppercase">
                      E-mail
                    </Label>
                    <Input
                      type="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      data-testid="login-email"
                      className="mt-1.5 h-11 bg-card border-nude-200 focus-visible:ring-gold-400"
                    />
                  </div>
                  <div>
                    <Label className="text-nude-700 font-medium text-xs tracking-wider uppercase">
                      Senha
                    </Label>
                    <Input
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      data-testid="login-password"
                      className="mt-1.5 h-11 bg-card border-nude-200 focus-visible:ring-gold-400"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white font-medium shadow-sm shadow-gold-900/10 transition-all"
                    data-testid="login-submit"
                  >
                    {loading ? "Entrando..." : "Acessar painel"}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={loading}
                    className="w-full text-xs text-gold-700 hover:text-gold-800 underline-offset-2 hover:underline text-right"
                    data-testid="login-forgot"
                  >
                    Esqueci minha senha
                  </button>
                  <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-nude-200" /></div>
                    <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-nude-500 uppercase tracking-wider">ou</span></div>
                  </div>
                  <Button
                    type="button"
                    onClick={handleGoogle}
                    disabled={loading}
                    variant="outline"
                    className="w-full h-11 border-nude-200 hover:bg-nude-50 text-nude-800 font-medium"
                    data-testid="login-google"
                  >
                    <svg className="mr-2 w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Entrar com Google
                  </Button>
                  <Button
                    type="button"
                    onClick={handleApple}
                    disabled={loading}
                    variant="outline"
                    className="w-full h-11 border-nude-200 hover:bg-nude-50 text-nude-800 font-medium"
                    data-testid="login-apple"
                  >
                    <svg className="mr-2 w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 12.04c-.03-2.96 2.42-4.39 2.53-4.46-1.38-2.02-3.53-2.3-4.29-2.32-1.82-.18-3.56 1.07-4.49 1.07-.94 0-2.36-1.05-3.88-1.02-2 .03-3.84 1.16-4.87 2.95-2.08 3.6-.53 8.93 1.49 11.85.99 1.43 2.16 3.03 3.69 2.97 1.49-.06 2.05-.96 3.85-.96 1.8 0 2.3.96 3.87.93 1.6-.03 2.61-1.45 3.59-2.89 1.13-1.66 1.6-3.27 1.62-3.36-.04-.02-3.11-1.19-3.14-4.72zM14.31 3.5c.83-1 1.39-2.4 1.23-3.78-1.19.05-2.62.79-3.48 1.79-.77.89-1.44 2.31-1.26 3.66 1.32.1 2.68-.67 3.51-1.67z"/></svg>
                    Entrar com Apple
                  </Button>
                  <p className="text-xs text-nude-500 text-center font-sans-body">
                    Admin: <span className="text-gold-700 font-medium">admin@kenia-garcia.com.br</span>
                    {" / "}
                    <span className="text-gold-700 font-medium">Kenia@Admin2026</span>
                  </p>

                </form>
              </TabsContent>

              <TabsContent value="register" className="mt-6">
                <form onSubmit={handleRegister} className="space-y-5" data-testid="register-form">
                  <div>
                    <Label className="text-nude-700 font-medium text-xs tracking-wider uppercase">
                      Nome completo
                    </Label>
                    <Input
                      value={regData.name}
                      onChange={(e) => setRegData({ ...regData, name: e.target.value })}
                      data-testid="register-name"
                      className="mt-1.5 h-11 bg-card border-nude-200 focus-visible:ring-gold-400"
                    />
                  </div>
                  <div>
                    <Label className="text-nude-700 font-medium text-xs tracking-wider uppercase">
                      E-mail
                    </Label>
                    <Input
                      type="email"
                      value={regData.email}
                      onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                      data-testid="register-email"
                      className="mt-1.5 h-11 bg-card border-nude-200 focus-visible:ring-gold-400"
                    />
                  </div>
                  <div>
                    <Label className="text-nude-700 font-medium text-xs tracking-wider uppercase">
                      OAB (opcional)
                    </Label>
                    <Input
                      placeholder="Ex: 123456/SP"
                      value={regData.oab}
                      onChange={(e) => setRegData({ ...regData, oab: e.target.value })}
                      data-testid="register-oab"
                      className="mt-1.5 h-11 bg-card border-nude-200 focus-visible:ring-gold-400"
                    />
                  </div>
                  <div>
                    <Label className="text-nude-700 font-medium text-xs tracking-wider uppercase">
                      Senha
                    </Label>
                    <Input
                      type="password"
                      value={regData.password}
                      onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                      data-testid="register-password"
                      className="mt-1.5 h-11 bg-card border-nude-200 focus-visible:ring-gold-400"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white font-medium shadow-sm transition-all"
                    data-testid="register-submit"
                  >
                    {loading ? "Criando..." : "Criar conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
