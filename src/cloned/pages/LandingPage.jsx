import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  QrCode, Mic, MessageCircle, Kanban, FileText, Wallet,
  Sparkles, BarChart3, CalendarCheck, Check, ArrowRight, Sparkle,
} from 'lucide-react';
import AuthModal from '../components/AuthModal';
import facade from '@/assets/kenia-facade.jpg';

const sans = '"Host Grotesk", -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
const serif = '"Cormorant Garamond", "Times New Roman", serif';

const GOLD = '#B9893F';
const GOLD_SOFT = '#D8B27A';
const DARK = '#2A1F18';
const CREAM = '#F6EFE5';

function Feature({ icon: Icon, title, desc }) {
  return (
    <div>
      <div
        className="w-11 h-11 rounded-md flex items-center justify-center mb-5"
        style={{ background: 'rgba(185,137,63,0.12)', color: GOLD }}
      >
        <Icon className="w-5 h-5" strokeWidth={1.6} />
      </div>
      <h3 style={{ fontFamily: serif }} className="text-xl text-white mb-2">{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: 'rgba(246,239,229,0.6)' }}>{desc}</p>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const openAuth = (mode) => { setAuthMode(mode); setAuthOpen(true); };

  const [form, setForm] = useState({ nome: '', whats: '', email: '', tipo: '', sit: '' });
  const submit = (e) => { e.preventDefault(); openAuth('signup'); };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: sans, color: DARK }}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-md flex items-center justify-center"
              style={{ border: `1.5px solid ${GOLD}`, color: GOLD, fontFamily: serif, fontWeight: 600 }}
            >
              KG
            </div>
            <div className="text-left leading-tight">
              <div style={{ fontFamily: serif, color: DARK }} className="text-lg">Kênia Garcia</div>
              <div style={{ color: GOLD, letterSpacing: '0.25em' }} className="text-[10px] font-medium">ADVOCACIA</div>
            </div>
          </button>

          <nav className="hidden md:flex items-center gap-10 text-sm" style={{ color: 'rgba(42,31,24,0.75)' }}>
            <a href="#funcionalidades" className="hover:text-[color:var(--g)]" style={{ ['--g']: GOLD }}>Funcionalidades</a>
            <a href="#como-funciona" className="hover:opacity-80">Como funciona</a>
            <a href="#contato" className="hover:opacity-80">Consultar processo</a>
          </nav>

          <div className="flex items-center gap-4">
            <button onClick={() => openAuth('login')} className="text-sm" style={{ color: 'rgba(42,31,24,0.75)' }}>
              Entrar
            </button>
            <button
              onClick={() => openAuth('signup')}
              className="px-5 py-2.5 rounded-md text-white text-sm font-medium transition-opacity hover:opacity-90"
              style={{ background: GOLD }}
            >
              Começar grátis
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="grid md:grid-cols-2">
        <div className="relative min-h-[520px] md:min-h-[640px]">
          <img src={facade} alt="Fachada do escritório Kênia Garcia Advocacia" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.55) 100%)' }} />
          <div className="absolute bottom-10 left-10 right-10 text-white">
            <p style={{ fontFamily: serif }} className="italic text-lg mb-5">
              "Atendimento que une <span style={{ color: GOLD_SOFT }}>presença</span> e tecnologia."
            </p>
            <div className="border-l-2 pl-5" style={{ borderColor: GOLD }}>
              <p className="text-sm leading-relaxed mb-3 max-w-md" style={{ color: 'rgba(255,255,255,0.85)' }}>
                "Mas recebereis poder, ao descer sobre vós o Espírito Santo, e sereis minhas testemunhas tanto em Jerusalém como em toda a Judeia e Samaria e até aos confins da terra."
              </p>
              <p className="text-[11px] tracking-[0.3em]" style={{ color: GOLD_SOFT }}>ATOS 1:8</p>
            </div>
          </div>
        </div>

        <div className="flex items-center px-8 md:px-16 py-16" style={{ background: CREAM }}>
          <div className="max-w-xl">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs"
              style={{ background: 'rgba(185,137,63,0.1)', color: GOLD, border: `1px solid rgba(185,137,63,0.25)` }}
            >
              <Sparkle className="w-3 h-3" /> Atendimento 24h · WhatsApp · Voz
            </div>

            <h1 style={{ fontFamily: serif, color: DARK }} className="text-5xl md:text-6xl leading-[1.05] mb-7">
              Seu escritório, <em style={{ color: GOLD }} className="not-italic font-medium italic">guiado</em><br />
              pelo <span style={{ color: GOLD }}>Espírito Santo.</span>
            </h1>

            <p className="text-[15px] leading-relaxed mb-9" style={{ color: 'rgba(42,31,24,0.7)' }}>
              Captação de clientes, atendimento via WhatsApp (Baileys — QR Code auto-hospedado), CRM, agenda, financeiro e criativos com IA. Seu robô atende — com texto <em>e voz</em> — 24h por dia.
            </p>

            <div className="flex flex-wrap gap-3 mb-7">
              <button
                onClick={() => openAuth('signup')}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-md text-white text-sm font-medium hover:opacity-90"
                style={{ background: GOLD, boxShadow: '0 14px 30px -12px rgba(185,137,63,0.55)' }}
              >
                Começar agora <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#contato"
                className="inline-flex items-center px-7 py-3.5 rounded-md text-sm font-medium hover:bg-black/5"
                style={{ border: `1px solid ${DARK}`, color: DARK }}
              >
                Falar com a Dra.
              </a>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm" style={{ color: 'rgba(42,31,24,0.7)' }}>
              {['WhatsApp 24h', 'Robô IA com voz', 'Setup em 5 min'].map((t) => (
                <span key={t} className="inline-flex items-center gap-2">
                  <Check className="w-4 h-4" style={{ color: GOLD }} /> {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section id="funcionalidades" className="py-24 px-6" style={{ background: '#2A1F18', color: CREAM }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 mb-16">
            <div>
              <p style={{ color: GOLD, letterSpacing: '0.3em' }} className="text-xs font-semibold mb-5">PLATAFORMA COMPLETA</p>
              <h2 style={{ fontFamily: serif }} className="text-5xl leading-tight text-white">
                Da captação ao<br />recebimento, tudo<br />conectado.
              </h2>
            </div>
            <div className="flex md:items-end">
              <p className="text-[15px] leading-relaxed" style={{ color: 'rgba(246,239,229,0.7)' }}>
                Pare de pular entre 5 ferramentas diferentes. <span style={{ color: GOLD }}>Espírito Santo</span> concentra todo o ciclo do cliente — do primeiro contato no WhatsApp (texto ou áudio) ao último pagamento — com IA integrada e auto-hospedagem via Baileys.
              </p>
            </div>
          </div>

          <div
            className="grid md:grid-cols-3 gap-x-12 gap-y-14 p-10 md:p-14 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(185,137,63,0.15)' }}
          >
            <Feature icon={QrCode} title="WhatsApp Baileys (QR)" desc="Conexão direta via QR Code. Auto-hospedado, sem custo por mensagem." />
            <Feature icon={Mic} title="Comandos de voz" desc="Bot transcreve áudio recebido (Whisper) e responde em áudio (TTS)." />
            <Feature icon={MessageCircle} title="Chatbot Jurídico IA" desc="Atende, qualifica, agenda consultas e classifica por área, 24h." />
            <Feature icon={Kanban} title="CRM Pipeline Kanban" desc="Lead → Contato → Proposta → Fechado. Score automático." />
            <Feature icon={FileText} title="Gestão de Processos" desc="Cadastro, prazos, documentos e timeline do caso." />
            <Feature icon={Wallet} title="Financeiro Integrado" desc="Honorários, contratos e controle de pagamentos." />
            <Feature icon={Sparkles} title="Criativos com IA" desc="Posts para Instagram, Facebook e LinkedIn em segundos." />
            <Feature icon={BarChart3} title="Dashboard de Métricas" desc="Conversão, faturamento e produtividade em tempo real." />
            <Feature icon={CalendarCheck} title="Agendamento automático" desc="Cliente confirma horário no chat → agenda + link Meet criados." />
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="py-24 px-6" style={{ background: CREAM }}>
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-14">
          <div>
            <p style={{ color: GOLD, letterSpacing: '0.3em' }} className="text-xs font-semibold mb-5">COMO FUNCIONA</p>
            <h2 style={{ fontFamily: serif, color: DARK }} className="text-5xl leading-tight mb-10">
              Três passos para transformar<br />seu escritório.
            </h2>

            {[
              { n: '01', t: 'Conecte o WhatsApp via Baileys', d: 'Escaneie o QR Code no painel. Auto-hospedado no Render. Sem mensalidade por conexão.' },
              { n: '02', t: 'Ative o robô IA (texto + voz)', d: 'Clientes mandam mensagem ou áudio. O bot transcreve, responde e agenda.' },
              { n: '03', t: 'Acompanhe pelo painel', d: 'CRM, agenda, financeiro e métricas em tempo real.' },
            ].map((s, i) => (
              <div key={s.n} className={`flex gap-6 py-6 ${i !== 2 ? 'border-b' : ''}`} style={{ borderColor: 'rgba(42,31,24,0.1)' }}>
                <div style={{ color: GOLD, fontFamily: serif }} className="text-xl">{s.n}</div>
                <div>
                  <h4 style={{ color: DARK }} className="font-medium mb-1">{s.t}</h4>
                  <p className="text-sm" style={{ color: 'rgba(42,31,24,0.65)' }}>{s.d}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl p-8" style={{ background: DARK, color: CREAM }}>
            <p style={{ color: GOLD, letterSpacing: '0.3em' }} className="text-[11px] font-semibold mb-6">EXEMPLO — FLUXO DE VOZ</p>

            <div className="rounded-lg p-5 mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(185,137,63,0.15)' }}>
              <div className="flex items-center gap-2 text-xs mb-3" style={{ color: GOLD_SOFT }}>
                <Mic className="w-3.5 h-3.5" /> Cliente — áudio 0:08
              </div>
              <p className="text-sm italic" style={{ color: 'rgba(246,239,229,0.85)' }}>
                "Boa tarde, fui demitido ontem sem justa causa, preciso de ajuda com a rescisão."
              </p>
            </div>

            <div className="rounded-lg p-5 mb-5" style={{ background: 'rgba(185,137,63,0.08)', border: '1px solid rgba(185,137,63,0.2)' }}>
              <div className="text-xs mb-3" style={{ color: GOLD_SOFT }}>Kênia Garcia (advogada) — resposta em áudio</div>
              <div className="h-16 flex items-end gap-1">
                {Array.from({ length: 40 }).map((_, i) => (
                  <span key={i} className="flex-1 rounded-sm" style={{ background: GOLD_SOFT, opacity: 0.5 + (Math.sin(i * 0.7) + 1) / 4, height: `${20 + Math.abs(Math.sin(i * 0.6)) * 80}%` }} />
                ))}
              </div>
            </div>

            <div className="rounded-md p-4 text-xs" style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(246,239,229,0.7)' }}>
              ✓ Áudio transcrito com Whisper → ✓ Resposta gerada pela IA → ✓ Áudio TTS enviado ao cliente
            </div>
          </div>
        </div>
      </section>

      {/* Contato */}
      <section id="contato" className="py-24 px-6" style={{ background: DARK, color: CREAM }}>
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-14 items-center">
          <div>
            <p style={{ color: GOLD, letterSpacing: '0.3em' }} className="text-xs font-semibold mb-5">VAMOS CONVERSAR</p>
            <h2 style={{ fontFamily: serif }} className="text-5xl leading-tight text-white mb-6">
              Receba uma<br />demonstração<br />personalizada.
            </h2>
            <p className="text-[15px]" style={{ color: 'rgba(246,239,229,0.65)' }}>
              Conte um pouco do seu escritório e nossa equipe retorna em até 1 hora útil. Sem compromisso.
            </p>
          </div>

          <form
            onSubmit={submit}
            className="rounded-xl p-8 space-y-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(185,137,63,0.2)' }}
          >
            {[
              { k: 'nome', p: 'Seu nome completo' },
              { k: 'whats', p: 'WhatsApp (com DDD)' },
              { k: 'email', p: 'E-mail', type: 'email' },
              { k: 'tipo', p: 'Tipo de caso (ex: Trabalhista, Família…)' },
            ].map((f) => (
              <input
                key={f.k}
                type={f.type || 'text'}
                placeholder={f.p}
                value={form[f.k]}
                onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                className="w-full px-4 py-3.5 rounded-md text-sm text-white placeholder:text-white/40 focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            ))}
            <textarea
              rows={4}
              placeholder="Conte rapidamente sua situação"
              value={form.sit}
              onChange={(e) => setForm({ ...form, sit: e.target.value })}
              className="w-full px-4 py-3.5 rounded-md text-sm text-white placeholder:text-white/40 focus:outline-none resize-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <button
              type="submit"
              className="w-full py-3.5 rounded-md text-sm font-semibold text-[color:var(--d)] hover:opacity-90"
              style={{ background: GOLD_SOFT, ['--d']: DARK }}
            >
              Quero uma demonstração
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6" style={{ background: '#1F1611', color: 'rgba(246,239,229,0.55)' }}>
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center text-[10px]"
              style={{ border: `1px solid ${GOLD}`, color: GOLD, fontFamily: serif }}
            >
              KG
            </div>
            <span>© {new Date().getFullYear()} Espírito Santo Adv · Todos os direitos reservados</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#contato" className="hover:text-white">Consultar processo</a>
            <button onClick={() => openAuth('login')} className="hover:text-white">Entrar</button>
            <a href="#funcionalidades" className="hover:text-white">Funcionalidades</a>
          </div>
        </div>
      </footer>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} mode={authMode} setMode={setAuthMode} />
    </div>
  );
}
