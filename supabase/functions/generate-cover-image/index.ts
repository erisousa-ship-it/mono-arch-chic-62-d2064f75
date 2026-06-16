const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const toDataUrl = (b64?: string | null) => {
  if (!b64) return null;
  return b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`;
};

const parseImageResponse = (data: any) => {
  const imageUrl: string | undefined =
    data?.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
    data?.choices?.[0]?.message?.image_url?.url ||
    data?.data?.[0]?.url;
  const rawB64: string | undefined = data?.data?.[0]?.b64_json || data?.image_base64 || data?.b64_json;
  return imageUrl || (rawB64 ? (rawB64.startsWith("data:") ? rawB64 : `data:image/png;base64,${rawB64}`) : "");
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
    const { prompt, reference_image_base64, logo_base64 } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "Prompt obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userText =
      `Banner/post profissional para advocacia (Dra. Kênia Garcia). ` +
      `Estilo cinematográfico, paleta nude/dourada, sem texto e sem letras. ` +
      `Tema: ${prompt}.` +
      (logo_base64 ? " Considere o logotipo enviado." : "") +
      (reference_image_base64 ? " Use a imagem de referência como inspiração visual." : "");

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

    // 1) PRIMÁRIO: Lovable AI Gateway (gpt-image-2) — melhor qualidade facial.
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (lovableKey) {
      try {
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
          method: "POST",
          headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "openai/gpt-image-2",
            prompt: faceSafePrompt,
            quality: "medium",
            size: "1024x1024",
            n: 1,
          }),
        });
        const raw = await resp.text();
        if (resp.ok) {
          const data = JSON.parse(raw || "{}");
          const dataUrl = parseImageResponse(data);
          if (dataUrl) {
            const b64Only = dataUrl.startsWith("data:") ? dataUrl.split(",")[1] : dataUrl;
            return new Response(JSON.stringify({ image_data_url: dataUrl, b64_json: b64Only, provider: "lovable", model: "openai/gpt-image-2" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          errors.push("lovable: empty response");
        } else {
          errors.push(`lovable_${resp.status}: ${raw.slice(0, 200)}`);
        }
      } catch (e) {
        errors.push(`lovable: ${String(e)}`);
      }
    }

    // 2) FALLBACK: Gemini direto (rostos também bons).
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (geminiKey) {
      try {
        const model = "gemini-2.5-flash-image";
        const parts: any[] = [{ text: faceSafePrompt }];
        if (refUrl) parts.push({ inline_data: { mime_type: "image/png", data: refUrl.split(",")[1] } });
        if (logoUrl) parts.push({ inline_data: { mime_type: "image/png", data: logoUrl.split(",")[1] } });
        const gResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts }],
              generationConfig: { responseModalities: ["IMAGE"] },
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
          errors.push("gemini: empty response");
        } else {
          errors.push(`gemini_${gResp.status}: ${raw.slice(0, 200)}`);
        }
      } catch (e) {
        errors.push(`gemini: ${String(e)}`);
      }
    }

    // 3) FALLBACK GRATUITO: Pollinations (flux) com prompt face-safe.
    try {
      const seed = Math.floor(Math.random() * 1_000_000);
      const polUrl =
        `https://image.pollinations.ai/prompt/${encodeURIComponent(faceSafePrompt)}` +
        `?width=1024&height=1024&nologo=true&enhance=true&model=flux&seed=${seed}`;
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

    // Código legado preservado abaixo (inalcançável).
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (lovableKey) {
      try {
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
          method: "POST",
          headers: { "Lovable-API-Key": lovableKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "openai/gpt-image-2",
            prompt: userText,
            quality: "low",
            size: "1024x1024",
            n: 1,
            stream: false,
          }),
        });
        const raw = await resp.text();
        if (resp.ok) {
          const data = JSON.parse(raw || "{}");
          const dataUrl = parseImageResponse(data);
          if (dataUrl) {
            const b64Only = dataUrl.startsWith("data:") ? dataUrl.split(",")[1] : dataUrl;
            return new Response(JSON.stringify({ image_data_url: dataUrl, b64_json: b64Only, provider: "lovable", model: "openai/gpt-image-2" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          errors.push("lovable: empty response");
        } else {
          errors.push(`lovable_${resp.status}: ${raw.slice(0, 300)}`);
        }
      } catch (e) {
        errors.push(`lovable: ${String(e)}`);
      }
    } else {
      errors.push("Missing LOVABLE_API_KEY");
    }

    // 3) FALLBACK: Emergent
    const emergentKey = Deno.env.get("EMERGENT_API_KEY");
    const emergentUrl = (Deno.env.get("EMERGENT_BASE_URL") || "https://api.emergent.sh/v1").replace(/\/+$/, "");
    if (emergentKey) {
      try {
        const emergentResp = await fetch(`${emergentUrl}/images/generations`, {
          method: "POST",
          headers: { Authorization: `Bearer ${emergentKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "gpt-image-1", prompt: userText, size: "1024x1024", n: 1 }),
        });
        const raw = await emergentResp.text();
        if (emergentResp.ok) {
          const data = JSON.parse(raw || "{}");
          const dataUrl = parseImageResponse(data);
          if (dataUrl) {
            const b64Only = dataUrl.startsWith("data:") ? dataUrl.split(",")[1] : dataUrl;
            return new Response(JSON.stringify({ image_data_url: dataUrl, b64_json: b64Only, provider: "emergent" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          errors.push("emergent: empty response");
        } else {
          errors.push(`emergent_${emergentResp.status}: ${raw.slice(0, 300)}`);
        }
      } catch (e) {
        errors.push(`emergent: ${String(e)}`);
      }
    }

    // 4) FALLBACK: Google Gemini (Nano Banana) direct API
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (geminiKey) {
      try {
        const model = "gemini-2.5-flash-image";
        const parts: any[] = [{ text: userText }];
        if (refUrl) {
          const b64 = refUrl.split(",")[1];
          parts.push({ inline_data: { mime_type: "image/png", data: b64 } });
        }
        if (logoUrl) {
          const b64 = logoUrl.split(",")[1];
          parts.push({ inline_data: { mime_type: "image/png", data: b64 } });
        }
        const gResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts }],
              generationConfig: { responseModalities: ["IMAGE"] },
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
          errors.push("gemini: empty response");
        } else {
          errors.push(`gemini_${gResp.status}: ${raw.slice(0, 300)}`);
        }
      } catch (e) {
        errors.push(`gemini: ${String(e)}`);
      }
    }

    return new Response(JSON.stringify({ error: errors.join(" | ") || "Sem provedor de imagem disponível" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err), marker: "v2-gemini" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});