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
      "Resumo legal do dia indisponível no momento. Acompanhe as publicações oficiais no Diário Oficial da União (in.gov.br), STF, STJ e CNJ.",
  };

  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json(fallback);

    const prompt = `Gere um brief jurídico do dia (${dateHuman}) para uma advogada brasileira. ` +
      `Em até 6 linhas, destaque temas relevantes do direito brasileiro hoje: novidades legislativas recentes, ` +
      `súmulas/teses do STF e STJ aplicáveis, prazos e datas importantes do calendário forense, e 1 dica prática. ` +
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