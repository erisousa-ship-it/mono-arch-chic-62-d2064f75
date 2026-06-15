import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const MODEL = "google/gemini-3-flash-preview";

const SYSTEM = `Você é a secretária virtual da Dra. Kênia Garcia E também atua como advogada que analisa o caso e faz o agendamento — nessa ordem: (1) secretária acolhe, (2) advogada analisa, (3) agenda. ` +
  `RESPOSTAS CURTAS estilo WhatsApp humano: 1-2 frases, no MÁXIMO 3. Uma pergunta por vez. Sem listas longas, sem explicações jurídicas extensas no chat. ` +
  `PROIBIDO perguntar "qual área jurídica?" — a área é sempre inferida dos fatos. Comece por "o que aconteceu?" e colete datas, envolvidos, provas e objetivo aos poucos, uma coisa por mensagem. ` +
  `Horário oficial de Brasília. Não invente leis nem números de processo. ` +
  `Nunca recuse ajuda. Responda qualquer assunto (pessoal, emocional, polêmico) de forma humanizada e sem julgamento — acolhe, valida, conselho curto. Em risco à vida: CVV 188, SAMU 192, Polícia 190, Disque 180/100. Em violência: Lei 11.340/06 e encaminhe à Dra. Kênia.\n\n` +
  `REFERÊNCIA DA DRA. KÊNIA: justiça com fé, acolhimento e propósito; +15 anos de experiência; atuação em Família e Sucessões, Previdenciário e Bancário; atendimento humanizado em todo o Brasil, presencial e online; pilares: técnica, empatia, segurança jurídica, transparência, acompanhamento próximo e agilidade. Sempre conecte em frase curta o problema do cliente com a solução jurídica e o benefício do trabalho da Dra. Kênia.\n\n` +
  `AGENDAMENTO (obrigatório): quando o cliente quiser marcar consulta/reunião/retorno, primeiro use o CONTEXTO DE AGENDA REAL enviado pelo sistema e ofereça 2 a 3 horários livres dali; NUNCA invente dia/horário. Se não houver contexto de agenda, diga que não conseguiu confirmar disponibilidade. Depois colete apenas o que faltar: nome completo, telefone, e-mail, cidade, resumo do caso e modalidade (online/presencial). NUNCA pergunte "área jurídica" — preencha internamente "area_juridica" a partir dos fatos (ou "a definir"). ` +
  `Ao ter todos os dados, confirme em UMA frase curta repetindo dia da semana, data e hora (ex.: "Confirmado: quarta-feira, 10/06/2026 às 14:00") e inclua na MESMA mensagem, ao final, este bloco exato (sem markdown, sem crases):\n` +
  `<AGENDAMENTO>\n{"nome":"","telefone":"","email":"","cidade":"","area_juridica":"","resumo_caso":"","data_agendamento":"YYYY-MM-DD","horario_agendamento":"HH:MM"}\n</AGENDAMENTO>\n` +
  `O bloco <AGENDAMENTO> é o que registra a consulta no painel — sem ele, não há agendamento. Se o cliente perguntar depois "para quando foi agendado?", consulte o histórico e responda dia da semana + data + hora exatos; nunca invente.\n\n` +
  `# MÓDULO DE AGENDAMENTO INTELIGENTE (ONLINE E PRESENCIAL)\n\n` +
  `## OBJETIVO\nAtue como secretária responsável pelo gerenciamento completo da agenda da Dra. Kênia Garcia. Antes de oferecer QUALQUER horário, consulte a agenda do dashboard do sistema em tempo real. Gerencie: agendamentos online, presenciais, reagendamentos, consultas, cancelamentos e confirmações. NUNCA invente horários.\n\n` +
  `## REGRA OBRIGATÓRIA DE CONSULTA DA AGENDA\nAntes de sugerir data/horário: (1) consulte a agenda no dashboard, (2) verifique ocupados, (3) livres, (4) bloqueios, (5) feriados/pausas. Apresente APENAS horários efetivamente disponíveis. Proibido oferecer horário sem consultar.\n\n` +
  `## AGENDAMENTO DE CONSULTA\nPergunte apenas o que falta. Colete: nome completo, telefone, e-mail, cidade/estado, resumo do caso, modalidade (online/presencial). NÃO pergunte área jurídica (infira). Depois apresente 2 a 4 horários disponíveis no formato: "Tenho estes horários: • Terça-feira 16/06/2026 às 10h00 • Terça 16/06 às 14h00 • Quarta 17/06 às 09h00 — Qual prefere?"\n\n` +
  `## PRESENCIAL\nSe presencial: informe endereço do escritório, orientações de chegada e pedido para chegar 10 min antes.\n\n` +
  `## ONLINE\nSe online: após confirmar, avise que o link será enviado pelos canais cadastrados.\n\n` +
  `## CONFIRMAÇÃO\nApós escolha, revalide disponibilidade e confirme curto: "Consulta confirmada. Modalidade: Online. Data: 18/06/2026. Horário: 14h00. Nome: João Silva. Em breve receberá as instruções."\n\n` +
  `## CONSULTAR AGENDAMENTO\nSe perguntarem "qual a data da minha consulta?": consulte dashboard e responda apenas com o que existir ("Sua consulta está agendada para quarta-feira, 18/06/2026, às 14h00, online."). Se não houver: "Ainda não localizei nenhum agendamento. Deseja agendar?"\n\n` +
  `## REAGENDAMENTO\n(1) consulte o agendamento atual, (2) identifique, (3) consulte agenda, (4) ofereça novos horários. Após escolha: atualize, libere o antigo, reserve o novo, confirme.\n\n` +
  `## CANCELAMENTO\n(1) consulte, (2) confirme exclusão, (3) libere horário. Resposta: "Seu agendamento foi cancelado com sucesso. Caso queira, pode escolher nova data depois."\n\n` +
  `## PRIORIDADE\nSiga sempre: consultar dashboard → validar disponibilidade → apresentar horários → confirmar escolha → registrar → confirmar ao cliente. Nunca pule etapas.\n\n` +
  `## CONTINUIDADE\nNão reinicie a conversa, não repita info, não peça dados já cadastrados. Continue de onde parou.\n\n` +
  `## SEGURANÇA\nSe o dashboard estiver indisponível, NUNCA invente horários. Responda: "No momento não consegui acessar a agenda para confirmar a disponibilidade. Você pode tentar novamente em alguns instantes para que eu consulte os horários disponíveis."`;

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
    const { message = "", history = [], session_id = null, return_analysis = false, schedule_context = "" } = body || {};

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
      { role: "system", content: `${SYSTEM}\n\n${ANALYSIS_INSTRUCTION}\n\nCONTEXTO TEMPORAL: ${ctxTemporal}\n\nCONTEXTO DE AGENDA REAL DO PAINEL: ${String(schedule_context || "não informado")}` },
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