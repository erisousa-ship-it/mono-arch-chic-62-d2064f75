import React, { useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, MessageCircle, Kanban, FileText, Calendar, Wallet,
  Sparkles, BarChart3, Settings, LogOut, Search, Plus, Mic, Send, QrCode,
  CheckCircle2, Clock, TrendingUp, Users, DollarSign, Bell, ArrowUpRight,
  Phone, Paperclip, MoreHorizontal, Power, RefreshCw, Copy, Smartphone, Webhook,
  Shield, Volume2, Bot, Workflow, ImagePlus, Share2, ScrollText, UserCog, Briefcase, X,
} from 'lucide-react';
import { AuthContext } from '../ClonedAuthContext';

const sans = '"Host Grotesk", -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
const serif = '"Cormorant Garamond", "Times New Roman", serif';
const GOLD = '#B9893F';
const GOLD_SOFT = '#D8B27A';
const DARK = '#2A1F18';
const DARK_2 = '#1F1611';
const CREAM = '#F6EFE5';
const PANEL = 'rgba(255,255,255,0.03)';
const LINE = 'rgba(185,137,63,0.18)';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { id: 'chatia', label: 'Chat IA', icon: Bot },
  { id: 'crm', label: 'CRM Kanban', icon: Kanban },
  { id: 'processos', label: 'Processos', icon: FileText },
  { id: 'agenda', label: 'Agenda', icon: Calendar },
  { id: 'financeiro', label: 'Financeiro', icon: Wallet },
  { id: 'criativos', label: 'Criativos IA', icon: Sparkles },
  { id: 'imagefusion', label: 'Image Fusion', icon: ImagePlus },
  { id: 'aibuilder', label: 'AI Builder', icon: Workflow },
  { id: 'social', label: 'Conexões Sociais', icon: Share2 },
  { id: 'metricas', label: 'Métricas', icon: BarChart3 },
  { id: 'admincases', label: 'Admin Casos', icon: Briefcase },
  { id: 'settings', label: 'Configurações', icon: UserCog },
];

const KPIS = [
  { label: 'Leads no mês', value: '142', delta: '+24%', icon: Users },
  { label: 'Conversão', value: '38%', delta: '+6pts', icon: TrendingUp },
  { label: 'Faturamento', value: 'R$ 84.320', delta: '+18%', icon: DollarSign },
  { label: 'Atendimentos 24h', value: '317', delta: '+12%', icon: MessageCircle },
];

const CONVERSAS = [
  { nome: 'Carlos Mendes', tag: 'Trabalhista', preview: 'Boa tarde, fui demitido ontem sem justa causa…', hora: '14:32', unread: 2, ativo: true },
  { nome: 'Ana Beatriz Lima', tag: 'Família', preview: 'Áudio (0:24)', hora: '13:18', unread: 0 },
  { nome: 'Roberto Souza', tag: 'Cível', preview: 'Doutora, recebi a citação hoje pela manhã.', hora: '12:05', unread: 1 },
  { nome: 'Juliana Pires', tag: 'Previdenciário', preview: 'Obrigada pelas informações!', hora: 'Ontem', unread: 0 },
  { nome: 'Marcos Tavares', tag: 'Tributário', preview: 'Áudio (1:02)', hora: 'Ontem', unread: 0 },
];

const PIPELINE = {
  Lead: [
    { nome: 'Carlos Mendes', area: 'Trabalhista', valor: 'R$ 4.500', score: 87 },
    { nome: 'Patrícia Alves', area: 'Cível', valor: 'R$ 2.800', score: 64 },
    { nome: 'Eduardo Reis', area: 'Família', valor: 'R$ 6.200', score: 71 },
  ],
  Contato: [
    { nome: 'Ana Beatriz Lima', area: 'Família', valor: 'R$ 7.500', score: 82 },
    { nome: 'Roberto Souza', area: 'Cível', valor: 'R$ 3.900', score: 58 },
  ],
  Proposta: [
    { nome: 'Marcos Tavares', area: 'Tributário', valor: 'R$ 12.000', score: 91 },
    { nome: 'Juliana Pires', area: 'Previdenciário', valor: 'R$ 5.400', score: 76 },
  ],
  Fechado: [
    { nome: 'Helena Costa', area: 'Trabalhista', valor: 'R$ 8.200', score: 95 },
  ],
};

const PROCESSOS = [
  { num: '0001234-56.2025.5.10.0001', cliente: 'Carlos Mendes', area: 'Trabalhista', prazo: '12/06', status: 'Em andamento' },
  { num: '0009876-12.2025.8.26.0100', cliente: 'Ana Beatriz Lima', area: 'Família', prazo: '18/06', status: 'Audiência' },
  { num: '0005544-33.2024.4.03.6100', cliente: 'Roberto Souza', area: 'Cível', prazo: '22/06', status: 'Aguardando' },
  { num: '0002211-78.2025.5.02.0010', cliente: 'Helena Costa', area: 'Trabalhista', prazo: '28/06', status: 'Sentença' },
];

const AGENDA = [
  { hora: '09:00', titulo: 'Audiência — Carlos Mendes', tipo: 'Audiência', local: 'TRT 10ª — sala 4' },
  { hora: '11:30', titulo: 'Reunião com Ana Beatriz', tipo: 'Consulta', local: 'Google Meet' },
  { hora: '14:00', titulo: 'Prazo: contestação Roberto S.', tipo: 'Prazo', local: '' },
  { hora: '16:30', titulo: 'Assinatura contrato — Helena', tipo: 'Cliente', local: 'Escritório' },
];

const FINANCEIRO = [
  { cliente: 'Helena Costa', desc: 'Honorários — entrada', valor: 'R$ 2.500', status: 'Pago', data: '03/06' },
  { cliente: 'Marcos Tavares', desc: 'Consultoria tributária', valor: 'R$ 4.800', status: 'A receber', data: '15/06' },
  { cliente: 'Ana Beatriz Lima', desc: 'Honorários — divórcio', valor: 'R$ 3.200', status: 'Pago', data: '28/05' },
  { cliente: 'Juliana Pires', desc: 'Revisão de benefício', valor: 'R$ 1.800', status: 'Vencido', data: '01/06' },
];

function Card({ children, className = '', style }) {
  return (
    <div
      className={`rounded-xl ${className}`}
      style={{ background: PANEL, border: `1px solid ${LINE}`, ...style }}
    >
      {children}
    </div>
  );
}

function Pill({ children, color = GOLD }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide"
      style={{ background: `${color}1F`, color, border: `1px solid ${color}40` }}
    >
      {children}
    </span>
  );
}

