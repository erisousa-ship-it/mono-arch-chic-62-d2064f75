import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const today = new Date();
  const dateHuman = today.toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
    timeZone: "America/Sao_Paulo",
  });

  const fallback = {
    date_human: dateHuman,
    brief:
      "Resumo legal do dia indisponível no momento. Acompanhe Jusbrasil, Diário Oficial da União (in.gov.br), STF, STJ, CNJ e TST para checagem atualizada.",
  };

  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json(fallback);

    const prompt = `Gere um brief jurídico atualizado do dia (${dateHuman}) para uma advogada brasileira. ` +
      `Use como referência complementar o Jusbrasil (notícias jurídicas, jurisprudência e doutrina) e confirme em fontes oficiais como DOU, Planalto, STF, STJ, CNJ e TST. ` +
      `Em até 6 linhas, destaque temas relevantes do direito brasileiro hoje: novidades legislativas recentes, jurisprudência/teses aplicáveis, prazos e datas importantes do calendário forense, e 1 dica prática. ` +
      `Texto corrido, em português, sem listas, sem inventar números de processo ou leis inexistentes.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é uma assistente jurídica brasileira. Seja precisa, sem inventar dados." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!resp.ok) {
      console.error("legal-brief upstream", resp.status, await resp.text());
      return json(fallback);
    }
    const data = await resp.json();
    const brief = data?.choices?.[0]?.message?.content?.trim() || fallback.brief;
    return json({ date_human: dateHuman, brief });
  } catch (e) {
    console.error("legal-brief error", e);
    return json(fallback);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}