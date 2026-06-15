const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const toDataUrl = (b64?: string | null) => {
  if (!b64) return null;
  return b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`;
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

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500,
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

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [{ role: "user", content: userContent }],
        modalities: ["image", "text"],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      const status = resp.status === 429 || resp.status === 402 ? resp.status : 500;
      return new Response(JSON.stringify({ error: text, upstream_status: resp.status }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const imageUrl: string | undefined =
      data?.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
      data?.choices?.[0]?.message?.image_url?.url ||
      data?.data?.[0]?.url;
    const rawB64: string | undefined = data?.data?.[0]?.b64_json;

    const dataUrl = imageUrl
      ? imageUrl
      : rawB64
        ? (rawB64.startsWith("data:") ? rawB64 : `data:image/png;base64,${rawB64}`)
        : "";

    if (!dataUrl) {
      return new Response(JSON.stringify({ error: "Sem imagem gerada", raw: data }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const b64Only = dataUrl.startsWith("data:") ? dataUrl.split(",")[1] : dataUrl;
    return new Response(JSON.stringify({ image_data_url: dataUrl, b64_json: b64Only }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});