import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/kenia/contexts/AuthContext";
import { Button } from "@/kenia/components/ui/button";
import { Input } from "@/kenia/components/ui/input";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Card } from "@/kenia/components/ui/card";
import { api } from "@/kenia/lib/api";
import { toast } from "sonner";
import {
  Scale, MessageCircle, KanbanSquare, FileText, Wallet,
  Sparkles, BarChart3, ArrowRight, Check, Bot, Mic, QrCode,
} from "lucide-react";

import HERO_IMG from "@/assets/escritorio-hero.jpg";
const LOGO_IMG = "https://customer-assets.emergentagent.com/job_nude-gold-dashboard/artifacts/ckw9kwam_IMG-20241228-WA0003.jpg";

export default function Landing() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", case_type: "", description: "" });
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Se o usuário voltou autenticado (ex: callback Google sem path), encaminha para /app
  useEffect(() => {
    if (user) {
      const done = localStorage.getItem("onboarding_done");
      navigate(done ? "/app" : "/app/onboarding", { replace: true });
    }
  }, [user, navigate]);


  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) { toast.error("Preencha nome e WhatsApp"); return; }
    setSending(true);
    try {
      await api.post("/public/leads", { ...form, source: "landing" });
      toast.success("Recebemos seu contato! Em breve retornamos.");
      setForm({ name: "", phone: "", email: "", case_type: "", description: "" });
    } catch { toast.error("Erro ao enviar. Tente novamente."); }
    finally { setSending(false); }
  };

  return (
    <div className="min-h-screen bg-background text-nude-900" data-testid="landing-page">
      {/* NAV */}
      <header className="border-b border-nude-200 bg-card/85 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0" data-testid="landing-logo">
            <img
              src={LOGO_IMG}
              alt="Kênia Garcia Advocacia"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-md object-cover ring-1 ring-gold-300/50 shrink-0"
            />
            <div className="font-serif text-base sm:text-lg tracking-tight text-nude-900 leading-tight truncate">
              Kênia Garcia<span className="block overline text-gold-600 text-[10px]">Advocacia</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-nude-600">
            <a href="#features" className="hover:text-gold-700 transition-colors">Funcionalidades</a>
            <a href="#how" className="hover:text-gold-700 transition-colors">Como funciona</a>
            <Link to="/consulta" className="hover:text-gold-700 transition-colors">Consultar processo</Link>
          </nav>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-nude-700 hover:text-gold-700 hover:bg-gold-50" onClick={() => navigate("/login")} data-testid="nav-login-btn">Entrar</Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white font-medium shadow-sm text-xs sm:text-sm px-3 sm:px-4"
              onClick={() => navigate("/login")} data-testid="nav-cta-btn">
              <span className="hidden sm:inline">Começar grátis</span>
              <span className="sm:hidden">Entrar</span>
            </Button>
          </div>
        </div>
      </header>

      {/* HERO — split com foto à esquerda */}
      <section className="relative">
        <div className="grid lg:grid-cols-2 lg:min-h-[640px]">
          {/* Lado esquerdo: foto da fachada do escritório */}
          <div className="relative overflow-hidden bg-nude-900 h-[320px] sm:h-[440px] lg:h-auto lg:min-h-[640px]">
            <img src={HERO_IMG} alt="Escritório Kênia Garcia Advocacia" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-nude-900/60 via-transparent to-nude-900/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-nude-900/80 via-transparent to-transparent" />
            {/* Verse overlay */}
            <div className="absolute bottom-6 sm:bottom-12 left-4 right-4 sm:left-12 sm:right-12 max-w-md" data-testid="bible-verse">
              <p className="italic text-nude-50 text-lg sm:text-2xl leading-snug font-serif drop-shadow-lg">
                "Atendimento que une <span className="text-gold-300">presença</span> e <span className="text-gold-200">tecnologia</span>."
              </p>
              <div className="mt-4 sm:mt-6 pl-4 border-l-2 border-gold-400/70">
                <p className="italic text-nude-100/90 text-xs sm:text-sm leading-relaxed">
                  "Mas recebereis poder, ao descer sobre vós o Espírito Santo, e sereis minhas
                  testemunhas tanto em Jerusalém como em toda a Judeia e Samaria e até aos confins da terra."
                </p>
                <p className="mt-2 text-[10px] tracking-[0.25em] uppercase text-gold-300 font-semibold">Atos 1:8</p>
              </div>
            </div>
          </div>

          {/* Lado direito: hero content */}
          <div className="relative flex items-center justify-start px-4 sm:px-6 lg:px-16 py-12 sm:py-16 lg:py-20 bg-background">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-20 right-0 w-[420px] h-[420px] rounded-full bg-gold-700/10 blur-3xl" />
            </div>
            <div className="relative max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-300 text-xs font-medium mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                Atendimento 24h · WhatsApp · Voz
              </div>
              <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl leading-[0.95] tracking-tighter text-nude-900">
                Seu escritório, <span className="italic font-medium text-gold-700">guiado</span>
                <br />pelo <span className="text-gold-800">Espírito Santo</span>.
              </h1>
              <p className="mt-5 sm:mt-6 text-base lg:text-lg text-nude-700 leading-relaxed">
                Captação de clientes, atendimento via WhatsApp (Baileys — QR Code auto-hospedado),
                CRM, agenda, financeiro e criativos com IA. Seu robô atende — com texto <em>e voz</em> — 24h por dia.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-gold-600 to-gold-800 hover:from-gold-500 hover:to-gold-700 text-white font-semibold h-12 px-7 text-base shadow-xl shadow-gold-900/40"
                  onClick={() => navigate("/login")}
                  data-testid="hero-cta-primary"
                >
                  Começar agora <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-7 text-base border-gold-700 text-gold-800 hover:bg-gold-50 hover:text-gold-900 bg-transparent"
                  onClick={() => document.getElementById("contato")?.scrollIntoView({ behavior: "smooth" })}
                  data-testid="hero-cta-secondary"
                >
                  Falar com a Dra.
                </Button>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-nude-700">
                <div className="flex items-center gap-2"><Check className="w-4 h-4 text-gold-700" /> WhatsApp 24h</div>
                <div className="flex items-center gap-2"><Check className="w-4 h-4 text-gold-700" /> Robô IA com voz</div>
                <div className="flex items-center gap-2"><Check className="w-4 h-4 text-gold-700" /> Setup em 5 min</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-16 sm:py-20 lg:py-24 bg-[#221710] border-y border-gold-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="grid lg:grid-cols-12 gap-6 sm:gap-8 mb-12 sm:mb-16">
            <div className="lg:col-span-5">
              <div className="text-xs tracking-[0.2em] uppercase font-semibold text-gold-400 mb-3">Plataforma completa</div>
              <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-tight text-nude-50">
                Da captação ao recebimento, tudo conectado.
              </h2>
            </div>
            <div className="lg:col-span-7 lg:pt-4">
              <p className="text-base sm:text-lg text-nude-200 leading-relaxed">
                Pare de pular entre 5 ferramentas diferentes. <strong className="text-gold-300">Espírito Santo</strong> concentra
                todo o ciclo do cliente — do primeiro contato no WhatsApp (texto ou áudio) ao último pagamento —

                com IA integrada e auto-hospedagem via Baileys.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-gold-900/30 border border-gold-900/40 rounded-lg overflow-hidden">
            {[
              { icon: QrCode, title: "WhatsApp Baileys (QR)", desc: "Conexão direta via QR Code. Auto-hospedado, sem custo por mensagem." },
              { icon: Mic, title: "Comandos de voz", desc: "Bot transcreve áudio recebido (Whisper) e responde em áudio (TTS)." },
              { icon: MessageCircle, title: "Chatbot Jurídico IA", desc: "Atende, qualifica, agenda consultas e classifica por área, 24h." },
              { icon: KanbanSquare, title: "CRM Pipeline Kanban", desc: "Lead → Contato → Proposta → Fechado. Score automático." },
              { icon: FileText, title: "Gestão de Processos", desc: "Cadastro, prazos, documentos e timeline do caso." },
              { icon: Wallet, title: "Financeiro Integrado", desc: "Honorários, contratos e controle de pagamentos." },
              { icon: Sparkles, title: "Criativos com IA", desc: "Posts para Instagram, Facebook e LinkedIn em segundos." },
              { icon: BarChart3, title: "Dashboard de Métricas", desc: "Conversão, faturamento e produtividade em tempo real." },
              { icon: Bot, title: "Agendamento automático", desc: "Cliente confirma horário no chat → agenda + link Meet criados." },
            ].map((f, i) => (
              <div key={i} className="bg-[#2a1d12] p-6 sm:p-8 hover:bg-[#3a2616] transition-colors" data-testid={`feature-${i}`}>
                <div className="w-10 h-10 rounded-md bg-gradient-to-br from-gold-500/30 to-gold-700/30 border border-gold-500/40 grid place-items-center mb-5">
                  <f.icon className="w-5 h-5 text-gold-200" />
                </div>
                <h3 className="font-display font-semibold text-lg sm:text-xl mb-2 text-nude-50">{f.title}</h3>
                <p className="text-sm text-nude-200 leading-relaxed">{f.desc}</p>
              </div>

            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-16 sm:py-20 lg:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-10 sm:gap-12 lg:gap-16 items-center">
            <div>
              <div className="text-xs tracking-[0.2em] uppercase font-semibold text-gold-700 mb-3">Como funciona</div>
              <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-tight mb-6 sm:mb-8 text-nude-900">
                Três passos para transformar seu escritório.
              </h2>
              <div className="space-y-6">
                {[
                  { n: "01", t: "Conecte o WhatsApp via Baileys", d: "Escaneie o QR Code no painel. Auto-hospedado no Render. Sem mensalidade por conexão." },
                  { n: "02", t: "Ative o robô IA (texto + voz)", d: "Clientes mandam mensagem ou áudio. O bot transcreve, responde e agenda." },
                  { n: "03", t: "Acompanhe pelo painel", d: "CRM, agenda, financeiro e métricas em tempo real." },
                ].map((s, i) => (
                  <div key={i} className="flex gap-5 pb-6 border-b border-nude-200 last:border-0">
                    <div className="font-mono text-sm font-semibold text-gold-700 w-8 shrink-0">{s.n}</div>
                    <div>
                      <div className="font-display font-semibold text-lg mb-1 text-nude-900">{s.t}</div>
                      <div className="text-sm text-nude-700">{s.d}</div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
            <Card className="bg-[#221710] border-gold-900/40 p-5 sm:p-8">
              <div className="text-xs tracking-[0.2em] uppercase font-semibold text-gold-400 mb-4">Exemplo — fluxo de voz</div>
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-gold-500/10 border border-gold-500/20 text-sm text-gold-100">
                  <div className="text-xs text-gold-400 mb-1 flex items-center gap-1"><Mic className="w-3 h-3" /> Cliente — áudio 0:08</div>
                  "Boa tarde, fui demitido ontem sem justa causa, preciso de ajuda com a rescisão."
                </div>
                <div className="p-3 rounded-lg bg-[#3a2616] border border-gold-700/30 text-sm text-nude-900">
                  <div className="text-xs text-gold-300 mb-1">Kênia Garcia (advogada) — resposta em áudio</div>
                  "Oi! Aqui é a Kênia Garcia, advogada. Sinto muito pela situação. Me responde só uma coisa pra eu já organizar seu caso: faz quanto tempo da demissão e você já assinou alguma rescisão?"
                </div>
                <div className="p-3 rounded-lg bg-nude-50 border border-gold-400 text-xs text-nude-900 font-medium">
                  ✓ Áudio transcrito com Whisper → ✓ Resposta gerada pela IA → ✓ Áudio TTS enviado ao cliente
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CONTATO / LEAD CAPTURE */}
      <section id="contato" className="py-16 sm:py-20 lg:py-24 bg-[#1a1009]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          <div>
            <div className="text-xs tracking-[0.2em] uppercase font-semibold text-gold-300 mb-3">Vamos conversar</div>
            <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-tight mb-4 text-nude-50">
              Receba uma demonstração personalizada.
            </h2>
            <p className="text-nude-200 leading-relaxed">
              Conte um pouco do seu escritório e nossa equipe retorna em até 1 hora útil.
              Sem compromisso.
            </p>

          </div>
          <Card className="bg-[#221710] border-gold-700/50 p-6 shadow-xl shadow-background/30">
            <form onSubmit={submit} className="space-y-3" data-testid="landing-lead-form">
              <Input placeholder="Seu nome completo" className="bg-nude-50 border-gold-300 text-nude-950 placeholder:text-nude-700" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="lead-form-name" />
              <Input placeholder="WhatsApp (com DDD)" className="bg-nude-50 border-gold-300 text-nude-950 placeholder:text-nude-700" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="lead-form-phone" />
              <Input placeholder="E-mail" type="email" className="bg-nude-50 border-gold-300 text-nude-950 placeholder:text-nude-700" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="lead-form-email" />
              <Input placeholder="Tipo de caso (ex: Trabalhista, Família...)" className="bg-nude-50 border-gold-300 text-nude-950 placeholder:text-nude-700" value={form.case_type} onChange={(e) => setForm({ ...form, case_type: e.target.value })} data-testid="lead-form-case" />
              <Textarea placeholder="Conte rapidamente sua situação" className="bg-nude-50 border-gold-300 text-nude-950 placeholder:text-nude-700" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="lead-form-desc" />
              <Button type="submit" disabled={sending} className="w-full bg-gradient-to-r from-gold-400 to-gold-600 hover:from-gold-300 hover:to-gold-500 text-nude-950 font-bold h-11 shadow-lg shadow-gold-900/30" data-testid="lead-form-submit">
                {sending ? "Enviando..." : "Quero uma demonstração"}
              </Button>
            </form>
          </Card>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-background py-10 border-t border-gold-900/30">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-nude-700">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-gold-500 to-gold-700 grid place-items-center">
              <Scale className="w-3 h-3 text-nude-900" />
            </div>
            <span>© 2026 Espírito Santo Adv · Todos os direitos reservados</span>
          </div>
          <div className="flex gap-6">
            <Link to="/consulta" className="hover:text-gold-700">Consultar processo</Link>
            <Link to="/login" className="hover:text-gold-700">Entrar</Link>
            <a href="#features" className="hover:text-gold-700">Funcionalidades</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
