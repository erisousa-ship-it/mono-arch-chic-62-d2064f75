import { useEffect, useState } from "react";
import { api } from "@/kenia/lib/api";
import { Card } from "@/kenia/components/ui/card";
import { Badge } from "@/kenia/components/ui/badge";
import { TrendingUp, Users, Wallet, Scale, Target } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";

const STAGE_LABELS = {
  novos_leads: "Novos Leads", em_contato: "Em Contato", interessado: "Interessado",
  qualificado: "Qualificado", em_negociacao: "Em Negociação",
  convertido: "Convertido", nao_interessado: "Não Interessado",
};
const STAGE_COLORS = {
  novos_leads: "#3B82F6", em_contato: "#EAB308", interessado: "#10B981",
  qualificado: "#A855F7", em_negociacao: "#F97316",
  convertido: "#059669", nao_interessado: "#EF4444",
};

export default function Analytics() {
  const [m, setM] = useState(null);

  useEffect(() => {
    api.get("/dashboard/metrics").then(r => setM(r.data)).catch(() => setM({}));
  }, []);

  if (!m) {
    return <div className="p-12 text-nude-400">Carregando métricas...</div>;
  }

  // Defaults para evitar crash quando o backend não retorna dados
  const leads = m.leads || { total: 0, conversion_rate: 0, by_stage: {} };
  const finance = m.finance || { receita_paga: 0, receita_pendente: 0, despesas: 0, lucro: 0 };
  const processes = m.processes || { ativos: 0, total: 0 };


  const fmt = v => (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const stageData = Object.entries(leads.by_stage || {}).map(([k, v]) => ({
    name: STAGE_LABELS[k] || k, value: v, color: STAGE_COLORS[k] || "#64748B",
  }));

  const financeData = [
    { name: "Receita Paga", value: finance.receita_paga, color: "#059669" },
    { name: "A Receber", value: finance.receita_pendente, color: "#D97706" },
    { name: "Despesas", value: finance.despesas, color: "#DC2626" },
  ];


  return (
    <div className="h-screen flex flex-col bg-nude-50 overflow-hidden">
      <div className="px-6 py-4 bg-white border-b border-nude-200">
        <div className="text-xs tracking-widest uppercase text-gold-600 font-semibold">Métricas</div>
        <h1 className="font-display font-bold text-2xl">Dashboard de Performance</h1>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <KPI label="Total de Leads" value={leads.total} Icon={Users} color="bg-nude-900 text-white" />
          <KPI label="Conversão" value={`${leads.conversion_rate}%`} Icon={Target} color="bg-gold-500 text-white" />
          <KPI label="Faturamento" value={fmt(finance.receita_paga)} Icon={Wallet} color="bg-gold-600 text-white" />
          <KPI label="Processos Ativos" value={processes.ativos} Icon={Scale} color="bg-blue-600 text-white" />

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <Card className="p-5 border-nude-200">
            <div className="mb-4">
              <h3 className="font-display font-semibold text-base">Pipeline CRM</h3>
              <div className="text-xs text-nude-500">Distribuição de leads por estágio</div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748B" }} />
                <YAxis tick={{ fontSize: 12, fill: "#64748B" }} />
                <Tooltip contentStyle={{ borderRadius: 6, border: "1px solid #E2E8F0" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {stageData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-5 border-nude-200">
            <div className="mb-4">
              <h3 className="font-display font-semibold text-base">Demonstrativo Financeiro</h3>
              <div className="text-xs text-nude-500">Receitas vs despesas</div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={financeData} dataKey="value" nameKey="name" outerRadius={90} innerRadius={50}>
                  {financeData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 6, border: "1px solid #E2E8F0" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <Card className="p-5 border-nude-200">
          <h3 className="font-display font-semibold text-base mb-4">Resumo Geral</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Lucro Líquido" value={fmt(finance.lucro)} accent={finance.lucro >= 0 ? "emerald" : "rose"} />
            <Stat label="Receita Pendente" value={fmt(finance.receita_pendente)} accent="amber" />
            <Stat label="Total Processos" value={processes.total} />
            <Stat label="Taxa Conversão" value={`${leads.conversion_rate}%`} accent="amber" />

          </div>
        </Card>
      </div>
    </div>
  );
}

function KPI({ label, value, Icon, color }) {
  return (
    <Card className="p-4 border-nude-200">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-nude-500">{label}</div>
          <div className="font-display font-bold text-3xl mt-1 text-nude-900">{value}</div>
        </div>
        <div className={`w-10 h-10 rounded-md ${color} grid place-items-center`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );
}

function Stat({ label, value, accent }) {
  const colors = {
    emerald: "text-gold-600",
    rose: "text-rose-600",
    amber: "text-gold-600",
  };
  return (
    <div>
      <div className="text-xs text-nude-500">{label}</div>
      <div className={`font-display font-bold text-xl mt-1 ${colors[accent] || "text-nude-900"}`}>{value}</div>
    </div>
  );
}