function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIS.map((k) => (
          <Card key={k.label} className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-10 h-10 rounded-md flex items-center justify-center"
                style={{ background: `${GOLD}1F`, color: GOLD }}
              >
                <k.icon className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold" style={{ color: '#7FD19A' }}>
                {k.delta}
              </span>
            </div>
            <div style={{ fontFamily: serif, color: 'white' }} className="text-3xl">{k.value}</div>
            <div className="text-xs mt-1" style={{ color: 'rgba(246,239,229,0.55)' }}>{k.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h3 style={{ fontFamily: serif, color: 'white' }} className="text-xl">Faturamento — últimos 7 dias</h3>
            <Pill>+18% vs semana anterior</Pill>
          </div>
          <div className="h-52 flex items-end gap-3">
            {[42, 58, 35, 78, 62, 90, 84].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{ height: `${h}%`, background: `linear-gradient(180deg, ${GOLD_SOFT}, ${GOLD})` }}
                />
                <span className="text-[10px]" style={{ color: 'rgba(246,239,229,0.5)' }}>
                  {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][i]}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 style={{ fontFamily: serif, color: 'white' }} className="text-xl mb-5">Próximos compromissos</h3>
          <div className="space-y-4">
            {AGENDA.slice(0, 4).map((a, i) => (
              <div key={i} className="flex gap-3">
                <div className="text-xs font-semibold w-12 shrink-0" style={{ color: GOLD }}>{a.hora}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{a.titulo}</div>
                  <div className="text-[11px]" style={{ color: 'rgba(246,239,229,0.5)' }}>{a.tipo}{a.local && ` · ${a.local}`}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 style={{ fontFamily: serif, color: 'white' }} className="text-xl">Funil de captação</h3>
          <span className="text-xs" style={{ color: 'rgba(246,239,229,0.55)' }}>Atualizado em tempo real</span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {Object.entries(PIPELINE).map(([etapa, items], idx) => (
            <div key={etapa}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white">{etapa}</span>
                <span className="text-[10px]" style={{ color: GOLD }}>{items.length}</span>
              </div>
              <div className="h-1.5 rounded-full mb-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${[90, 65, 40, 22][idx]}%`, background: GOLD }}
                />
              </div>
              <div className="text-[11px]" style={{ color: 'rgba(246,239,229,0.55)' }}>
                {items.reduce((s, i) => s + parseInt(i.valor.replace(/\D/g, ''), 10), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

const WA_CFG_KEY = 'kg.wa.cfg';
const WA_DEFAULTS = {
  status: 'disconnected', // 'connected' | 'disconnected' | 'pairing'
  numero: '',
  instancia: 'kenia-adv-01',
  servidor: 'https://baileys.kenia-adv.render.com',
  webhook: 'https://baileys.kenia-adv.render.com/webhook/messages',
  saudacao: 'Olá! Aqui é o atendimento do escritório Kênia Garcia Advocacia. Em instantes uma de nossas advogadas falará com você. 🙏',
  foraExpediente: 'Recebemos sua mensagem fora do horário comercial. Retornaremos amanhã a partir das 9h.',
  iaAtiva: true,
  respondeAudio: true,
  horarioInicio: '09:00',
  horarioFim: '18:00',
  diasUteis: true,
  whisperEnabled: true,
  ttsEnabled: true,
  voz: 'feminina-pt-br',
};

function loadCfg() {
  try { return { ...WA_DEFAULTS, ...JSON.parse(localStorage.getItem(WA_CFG_KEY) || '{}') }; }
  catch { return WA_DEFAULTS; }
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-10 h-6 rounded-full relative transition-colors shrink-0"
      style={{ background: checked ? GOLD : 'rgba(255,255,255,0.1)' }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
        style={{ left: checked ? '18px' : '2px' }}
      />
    </button>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="text-xs font-medium block mb-2" style={{ color: 'rgba(246,239,229,0.75)' }}>{label}</label>
      {children}
      {hint && <p className="text-[11px] mt-1.5" style={{ color: 'rgba(246,239,229,0.45)' }}>{hint}</p>}
    </div>
  );
}

function inputCls() {
  return 'w-full px-3 py-2.5 rounded-md text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[color:var(--g)]';
}
function inputStyle() {
  return { background: 'rgba(255,255,255,0.04)', border: `1px solid ${LINE}`, ['--g']: GOLD };
}

function WAConfig({ cfg, setCfg, save, saved }) {
  const setField = (k, v) => setCfg({ ...cfg, [k]: v });
  const isConnected = cfg.status === 'connected';
  const isPairing = cfg.status === 'pairing';

  const startPairing = () => setCfg({ ...cfg, status: 'pairing' });
  const finishPairing = () => setCfg({ ...cfg, status: 'connected', numero: cfg.numero || '+55 11 98123-4567' });
  const disconnect = () => setCfg({ ...cfg, status: 'disconnected' });

  return (
    <div className="grid lg:grid-cols-3 gap-6 pb-2">
      {/* Connection */}
      <Card className="p-6 lg:col-span-2">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 style={{ fontFamily: serif, color: 'white' }} className="text-xl">Conexão Baileys</h3>
            <p className="text-xs mt-1" style={{ color: 'rgba(246,239,229,0.55)' }}>WhatsApp auto-hospedado via QR Code — sem custo por mensagem.</p>
          </div>
          <Pill color={isConnected ? '#7FD19A' : isPairing ? GOLD : '#E07A6B'}>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {isConnected ? 'Conectado' : isPairing ? 'Aguardando QR' : 'Desconectado'}
            </span>
          </Pill>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div className="flex flex-col items-center justify-center p-6 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${LINE}` }}>
            {isConnected ? (
              <>
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-3" style={{ background: '#7FD19A26', color: '#7FD19A' }}>
                  <CheckCircle2 className="w-10 h-10" strokeWidth={1.5} />
                </div>
                <div className="text-sm text-white mb-1">Sessão ativa</div>
                <div className="text-xs mb-4" style={{ color: 'rgba(246,239,229,0.55)' }}>{cfg.numero}</div>
                <button onClick={disconnect} className="px-4 py-2 rounded-md text-xs font-medium flex items-center gap-2" style={{ border: `1px solid #E07A6B66`, color: '#E07A6B' }}>
                  <Power className="w-3.5 h-3.5" /> Desconectar
                </button>
              </>
            ) : isPairing ? (
              <>
                <div className="w-44 h-44 rounded-lg p-3 mb-3 grid grid-cols-12 gap-px" style={{ background: 'white' }}>
                  {Array.from({ length: 144 }).map((_, i) => (
                    <div key={i} style={{ background: Math.random() > 0.45 ? '#111' : 'white' }} />
                  ))}
                </div>
                <div className="text-xs text-center mb-3" style={{ color: 'rgba(246,239,229,0.6)' }}>
                  Abra o WhatsApp no celular → Aparelhos conectados → Conectar aparelho
                </div>
                <button onClick={finishPairing} className="px-4 py-2 rounded-md text-xs font-medium text-white" style={{ background: GOLD }}>
                  Simular leitura do QR
                </button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(246,239,229,0.5)' }}>
                  <QrCode className="w-10 h-10" strokeWidth={1.5} />
                </div>
                <div className="text-sm text-white mb-1">Nenhuma sessão ativa</div>
                <div className="text-xs mb-4 text-center" style={{ color: 'rgba(246,239,229,0.55)' }}>Gere um QR Code para conectar o WhatsApp do escritório.</div>
                <button onClick={startPairing} className="px-5 py-2.5 rounded-md text-sm font-medium text-white flex items-center gap-2 hover:opacity-90" style={{ background: GOLD }}>
                  <QrCode className="w-4 h-4" /> Gerar QR Code
                </button>
              </>
            )}
          </div>

          <div className="space-y-4">
            <Field label="Número conectado">
              <input className={inputCls()} style={inputStyle()} value={cfg.numero} onChange={(e) => setField('numero', e.target.value)} placeholder="+55 11 98123-4567" />
            </Field>
            <Field label="Nome da instância" hint="Identificador único da sessão no servidor Baileys.">
              <input className={inputCls()} style={inputStyle()} value={cfg.instancia} onChange={(e) => setField('instancia', e.target.value)} />
            </Field>
            <Field label="Servidor Baileys">
              <div className="flex gap-2">
                <input className={inputCls()} style={inputStyle()} value={cfg.servidor} onChange={(e) => setField('servidor', e.target.value)} />
                <button className="px-3 rounded-md hover:bg-white/5" style={{ border: `1px solid ${LINE}`, color: GOLD }} onClick={() => navigator.clipboard?.writeText(cfg.servidor)}>
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </Field>
          </div>
        </div>
      </Card>

      {/* IA */}
      <Card className="p-6">
        <h3 style={{ fontFamily: serif, color: 'white' }} className="text-xl mb-5">Robô IA</h3>
        <div className="space-y-4">
          {[
            { k: 'iaAtiva', l: 'Responder automaticamente', d: 'IA responde leads e qualifica casos 24h.', icon: Sparkles },
            { k: 'respondeAudio', l: 'Responder em áudio (TTS)', d: 'Voz humanizada quando o cliente manda áudio.', icon: Volume2 },
            { k: 'whisperEnabled', l: 'Transcrever áudios (Whisper)', d: 'Converte áudios recebidos em texto.', icon: Mic },
          ].map((o) => (
            <div key={o.k} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0" style={{ background: `${GOLD}1A`, color: GOLD }}>
                <o.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3 mb-0.5">
                  <span className="text-sm text-white">{o.l}</span>
                  <Toggle checked={cfg[o.k]} onChange={(v) => setField(o.k, v)} />
                </div>
                <p className="text-[11px]" style={{ color: 'rgba(246,239,229,0.5)' }}>{o.d}</p>
              </div>
            </div>
          ))}

          <div className="pt-3 mt-2 border-t" style={{ borderColor: LINE }}>
            <Field label="Voz da advogada IA">
              <select className={inputCls()} style={inputStyle()} value={cfg.voz} onChange={(e) => setField('voz', e.target.value)}>
                <option value="feminina-pt-br">Feminina · PT-BR (padrão)</option>
                <option value="feminina-suave">Feminina · suave</option>
                <option value="feminina-firme">Feminina · firme</option>
                <option value="masculina-pt-br">Masculina · PT-BR</option>
              </select>
            </Field>
          </div>
        </div>
      </Card>

      {/* Mensagens */}
      <Card className="p-6 lg:col-span-2">
        <h3 style={{ fontFamily: serif, color: 'white' }} className="text-xl mb-5">Mensagens automáticas</h3>
        <div className="space-y-4">
          <Field label="Saudação inicial" hint="Enviada no primeiro contato do lead.">
            <textarea rows={3} className={`${inputCls()} resize-none`} style={inputStyle()} value={cfg.saudacao} onChange={(e) => setField('saudacao', e.target.value)} />
          </Field>
          <Field label="Fora do horário comercial" hint="Enviada quando o cliente escreve fora do expediente.">
            <textarea rows={2} className={`${inputCls()} resize-none`} style={inputStyle()} value={cfg.foraExpediente} onChange={(e) => setField('foraExpediente', e.target.value)} />
          </Field>
        </div>
      </Card>

      {/* Horário + webhook */}
      <Card className="p-6">
        <h3 style={{ fontFamily: serif, color: 'white' }} className="text-xl mb-5">Horário & Webhook</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Início">
              <input type="time" className={inputCls()} style={inputStyle()} value={cfg.horarioInicio} onChange={(e) => setField('horarioInicio', e.target.value)} />
            </Field>
            <Field label="Fim">
              <input type="time" className={inputCls()} style={inputStyle()} value={cfg.horarioFim} onChange={(e) => setField('horarioFim', e.target.value)} />
            </Field>
          </div>
          <div className="flex items-center justify-between p-3 rounded-md" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${LINE}` }}>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" style={{ color: GOLD }} />
              <span className="text-sm text-white">Atender só em dias úteis</span>
            </div>
            <Toggle checked={cfg.diasUteis} onChange={(v) => setField('diasUteis', v)} />
          </div>
          <Field label="Webhook" hint="Endpoint que recebe os eventos da sessão Baileys.">
            <div className="flex gap-2">
              <input className={inputCls()} style={inputStyle()} value={cfg.webhook} onChange={(e) => setField('webhook', e.target.value)} />
              <button className="px-3 rounded-md hover:bg-white/5" style={{ border: `1px solid ${LINE}`, color: GOLD }} onClick={() => navigator.clipboard?.writeText(cfg.webhook)}>
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </Field>
        </div>
      </Card>

      {/* Save bar */}
      <div className="lg:col-span-3 sticky bottom-0 -mx-8 px-8 py-4 flex items-center justify-between" style={{ background: `${DARK_2}F2`, borderTop: `1px solid ${LINE}` }}>
        <span className="text-xs" style={{ color: 'rgba(246,239,229,0.55)' }}>
          {saved ? '✓ Configurações salvas com sucesso.' : 'Alterações ainda não salvas.'}
        </span>
        <div className="flex items-center gap-3">
          <button onClick={() => setCfg(WA_DEFAULTS)} className="px-4 py-2 rounded-md text-sm hover:bg-white/5" style={{ border: `1px solid ${LINE}`, color: 'rgba(246,239,229,0.75)' }}>
            Restaurar padrões
          </button>
          <button onClick={save} className="px-6 py-2 rounded-md text-sm font-medium text-white hover:opacity-90" style={{ background: GOLD }}>
            Salvar alterações
          </button>
        </div>
      </div>
    </div>
  );
}

function WhatsApp() {
  const [view, setView] = useState('conversas');
  const [cfg, setCfg] = useState(() => loadCfg());
  const [saved, setSaved] = useState(false);
  const save = () => {
    localStorage.setItem(WA_CFG_KEY, JSON.stringify(cfg));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-1 rounded-md w-fit" style={{ background: PANEL, border: `1px solid ${LINE}` }}>
        {[{ k: 'conversas', l: 'Conversas', i: MessageCircle }, { k: 'config', l: 'Configurações', i: Settings }].map((t) => (
          <button
            key={t.k}
            onClick={() => setView(t.k)}
            className="px-4 py-2 rounded text-sm flex items-center gap-2 transition-colors"
            style={{
              background: view === t.k ? `${GOLD}26` : 'transparent',
              color: view === t.k ? 'white' : 'rgba(246,239,229,0.65)',
            }}
          >
            <t.i className="w-3.5 h-3.5" /> {t.l}
          </button>
        ))}
      </div>

      {view === 'config' ? <WAConfig cfg={cfg} setCfg={setCfg} save={save} saved={saved} /> : <WAConversas />}
    </div>
  );
}

function WAConversas() {
  const [ativa, setAtiva] = useState(0);
  const [msg, setMsg] = useState('');
  const conversa = CONVERSAS[ativa];

  return (
    <div className="grid grid-cols-12 gap-4 h-[calc(100vh-160px)]">
      <Card className="col-span-4 flex flex-col">
        <div className="p-4 border-b" style={{ borderColor: LINE }}>
          <div className="flex items-center justify-between mb-3">
            <h3 style={{ fontFamily: serif, color: 'white' }} className="text-lg">Conversas</h3>
            <Pill color="#7FD19A"><span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-current" />Baileys conectado</span></Pill>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'rgba(246,239,229,0.4)' }} />
            <input
              placeholder="Buscar cliente…"
              className="w-full pl-9 pr-3 py-2 rounded-md text-sm text-white placeholder:text-white/30 focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${LINE}` }}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {CONVERSAS.map((c, i) => (
            <button
              key={c.nome}
              onClick={() => setAtiva(i)}
              className="w-full px-4 py-3 flex gap-3 text-left border-b transition-colors"
              style={{
                borderColor: LINE,
                background: ativa === i ? `${GOLD}14` : 'transparent',
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                style={{ background: GOLD, color: 'white', fontFamily: serif }}
              >
                {c.nome.split(' ').map((p) => p[0]).slice(0, 2).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm text-white truncate">{c.nome}</span>
                  <span className="text-[10px] shrink-0 ml-2" style={{ color: 'rgba(246,239,229,0.5)' }}>{c.hora}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs truncate" style={{ color: 'rgba(246,239,229,0.6)' }}>{c.preview}</span>
                  {c.unread > 0 && (
                    <span
                      className="text-[10px] font-semibold rounded-full w-4 h-4 flex items-center justify-center shrink-0"
                      style={{ background: GOLD, color: 'white' }}
                    >
                      {c.unread}
                    </span>
                  )}
                </div>
                <Pill>{c.tag}</Pill>
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="col-span-8 flex flex-col">
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: LINE }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold"
              style={{ background: GOLD, color: 'white', fontFamily: serif }}
            >
              {conversa.nome.split(' ').map((p) => p[0]).slice(0, 2).join('')}
            </div>
            <div>
              <div className="text-sm text-white">{conversa.nome}</div>
              <div className="text-[11px]" style={{ color: '#7FD19A' }}>Online · IA respondendo</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-md hover:bg-white/5" style={{ color: 'rgba(246,239,229,0.7)' }}><Phone className="w-4 h-4" /></button>
            <button className="p-2 rounded-md hover:bg-white/5" style={{ color: 'rgba(246,239,229,0.7)' }}><MoreHorizontal className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex">
            <div className="max-w-md px-4 py-3 rounded-2xl rounded-tl-sm" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-2 text-[10px] mb-2" style={{ color: GOLD_SOFT }}>
                <Mic className="w-3 h-3" /> Áudio · 0:08 · transcrito com Whisper
              </div>
              <p className="text-sm" style={{ color: 'rgba(246,239,229,0.85)' }}>
                "Boa tarde, fui demitido ontem sem justa causa, preciso de ajuda com a rescisão."
              </p>
              <div className="text-[10px] mt-2" style={{ color: 'rgba(246,239,229,0.4)' }}>14:30</div>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="max-w-md px-4 py-3 rounded-2xl rounded-tr-sm" style={{ background: `${GOLD}26`, border: `1px solid ${GOLD}40` }}>
              <div className="flex items-center gap-2 text-[10px] mb-2" style={{ color: GOLD_SOFT }}>
                <Sparkles className="w-3 h-3" /> Resposta IA · TTS enviado
              </div>
              <p className="text-sm" style={{ color: 'white' }}>
                Olá Carlos, sinto muito pela situação. Em rescisão sem justa causa você tem direito a aviso prévio, multa de 40% do FGTS, férias e 13º proporcionais. Posso agendar uma consulta gratuita amanhã às 14h?
              </p>
              <div className="h-8 flex items-end gap-0.5 mt-2">
                {Array.from({ length: 30 }).map((_, i) => (
                  <span key={i} className="flex-1 rounded-sm" style={{ background: GOLD_SOFT, height: `${20 + Math.abs(Math.sin(i * 0.7)) * 80}%` }} />
                ))}
              </div>
              <div className="text-[10px] mt-2" style={{ color: 'rgba(246,239,229,0.5)' }}>14:30 ✓✓</div>
            </div>
          </div>

          <div className="flex">
            <div className="max-w-md px-4 py-3 rounded-2xl rounded-tl-sm" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <p className="text-sm" style={{ color: 'rgba(246,239,229,0.85)' }}>Pode ser sim, doutora. Muito obrigado!</p>
              <div className="text-[10px] mt-2" style={{ color: 'rgba(246,239,229,0.4)' }}>14:32</div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex items-center gap-2" style={{ borderColor: LINE }}>
          <button className="p-2 rounded-md hover:bg-white/5" style={{ color: 'rgba(246,239,229,0.7)' }}><Paperclip className="w-4 h-4" /></button>
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Mensagem ou /ia para sugerir resposta…"
            className="flex-1 px-4 py-2.5 rounded-md text-sm text-white placeholder:text-white/30 focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${LINE}` }}
          />
          <button className="p-2 rounded-md hover:bg-white/5" style={{ color: 'rgba(246,239,229,0.7)' }}><Mic className="w-4 h-4" /></button>
          <button
            onClick={() => setMsg('')}
            className="px-4 py-2.5 rounded-md text-sm font-medium text-white hover:opacity-90"
            style={{ background: GOLD }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </Card>
    </div>
  );
}

function CRM() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {Object.entries(PIPELINE).map(([etapa, items]) => (
        <div key={etapa}>
          <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="text-sm font-semibold text-white">{etapa}</h4>
            <span className="text-xs" style={{ color: GOLD }}>{items.length}</span>
          </div>
          <div className="space-y-3">
            {items.map((it) => (
              <Card key={it.nome} className="p-4 cursor-grab hover:border-[color:var(--g)]" style={{ ['--g']: GOLD }}>
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm text-white">{it.nome}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: it.score > 80 ? '#7FD19A33' : `${GOLD}33`, color: it.score > 80 ? '#7FD19A' : GOLD }}>
                    {it.score}
                  </span>
                </div>
                <div className="text-[11px] mb-2" style={{ color: 'rgba(246,239,229,0.55)' }}>{it.area}</div>
                <div className="text-sm font-semibold" style={{ color: GOLD_SOFT, fontFamily: serif }}>{it.valor}</div>
              </Card>
            ))}
            <button
              className="w-full py-2 rounded-md text-xs flex items-center justify-center gap-1 hover:bg-white/5"
              style={{ border: `1px dashed ${LINE}`, color: 'rgba(246,239,229,0.5)' }}
            >
              <Plus className="w-3 h-3" /> Adicionar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Processos() {
  return (
    <Card>
      <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: LINE }}>
        <h3 style={{ fontFamily: serif, color: 'white' }} className="text-xl">Processos ativos</h3>
        <button className="px-4 py-2 rounded-md text-sm text-white flex items-center gap-2 hover:opacity-90" style={{ background: GOLD }}>
          <Plus className="w-4 h-4" /> Novo processo
        </button>
      </div>
      <table className="w-full">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider" style={{ color: 'rgba(246,239,229,0.5)' }}>
            <th className="px-5 py-3">Número</th>
            <th className="px-5 py-3">Cliente</th>
            <th className="px-5 py-3">Área</th>
            <th className="px-5 py-3">Próximo prazo</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {PROCESSOS.map((p) => (
            <tr key={p.num} className="border-t hover:bg-white/5" style={{ borderColor: LINE }}>
              <td className="px-5 py-4 text-sm" style={{ color: 'rgba(246,239,229,0.85)', fontFamily: 'monospace' }}>{p.num}</td>
              <td className="px-5 py-4 text-sm text-white">{p.cliente}</td>
              <td className="px-5 py-4"><Pill>{p.area}</Pill></td>
              <td className="px-5 py-4 text-sm" style={{ color: GOLD_SOFT }}>{p.prazo}</td>
              <td className="px-5 py-4"><Pill color={p.status === 'Sentença' ? '#7FD19A' : p.status === 'Audiência' ? '#E0995A' : GOLD}>{p.status}</Pill></td>
              <td className="px-5 py-4 text-right"><button className="text-xs" style={{ color: GOLD }}>Abrir <ArrowUpRight className="inline w-3 h-3" /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function Agenda() {
  const dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 style={{ fontFamily: serif, color: 'white' }} className="text-xl">Semana — 09 a 13 de junho</h3>
          <Pill>4 compromissos hoje</Pill>
        </div>
        <div className="grid grid-cols-5 gap-3 text-center mb-5">
          {dias.map((d, i) => (
            <div key={d} className="p-3 rounded-md" style={{ background: i === 0 ? `${GOLD}26` : 'rgba(255,255,255,0.03)', border: `1px solid ${i === 0 ? GOLD : LINE}` }}>
              <div className="text-[11px]" style={{ color: 'rgba(246,239,229,0.55)' }}>{d}</div>
              <div className="text-xl mt-1" style={{ fontFamily: serif, color: 'white' }}>{9 + i}</div>
              <div className="text-[10px] mt-1" style={{ color: GOLD }}>{[4, 2, 3, 1, 5][i]} eventos</div>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {AGENDA.map((a) => (
            <div key={a.titulo} className="flex gap-4 p-4 rounded-md" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${LINE}` }}>
              <div className="text-center shrink-0">
                <div className="text-lg" style={{ fontFamily: serif, color: GOLD_SOFT }}>{a.hora}</div>
              </div>
              <div className="flex-1">
                <div className="text-sm text-white mb-1">{a.titulo}</div>
                <div className="text-xs" style={{ color: 'rgba(246,239,229,0.55)' }}>{a.local || 'Sem local'}</div>
              </div>
              <Pill color={a.tipo === 'Prazo' ? '#E07A6B' : a.tipo === 'Audiência' ? GOLD : '#7FD19A'}>{a.tipo}</Pill>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 style={{ fontFamily: serif, color: 'white' }} className="text-xl mb-5">Agendamento automático</h3>
        <p className="text-sm mb-5" style={{ color: 'rgba(246,239,229,0.6)' }}>
          O cliente confirma o horário no WhatsApp e a agenda + link Meet são criados automaticamente.
        </p>
        <div className="space-y-3">
          {[
            { c: 'Ana Beatriz Lima', q: 'Consulta — Família', h: 'Amanhã 10:30' },
            { c: 'Marcos Tavares', q: 'Reunião tributária', h: 'Qui 15:00' },
            { c: 'Patrícia Alves', q: 'Primeira consulta', h: 'Sex 09:00' },
          ].map((x, i) => (
            <div key={i} className="p-3 rounded-md" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-white">{x.c}</span>
                <CheckCircle2 className="w-4 h-4" style={{ color: '#7FD19A' }} />
              </div>
              <div className="text-[11px]" style={{ color: 'rgba(246,239,229,0.55)' }}>{x.q} · {x.h}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Financeiro() {
  const total = FINANCEIRO.filter((f) => f.status === 'Pago').reduce((s, f) => s + parseInt(f.valor.replace(/\D/g, ''), 10), 0);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="text-xs mb-2" style={{ color: 'rgba(246,239,229,0.55)' }}>Recebido no mês</div>
          <div style={{ fontFamily: serif, color: 'white' }} className="text-3xl">R$ {total.toLocaleString('pt-BR')}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs mb-2" style={{ color: 'rgba(246,239,229,0.55)' }}>A receber</div>
          <div style={{ fontFamily: serif, color: GOLD_SOFT }} className="text-3xl">R$ 4.800</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs mb-2" style={{ color: 'rgba(246,239,229,0.55)' }}>Vencidos</div>
          <div style={{ fontFamily: serif, color: '#E07A6B' }} className="text-3xl">R$ 1.800</div>
        </Card>
      </div>

      <Card>
        <div className="p-5 border-b" style={{ borderColor: LINE }}>
          <h3 style={{ fontFamily: serif, color: 'white' }} className="text-xl">Movimentações</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider" style={{ color: 'rgba(246,239,229,0.5)' }}>
              <th className="px-5 py-3">Cliente</th>
              <th className="px-5 py-3">Descrição</th>
              <th className="px-5 py-3">Valor</th>
              <th className="px-5 py-3">Vencimento</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {FINANCEIRO.map((f, i) => (
              <tr key={i} className="border-t" style={{ borderColor: LINE }}>
                <td className="px-5 py-4 text-sm text-white">{f.cliente}</td>
                <td className="px-5 py-4 text-sm" style={{ color: 'rgba(246,239,229,0.75)' }}>{f.desc}</td>
                <td className="px-5 py-4 text-sm" style={{ color: GOLD_SOFT, fontFamily: serif }}>{f.valor}</td>
                <td className="px-5 py-4 text-sm" style={{ color: 'rgba(246,239,229,0.65)' }}>{f.data}</td>
                <td className="px-5 py-4">
                  <Pill color={f.status === 'Pago' ? '#7FD19A' : f.status === 'Vencido' ? '#E07A6B' : GOLD}>{f.status}</Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Criativos() {
  const [prompt, setPrompt] = useState('');
  const ideias = [
    { rede: 'Instagram', titulo: 'Direitos na rescisão sem justa causa', tag: 'Carrossel · 7 slides' },
    { rede: 'LinkedIn', titulo: 'Reforma tributária: o que muda para PMEs', tag: 'Artigo · 800 palavras' },
    { rede: 'Facebook', titulo: 'Pensão alimentícia: mitos e verdades', tag: 'Reels · 45s' },
    { rede: 'Instagram', titulo: 'INSS — aposentadoria especial atualizada', tag: 'Story · 5 frames' },
  ];
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 style={{ fontFamily: serif, color: 'white' }} className="text-xl mb-4">Gerar criativo com IA</h3>
        <div className="flex gap-3">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex: post sobre licença-maternidade para autônomas…"
            className="flex-1 px-4 py-3 rounded-md text-sm text-white placeholder:text-white/30 focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${LINE}` }}
          />
          <button className="px-6 py-3 rounded-md text-sm font-medium text-white flex items-center gap-2 hover:opacity-90" style={{ background: GOLD }}>
            <Sparkles className="w-4 h-4" /> Gerar
          </button>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {ideias.map((i) => (
          <Card key={i.titulo} className="p-5 hover:border-[color:var(--g)] cursor-pointer" style={{ ['--g']: GOLD }}>
            <div className="flex items-start justify-between mb-3">
              <Pill>{i.rede}</Pill>
              <Sparkles className="w-4 h-4" style={{ color: GOLD }} />
            </div>
            <h4 style={{ fontFamily: serif, color: 'white' }} className="text-lg mb-2">{i.titulo}</h4>
            <div className="text-xs" style={{ color: 'rgba(246,239,229,0.55)' }}>{i.tag}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Metricas() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[
          { l: 'Tempo médio de resposta', v: '38s', d: 'IA' },
          { l: 'Conversões WhatsApp', v: '42%', d: 'leads → clientes' },
          { l: 'Áudios transcritos', v: '1.284', d: 'no mês' },
          { l: 'Custo médio por lead', v: 'R$ 12', d: '-31% MoM' },
        ].map((k) => (
          <Card key={k.l} className="p-5">
            <div className="text-xs mb-2" style={{ color: 'rgba(246,239,229,0.55)' }}>{k.l}</div>
            <div style={{ fontFamily: serif, color: 'white' }} className="text-3xl mb-1">{k.v}</div>
            <div className="text-[11px]" style={{ color: GOLD }}>{k.d}</div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h3 style={{ fontFamily: serif, color: 'white' }} className="text-xl mb-5">Distribuição por área jurídica</h3>
        <div className="space-y-3">
          {[
            { area: 'Trabalhista', pct: 38 }, { area: 'Família', pct: 24 },
            { area: 'Cível', pct: 18 }, { area: 'Previdenciário', pct: 12 }, { area: 'Tributário', pct: 8 },
          ].map((a) => (
            <div key={a.area}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-white">{a.area}</span>
                <span style={{ color: GOLD }}>{a.pct}%</span>
              </div>
              <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="h-full rounded-full" style={{ width: `${a.pct * 2}%`, background: `linear-gradient(90deg, ${GOLD}, ${GOLD_SOFT})` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ChatIA() {
  const [msgs, setMsgs] = useState([
    { role: 'ai', text: 'Olá! Sou a IA jurídica do escritório. Posso resumir processos, redigir petições e tirar dúvidas. Como posso ajudar?' },
  ]);
  const [input, setInput] = useState('');
  const send = () => {
    if (!input.trim()) return;
    const q = input.trim();
    setMsgs((m) => [...m, { role: 'user', text: q }]);
    setInput('');
    setTimeout(() => setMsgs((m) => [...m, { role: 'ai', text: 'Analisando sua questão com base em jurisprudência recente...' }]), 600);
  };
  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-180px)]">
      <Card className="col-span-3 p-4 overflow-y-auto">
        <div style={{ fontFamily: serif, color: 'white' }} className="text-lg mb-3">Conversas</div>
        {['Demissão sem justa causa', 'Pensão alimentícia', 'Revisão de aposentadoria', 'Contrato de honorários'].map((t) => (
          <button key={t} className="w-full text-left px-3 py-2 rounded-md text-xs mb-1 hover:bg-white/5" style={{ color: 'rgba(246,239,229,0.75)' }}>{t}</button>
        ))}
        <button className="w-full mt-3 px-3 py-2 rounded-md text-xs flex items-center gap-2" style={{ background: `${GOLD}26`, color: 'white' }}>
          <Plus className="w-3.5 h-3.5" /> Nova conversa
        </button>
      </Card>
      <Card className="col-span-9 flex flex-col">
        <div className="flex-1 p-6 overflow-y-auto space-y-3">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[75%] px-4 py-2.5 rounded-2xl text-sm" style={{
                background: m.role === 'user' ? GOLD : 'rgba(255,255,255,0.04)',
                color: m.role === 'user' ? 'white' : CREAM,
                border: m.role === 'user' ? 'none' : `1px solid ${LINE}`,
              }}>{m.text}</div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t flex gap-2" style={{ borderColor: LINE }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Pergunte sobre um processo, lei ou redija uma petição..."
            className="flex-1 px-4 py-2.5 rounded-md text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${LINE}`, color: CREAM }} />
          <button onClick={send} className="px-4 rounded-md" style={{ background: GOLD, color: 'white' }}>
            <Send className="w-4 h-4" />
          </button>
        </div>
      </Card>
    </div>
  );
}

function AIBuilder() {
  const [steps, setSteps] = useState([
    { id: 1, type: 'Gatilho', label: 'Mensagem WhatsApp recebida' },
    { id: 2, type: 'IA', label: 'Classificar área jurídica' },
    { id: 3, type: 'Ação', label: 'Criar lead no CRM' },
    { id: 4, type: 'Resposta', label: 'Enviar resposta automática' },
  ]);
  const addStep = () => setSteps((s) => [...s, { id: Date.now(), type: 'Ação', label: 'Nova etapa' }]);
  return (
    <div className="grid grid-cols-12 gap-6">
      <Card className="col-span-8 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div style={{ fontFamily: serif, color: 'white' }} className="text-xl">Fluxo de automação</div>
            <div className="text-xs" style={{ color: 'rgba(246,239,229,0.6)' }}>Monte fluxos com IA sem código</div>
          </div>
          <button onClick={addStep} className="px-3 py-2 rounded-md text-xs flex items-center gap-2" style={{ background: GOLD, color: 'white' }}>
            <Plus className="w-3.5 h-3.5" /> Adicionar etapa
          </button>
        </div>
        <div className="space-y-3">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px]" style={{ background: GOLD, color: 'white' }}>{i + 1}</div>
              <div className="flex-1 p-3 rounded-md flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${LINE}` }}>
                <div>
                  <Pill>{s.type}</Pill>
                  <div className="text-sm mt-1 text-white">{s.label}</div>
                </div>
                <button onClick={() => setSteps((arr) => arr.filter((x) => x.id !== s.id))} className="text-xs" style={{ color: 'rgba(246,239,229,0.5)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="col-span-4 p-6">
        <div style={{ fontFamily: serif, color: 'white' }} className="text-lg mb-3">Templates prontos</div>
        {['Triagem inicial de cliente', 'Lembrete de audiência', 'Cobrança automática', 'Pós-atendimento NPS'].map((t) => (
          <button key={t} className="w-full text-left px-3 py-2.5 rounded-md text-xs mb-2 hover:bg-white/5" style={{ color: CREAM, border: `1px solid ${LINE}` }}>
            {t}
          </button>
        ))}
      </Card>
    </div>
  );
}

function ImageFusion() {
  const [prompt, setPrompt] = useState('Combinar foto da Dra. Kênia com cenário de tribunal estilo editorial');
  return (
    <div className="grid grid-cols-12 gap-6">
      <Card className="col-span-4 p-6">
        <div style={{ fontFamily: serif, color: 'white' }} className="text-lg mb-4">Combinar imagens</div>
        {[1, 2].map((n) => (
          <div key={n} className="mb-3 p-6 rounded-md text-center text-xs cursor-pointer hover:bg-white/5"
            style={{ border: `1.5px dashed ${LINE}`, color: 'rgba(246,239,229,0.6)' }}>
            <ImagePlus className="w-6 h-6 mx-auto mb-2" style={{ color: GOLD }} />
            Imagem {n} — clique para enviar
          </div>
        ))}
        <label className="text-[11px] uppercase tracking-wider" style={{ color: GOLD_SOFT }}>Instrução</label>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3}
          className="w-full mt-2 p-3 rounded-md text-sm outline-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${LINE}`, color: CREAM }} />
        <button className="w-full mt-3 py-2.5 rounded-md text-sm" style={{ background: GOLD, color: 'white' }}>
          Gerar fusão com IA
        </button>
      </Card>
      <Card className="col-span-8 p-6">
        <div style={{ fontFamily: serif, color: 'white' }} className="text-lg mb-4">Resultado</div>
        <div className="aspect-video rounded-md flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${LINE}` }}>
          <div className="text-center" style={{ color: 'rgba(246,239,229,0.5)' }}>
            <Sparkles className="w-10 h-10 mx-auto mb-2" style={{ color: GOLD }} />
            <div className="text-sm">Envie duas imagens e descreva a fusão</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SocialConnections() {
  const NETS = [
    { name: 'Instagram', desc: 'Publicação automática de criativos', connected: true },
    { name: 'Facebook', desc: 'Posts e anúncios via Meta', connected: true },
    { name: 'LinkedIn', desc: 'Conteúdo profissional', connected: false },
    { name: 'Google Business', desc: 'Avaliações e horário do escritório', connected: false },
    { name: 'YouTube', desc: 'Vídeos curtos e lives', connected: false },
    { name: 'TikTok', desc: 'Shorts jurídicos', connected: false },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {NETS.map((n) => (
        <Card key={n.name} className="p-5">
          <div className="flex items-start justify-between mb-3">
            <Share2 className="w-6 h-6" style={{ color: GOLD }} />
            <Pill color={n.connected ? '#5ac28a' : GOLD_SOFT}>{n.connected ? 'Conectado' : 'Desconectado'}</Pill>
          </div>
          <div style={{ fontFamily: serif, color: 'white' }} className="text-lg">{n.name}</div>
          <div className="text-xs mb-4" style={{ color: 'rgba(246,239,229,0.6)' }}>{n.desc}</div>
          <button className="w-full py-2 rounded-md text-xs"
            style={{ background: n.connected ? 'transparent' : GOLD, color: n.connected ? CREAM : 'white', border: n.connected ? `1px solid ${LINE}` : 'none' }}>
            {n.connected ? 'Desconectar' : 'Conectar'}
          </button>
        </Card>
      ))}
    </div>
  );
}

function SettingsPanel() {
  return (
    <div className="max-w-3xl space-y-6">
      <Card className="p-6">
        <div style={{ fontFamily: serif, color: 'white' }} className="text-xl mb-4">Perfil do escritório</div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { l: 'Nome', v: 'Dra. Kênia Garcia' },
            { l: 'OAB', v: 'OAB/GO 123.456' },
            { l: 'E-mail', v: 'contato@keniagarcia.adv.br' },
            { l: 'WhatsApp', v: '(62) 99999-0000' },
          ].map((f) => (
            <div key={f.l}>
              <label className="text-[11px] uppercase tracking-wider" style={{ color: GOLD_SOFT }}>{f.l}</label>
              <input defaultValue={f.v} className="w-full mt-1 px-3 py-2 rounded-md text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${LINE}`, color: CREAM }} />
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-6">
        <div style={{ fontFamily: serif, color: 'white' }} className="text-xl mb-4">Segurança</div>
        <button className="px-4 py-2 rounded-md text-sm" style={{ background: GOLD, color: 'white' }}>Alterar senha</button>
        <button className="ml-3 px-4 py-2 rounded-md text-sm" style={{ border: `1px solid ${LINE}`, color: CREAM }}>Ativar 2FA</button>
      </Card>
      <Card className="p-6">
        <div style={{ fontFamily: serif, color: 'white' }} className="text-xl mb-4">Preferências</div>
        {['Receber e-mails de novos leads', 'Notificação sonora de WhatsApp', 'Modo escuro (padrão)'].map((p) => (
          <div key={p} className="flex items-center justify-between py-2.5 border-b last:border-0" style={{ borderColor: LINE }}>
            <span className="text-sm" style={{ color: CREAM }}>{p}</span>
            <Toggle checked onChange={() => {}} />
          </div>
        ))}
      </Card>
    </div>
  );
}

function AdminCases() {
  const CASOS = [
    { id: 'C-1042', cliente: 'Carlos Mendes', adv: 'Dra. Kênia', area: 'Trabalhista', status: 'Ativo' },
    { id: 'C-1043', cliente: 'Ana Beatriz', adv: 'Dr. Lucas', area: 'Família', status: 'Aguardando' },
    { id: 'C-1044', cliente: 'Roberto Souza', adv: 'Dra. Kênia', area: 'Cível', status: 'Encerrado' },
    { id: 'C-1045', cliente: 'Helena Costa', adv: 'Dra. Marina', area: 'Trabalhista', status: 'Ativo' },
  ];
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div style={{ fontFamily: serif, color: 'white' }} className="text-xl">Gestão de casos (Admin)</div>
        <button className="px-3 py-2 rounded-md text-xs flex items-center gap-2" style={{ background: GOLD, color: 'white' }}>
          <Plus className="w-3.5 h-3.5" /> Novo caso
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider" style={{ color: GOLD_SOFT }}>
            <th className="py-2">ID</th><th>Cliente</th><th>Advogado</th><th>Área</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          {CASOS.map((c) => (
            <tr key={c.id} className="border-t" style={{ borderColor: LINE, color: CREAM }}>
              <td className="py-3" style={{ color: GOLD }}>{c.id}</td>
              <td>{c.cliente}</td><td>{c.adv}</td><td>{c.area}</td>
              <td><Pill color={c.status === 'Ativo' ? '#5ac28a' : c.status === 'Encerrado' ? GOLD_SOFT : GOLD}>{c.status}</Pill></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

const PANELS = {
  dashboard: Dashboard, whatsapp: WhatsApp, crm: CRM, processos: Processos,
  agenda: Agenda, financeiro: Financeiro, criativos: Criativos, metricas: Metricas,
  chatia: ChatIA, aibuilder: AIBuilder, imagefusion: ImageFusion,
  social: SocialConnections, settings: SettingsPanel, admincases: AdminCases,
};

export default function KeniaDashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [active, setActive] = useState('dashboard');
  const Panel = useMemo(() => PANELS[active], [active]);
  const titulo = NAV.find((n) => n.id === active)?.label;

  const handleLogout = async () => { await logout(); navigate('/'); };

  return (
    <div className="min-h-screen flex" style={{ background: DARK_2, fontFamily: sans }}>
      {/* Sidebar */}
      <aside
        className="w-64 shrink-0 flex flex-col"
        style={{ background: DARK, borderRight: `1px solid ${LINE}` }}
      >
        <div className="p-6 border-b" style={{ borderColor: LINE }}>
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-md flex items-center justify-center text-sm"
              style={{ border: `1.5px solid ${GOLD}`, color: GOLD, fontFamily: serif, fontWeight: 600 }}
            >
              KG
            </div>
            <div className="leading-tight">
              <div style={{ fontFamily: serif, color: 'white' }} className="text-base">Kênia Garcia</div>
              <div style={{ color: GOLD, letterSpacing: '0.25em' }} className="text-[9px] font-medium">ADVOCACIA</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors"
                style={{
                  background: isActive ? `${GOLD}26` : 'transparent',
                  color: isActive ? 'white' : 'rgba(246,239,229,0.65)',
                  borderLeft: `2px solid ${isActive ? GOLD : 'transparent'}`,
                }}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t space-y-1" style={{ borderColor: LINE }}>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm hover:bg-white/5" style={{ color: 'rgba(246,239,229,0.65)' }}>
            <Settings className="w-4 h-4" /> Configurações
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm hover:bg-white/5"
            style={{ color: 'rgba(246,239,229,0.65)' }}
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="h-16 px-8 flex items-center justify-between shrink-0"
          style={{ background: DARK, borderBottom: `1px solid ${LINE}` }}
        >
          <div>
            <h1 style={{ fontFamily: serif, color: 'white' }} className="text-2xl">{titulo}</h1>
          </div>

          <div className="flex items-center gap-4">
            <div
              className="hidden md:flex items-center gap-2 px-3 py-2 rounded-md text-xs"
              style={{ background: `${GOLD}1A`, color: GOLD_SOFT, border: `1px solid ${LINE}` }}
            >
              <QrCode className="w-3.5 h-3.5" /> Baileys conectado
            </div>
            <button className="p-2 rounded-md hover:bg-white/5 relative" style={{ color: 'rgba(246,239,229,0.7)' }}>
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />
            </button>
            <div className="flex items-center gap-3 pl-4" style={{ borderLeft: `1px solid ${LINE}` }}>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold"
                style={{ background: GOLD, color: 'white', fontFamily: serif }}
              >
                {(user?.name || user?.email || 'KG').slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden md:block leading-tight">
                <div className="text-sm text-white">{user?.name || 'Dra. Kênia'}</div>
                <div className="text-[11px]" style={{ color: 'rgba(246,239,229,0.55)' }}>{user?.email || 'admin@kenia.adv'}</div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto" style={{ color: CREAM }}>
          <Panel />
        </main>
      </div>
    </div>
  );
}
