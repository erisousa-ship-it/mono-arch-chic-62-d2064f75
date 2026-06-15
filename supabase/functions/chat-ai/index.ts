import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const MODEL = "google/gemini-3-flash-preview";

const SYSTEM = `Você é a secretária virtual da Dra. Kênia Garcia, advogada brasileira. ` +
  `Responda em PT-BR, tom acolhedor de WhatsApp, 2-4 frases, uma pergunta por vez. ` +
  `Nunca pergunte ao cliente qual é a área jurídica; pergunte primeiro o que aconteceu e inferir a área internamente pelos fatos. ` +
  `Colete o máximo possível de informações úteis, como procedimento de secretária e advogado: datas, local, envolvidos, vínculo, provas, documentos, testemunhas, prazos, medidas já tomadas e objetivo do cliente. ` +
  `Use horário oficial de Brasília. Não invente leis, jurisprudência ou números de processo. ` +
  `Quando houver dúvida jurídica, traga (1) caminhos possíveis pela lei, (2) o que é necessário providenciar, ` +
  `(3) sempre complemente com os serviços da Dra. Kênia (consulta, petição, acompanhamento). ` +
  `Nunca recuse ajuda. Em casos de violência, acolha, oriente emergência (190/180/100/SAMU 192), ` +
  `medidas protetivas (Lei 11.340/06) e encaminhe à Dra. Kênia.`;

const ANALYSIS_INSTRUCTION = `Além da resposta ao cliente, analise tecnicamente o caso com base na LEGISLAÇÃO E JURISPRUDÊNCIA brasileira ` +
  `(STF, STJ, súmulas vinculantes, teses de repercussão geral, recursos repetitivos, súmulas do TST quando trabalhista). ` +
  `Cite súmulas/teses pelo número apenas se tiver certeza; caso contrário, descreva o entendimento sem inventar número.`;

function todayHumanBR() {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", weekday: "long",
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date());
}

function greetingNow(): "Bom dia" | "Boa tarde" | "Boa noite" {
  const h = parseInt(new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false,
  }).format(new Date()), 10);
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { message = "", history = [], session_id = null, return_analysis = false } = body || {};

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "Missing LOVABLE_API_KEY" }, 500);

    const ctxTemporal = `Agora em Brasília: ${todayHumanBR()}. Saudação adequada: "${greetingNow()}".`;

    const tools = [{
      type: "function",
      function: {
        name: "responder_e_analisar",
        description: "Responde ao cliente e devolve a análise técnica do caso com base em legislação e jurisprudência.",
        parameters: {
          type: "object",
          properties: {
            response: { type: "string", description: "Resposta direta ao cliente, estilo WhatsApp, 2-4 frases." },
            handoff: { type: "boolean", description: "true se o cliente pediu para falar com a Dra. Kênia ou for urgência grave." },
            analysis: {
              type: "object",
              properties: {
                area: { type: "string", description: "Área do Direito (Família, Trabalhista, Previdenciário, Consumidor, Cível, Criminal, etc)." },
                qualificacao: { type: "string", enum: ["qualificado", "nao_qualificado", "necessita_mais_info"] },
                acertividade: { type: "number", description: "0 a 100 — quão claro está o caso." },
                chance_exito: { type: "number", description: "0 a 100 — chance de êxito jurídico." },
                resumo: { type: "string", description: "Resumo objetivo do caso (até 280 chars)." },
                motivo: { type: "string", description: "Justificativa técnica para acertividade/chance." },
                proxima_pergunta: { type: "string", description: "Próxima pergunta que falta para fechar a triagem." },
                fundamentos: {
                  type: "array",
                  items: { type: "string" },
                  description: "Leis e artigos aplicáveis (ex.: 'CLT art. 477', 'Lei 11.340/06 art. 18').",
                },
                jurisprudencia: {
                  type: "array",
                  items: { type: "string" },
                  description: "Entendimentos de STF/STJ/TST aplicáveis (súmulas/teses/recursos repetitivos). Sem inventar números.",
                },
              },
              required: ["area", "qualificacao", "acertividade", "chance_exito", "resumo", "motivo", "proxima_pergunta", "fundamentos", "jurisprudencia"],
              additionalProperties: false,
            },
          },
          required: ["response", "analysis"],
          additionalProperties: false,
        },
      },
    }];

    const messages = [
      { role: "system", content: `${SYSTEM}\n\n${ANALYSIS_INSTRUCTION}\n\nCONTEXTO TEMPORAL: ${ctxTemporal}` },
      ...(Array.isArray(history) ? history : []).slice(-20).map((m: any) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: String(m.content || ""),
      })),
      { role: "user", content: String(message || "") },
    ];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        tools,
        tool_choice: { type: "function", function: { name: "responder_e_analisar" } },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("chat-ai upstream", resp.status, text);
      return json({ error: text }, resp.status);
    }
    const data = await resp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    let payload: any = null;
    try { payload = JSON.parse(call?.function?.arguments || "{}"); } catch { payload = {}; }

    const reply = payload?.response || data?.choices?.[0]?.message?.content || "Pode me contar um pouco mais sobre o que aconteceu?";
    const analysis = return_analysis ? (payload?.analysis || null) : null;

    return json({
      session_id: session_id || crypto.randomUUID(),
      response: reply,
      audio_base64: null,
      appointment: null,
      handoff: Boolean(payload?.handoff),
      speaker: payload?.handoff ? "Dra. Kênia Garcia" : null,
      analysis,
      server_time: new Date().toISOString(),
    });
  } catch (e) {
    console.error("chat-ai error", e);
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}