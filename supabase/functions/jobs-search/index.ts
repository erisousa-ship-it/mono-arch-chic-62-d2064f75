// Edge function: busca vagas de emprego no Brasil via Lovable AI Gateway
// e retorna em JSON para renderizar dentro do app (sem redirecionar).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const query = (url.searchParams.get("query") || "emprego").trim();
    const location = (url.searchParams.get("location") || "Brasil").trim();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY ausente" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `Você é um agregador de vagas de emprego no Brasil. Gere uma lista realista de vagas abertas no Brasil que correspondam ao termo de busca e localidade. Use empresas reais brasileiras quando possível (Magazine Luiza, iFood, Ambev, Localiza, Natura, Itaú, Bradesco, Petrobras, Globo, Mercado Livre, Stone, Nubank, JBS, Vivo, Claro, etc.). Retorne SOMENTE JSON válido (sem markdown, sem comentários).`;

    const user = `Termo de busca: "${query}"\nLocalidade: "${location}"\n\nRetorne JSON com este formato exato:\n{\n  "jobs": [\n    {\n      "id": "string único",\n      "title": "Título da vaga",\n      "company": "Nome da empresa",\n      "location": "Cidade, Estado",\n      "salary": "Faixa salarial em R$ ou 'A combinar'",\n      "type": "CLT | PJ | Estágio | Temporário",\n      "description": "Descrição curta (1-2 frases)",\n      "posted": "Há X dias",\n      "apply_url": "URL de busca no Indeed Brasil para esta vaga (https://br.indeed.com/jobs?q=...&l=...)"\n    }\n  ]\n}\n\nGere 12 vagas variadas e relevantes.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const text = await aiResp.text();
      return new Response(JSON.stringify({ error: "AI gateway error", detail: text }), {
        status: aiResp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const content = aiData?.choices?.[0]?.message?.content || "{}";
    let parsed: { jobs?: unknown[] } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { jobs: [] };
    }

    const jobs = Array.isArray(parsed.jobs) ? parsed.jobs : [];
    return new Response(JSON.stringify({ jobs, total: jobs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
