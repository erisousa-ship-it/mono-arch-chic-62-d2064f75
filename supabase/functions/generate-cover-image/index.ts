const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const toDataUrl = (b64?: string | null) => {
  if (!b64) return null;
  return b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`;
};

const escapeSvg = (value: string) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const makeLocalCreativeImage = (prompt: string) => {
  const title = escapeSvg(prompt).slice(0, 86);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7efe8"/><stop offset="0.52" stop-color="#d8b980"/><stop offset="1" stop-color="#1d1714"/></linearGradient><radialGradient id="light" cx="32%" cy="24%" r="58%"><stop offset="0" stop-color="#fffaf3" stop-opacity="0.95"/><stop offset="1" stop-color="#fffaf3" stop-opacity="0"/></radialGradient></defs><rect width="1024" height="1024" fill="url(#bg)"/><rect width="1024" height="1024" fill="url(#light)"/><path d="M148 228h728v568H148z" fill="none" stroke="#fff7e8" stroke-width="5" opacity="0.72"/><path d="M512 286l88 306H424l88-306z" fill="#2b211b" opacity="0.82"/><path d="M350 626h324M392 690h240" stroke="#fff1d0" stroke-width="18" stroke-linecap="round" opacity="0.86"/><circle cx="512" cy="246" r="35" fill="#fff1d0"/><text x="512" y="820" text-anchor="middle" font-family="Georgia, serif" font-size="42" fill="#fff7e8">Dra. Kênia Garcia</text><text x="512" y="874" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#fff7e8" opacity="0.9">${title}</text></svg>`;
  const b64 = btoa(unescape(encodeURIComponent(svg)));
  return { dataUrl: `data:image/svg+xml;base64,${b64}`, b64 };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, style, reference_image_base64, logo_base64 } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "Prompt obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const styleText = typeof style === "string" && style.trim() ? style.trim() : "post para redes sociais";
    // Tenta extrair um TÍTULO explícito do prompt (após "Título:" ou primeira linha curta)
    let extractedTitle = "";
    const tMatch = prompt.match(/t[íi]tulo\s*[:\-]\s*([^\n]+)/i);
    if (tMatch) extractedTitle = tMatch[1].trim().replace(/["']/g, "").slice(0, 90);
    let extractedSubtitle = "";
    const sMatch = prompt.match(/subt[íi]tulo\s*[:\-]\s*([^\n]+)/i);
    if (sMatch) extractedSubtitle = sMatch[1].trim().replace(/["']/g, "").slice(0, 140);

    const userText =
      `BRIEFING PARA IMAGEM EDITORIAL — PESQUISE REFERÊNCIAS VISUAIS REAIS antes de compor (campanhas oficiais, fotojornalismo, materiais institucionais brasileiros) e use-as APENAS como inspiração.\n\n` +
      `TEMA / CENA EXATA: ${prompt}\n` +
      `Represente LITERALMENTE o assunto pedido, sem transformar em conceito abstrato. ` +
      `Se o tema for sensível (violência, demissão, acidente, dívida, divórcio, herança, INSS), trate de forma ética, humanizada e educativa, com personagens e ambientes brasileiros realistas.\n\n` +
      `FORMATO: ${styleText} para a Dra. Kênia Garcia (advocacia).\n` +
      `ESTILO: fotografia editorial fotorrealista, iluminação profissional, composição organizada, profundidade visual, texturas realistas, paleta nude/dourada sutil com estética jurídica elegante.\n` +
      `PERSONAGENS: no máximo 1 ou 2, em plano médio, rostos naturais, proporcionais, simétricos e nítidos; expressões coerentes com o tema; mãos com anatomia correta (cinco dedos) ou fora do quadro.\n` +
      (extractedTitle
        ? `TÍTULO NA IMAGEM: inserir o texto "${extractedTitle}" com tipografia serifada elegante, grande, legível e harmonizada à composição (sem erros de ortografia).\n`
        : `SEM texto, letras ou logotipos gerados pela IA.\n`) +
      (extractedSubtitle
        ? `SUBTÍTULO NA IMAGEM: abaixo do título, em fonte menor e clara, inserir: "${extractedSubtitle}".\n`
        : "") +
      (logo_base64 ? `Considere o logotipo enviado como referência de marca.\n` : "") +
      (reference_image_base64 ? `Use a imagem de referência enviada como inspiração visual.\n` : "");

    const userContent: any[] = [{ type: "text", text: userText }];
    const refUrl = toDataUrl(reference_image_base64);
    const logoUrl = toDataUrl(logo_base64);
    if (refUrl) userContent.push({ type: "image_url", image_url: { url: refUrl } });
    if (logoUrl) userContent.push({ type: "image_url", image_url: { url: logoUrl } });

    const errors: string[] = [];

    // Prompt com diretrizes fortes de fidelidade facial — evita rostos disformes.
    const faceSafePrompt =
      `${userText}\n\n` +
      `REQUISITOS OBRIGATÓRIOS DE QUALIDADE: rostos humanos perfeitamente formados, ` +
      `anatomia facial correta (dois olhos simétricos, nariz e boca bem definidos), ` +
      `traços faciais nítidos e em foco, expressão natural, pele realista com textura, ` +
      `mãos com cinco dedos corretos, fotorrealismo profissional, alta resolução. ` +
      `EVITAR: rostos disformes, olhos tortos, faces borradas, traços derretidos, anatomia distorcida, mãos deformadas, aparência de IA.`;

    const negativePrompt =
      "deformed face, distorted face, blurry face, melted face, extra eyes, asymmetrical eyes, bad anatomy, " +
      "deformed hands, extra fingers, missing fingers, duplicate people, low quality, text, watermark, logo";

    // 1) PRIMÁRIO: Gemini direto, quando houver chave própria. Melhor fidelidade sem consumir créditos do gateway.
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (geminiKey) {
      for (const model of ["gemini-2.5-flash-image-preview", "gemini-2.0-flash-preview-image-generation"]) {
        try {
          const parts: any[] = [{ text: `${faceSafePrompt}\n\nPrompt negativo: ${negativePrompt}` }];
          if (refUrl) parts.push({ inline_data: { mime_type: "image/png", data: refUrl.split(",")[1] } });
          if (logoUrl) parts.push({ inline_data: { mime_type: "image/png", data: logoUrl.split(",")[1] } });
          const gResp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ role: "user", parts }],
                generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
              }),
            },
          );
          const raw = await gResp.text();
          if (gResp.ok) {
            const data = JSON.parse(raw || "{}");
            const partsOut = data?.candidates?.[0]?.content?.parts || [];
            const imgPart = partsOut.find((p: any) => p?.inlineData?.data || p?.inline_data?.data);
            const b64 = imgPart?.inlineData?.data || imgPart?.inline_data?.data;
            if (b64) {
              const dataUrl = `data:image/png;base64,${b64}`;
              return new Response(
                JSON.stringify({ image_data_url: dataUrl, b64_json: b64, provider: "gemini", model }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } },
              );
            }
            errors.push(`${model}: empty response`);
          } else {
            errors.push(`${model}_${gResp.status}: ${raw.slice(0, 200)}`);
          }
        } catch (e) {
          errors.push(`${model}: ${String(e)}`);
        }
      }
    }

    // 2) FALLBACK GRATUITO: Pollinations (flux) com prompt mais restritivo.
    try {
      const seed = Math.floor(Math.random() * 1_000_000);
      const polUrl =
        `https://image.pollinations.ai/prompt/${encodeURIComponent(`${faceSafePrompt}\n\nNegative prompt: ${negativePrompt}`)}` +
        `?width=1024&height=1024&nologo=true&enhance=true&model=flux&seed=${seed}` +
        `&negative=${encodeURIComponent(negativePrompt)}&negative_prompt=${encodeURIComponent(negativePrompt)}`;
      const polResp = await fetch(polUrl);
      if (polResp.ok) {
        const buf = new Uint8Array(await polResp.arrayBuffer());
        let bin = "";
        for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
        const b64 = btoa(bin);
        const dataUrl = `data:image/png;base64,${b64}`;
        return new Response(
          JSON.stringify({ image_data_url: dataUrl, b64_json: b64, provider: "pollinations", model: "flux" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      errors.push(`pollinations_${polResp.status}`);
    } catch (e) {
      errors.push(`pollinations: ${String(e)}`);
    }

    // 4) ÚLTIMO RECURSO: SVG local.
    const localImage = makeLocalCreativeImage(prompt);
    return new Response(
      JSON.stringify({ image_data_url: localImage.dataUrl, b64_json: localImage.b64, provider: "local-svg", errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err), marker: "v2-gemini" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});