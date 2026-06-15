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

    // 1) PRIMÁRIO: Lovable AI Gateway (Nano Banana / gpt-image-2)
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (lovableKey) {
      try {
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
          method: "POST",
          headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
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
          if (resp.status === 429 || resp.status === 402) {
            return new Response(JSON.stringify({ error: errors.join(" | "), upstream_status: resp.status }), {
              status: resp.status,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      } catch (e) {
        errors.push(`lovable: ${String(e)}`);
      }
    } else {
      errors.push("Missing LOVABLE_API_KEY");
    }

    // 2) FALLBACK: Emergent
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

    // 3) FALLBACK: Google Gemini (Nano Banana) direct API
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
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});