const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const EMERGENT_KEY = Deno.env.get('EMERGENT_API_KEY');
const EMERGENT_URL = Deno.env.get('EMERGENT_BASE_URL') || 'https://api.emergent.sh/v1';
const OLLAMA_URL = Deno.env.get('OLLAMA_BASE_URL');
const OLLAMA_MODEL = Deno.env.get('OLLAMA_MODEL') || 'llama3.1';
const LOVABLE_KEY = Deno.env.get('LOVABLE_API_KEY');

function inspectPublicUrl(raw?: string | null) {
  if (!raw) return { configured: false, is_public: false, reason: 'OLLAMA_BASE_URL não configurado' };
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    const isHttp = parsed.protocol === 'http:' || parsed.protocol === 'https:';
    const parts = host.split('.').map((part) => Number(part));
    const isIpv4 = parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255);
    const isLocal = ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(host) || host.endsWith('.local');
    const isPrivateIpv4 = isIpv4 && (
      parts[0] === 10 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127)
    );
    const isPublic = isHttp && !isLocal && !isPrivateIpv4;
    return {
      configured: true,
      url: parsed.toString().replace(/\/$/, ''),
      host,
      protocol: parsed.protocol.replace(':', ''),
      is_public: isPublic,
      reason: isPublic ? 'URL pública' : (!isHttp ? 'Use http ou https' : 'URL local/privada não acessível pela edge function'),
    };
  } catch {
    return { configured: true, is_public: false, reason: 'OLLAMA_BASE_URL inválida' };
  }
}

async function pingOllamaBaseUrl() {
  const inspection = inspectPublicUrl(OLLAMA_URL);
  if (!inspection.configured || !inspection.is_public) throw new Error(`ollama_url_not_public: ${inspection.reason}`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const startedAt = Date.now();
  try {
    const r = await fetch(`${(inspection as any).url}/api/tags`, { method: 'GET', signal: controller.signal });
    const text = await r.text().catch(() => '');
    if (!r.ok) throw new Error(`ollama_ping_${r.status}: ${text.slice(0, 240)}`);
    return { ...inspection, ok: true, ping_ms: Date.now() - startedAt };
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('ollama_ping_timeout');
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

async function tryEmergentChat(messages: any[], model?: string) {
  if (!EMERGENT_KEY) throw new Error('emergent_not_configured');
  const r = await fetch(`${EMERGENT_URL.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${EMERGENT_KEY}` },
    body: JSON.stringify({ model: model || 'emergent-default', messages }),
  });
  if (!r.ok) throw new Error(`emergent_chat_${r.status}: ${await r.text()}`);
  const j = await r.json();
  return { provider: 'emergent', text: j.choices?.[0]?.message?.content ?? '' };
}

async function tryOllamaChat(messages: any[], model?: string) {
  if (!OLLAMA_URL) throw new Error('ollama_not_configured');
  const r = await fetch(`${OLLAMA_URL.replace(/\/$/, '')}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: model || OLLAMA_MODEL, messages, stream: false }),
  });
  if (!r.ok) throw new Error(`ollama_chat_${r.status}: ${await r.text()}`);
  const j = await r.json();
  return { provider: 'ollama', text: j.message?.content ?? '' };
}

async function tryLovableChat(messages: any[]) {
  if (!LOVABLE_KEY) throw new Error('lovable_not_configured');
  const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': LOVABLE_KEY, 'X-Lovable-AIG-SDK': 'vercel-ai-sdk' },
    body: JSON.stringify({ model: 'google/gemini-3-flash-preview', messages }),
  });
  if (!r.ok) throw new Error(`lovable_chat_${r.status}: ${await r.text()}`);
  const j = await r.json();
  return { provider: 'lovable', text: j.choices?.[0]?.message?.content ?? '' };
}

async function tryEmergentImage(prompt: string) {
  if (!EMERGENT_KEY) throw new Error('emergent_not_configured');
  const r = await fetch(`${EMERGENT_URL.replace(/\/$/, '')}/images/generations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${EMERGENT_KEY}` },
    body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1024x1024', n: 1 }),
  });
  if (!r.ok) throw new Error(`emergent_image_${r.status}: ${await r.text()}`);
  const j = await r.json();
  const item = j.data?.[0] ?? {};
  const rawB64 = item.b64_json ?? j.image_base64 ?? j.b64_json;
  const image = rawB64 ? `data:image/png;base64,${String(rawB64).replace(/^data:image\/[^;]+;base64,/, '')}` : (item.url ?? j.image_url ?? null);
  if (!image) throw new Error('emergent_image_empty_response');
  return { provider: 'emergent', image };
}

async function tryLovableImage(prompt: string) {
  if (!LOVABLE_KEY) throw new Error('lovable_not_configured');
  const r = await fetch('https://ai.gateway.lovable.dev/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': LOVABLE_KEY, 'X-Lovable-AIG-SDK': 'vercel-ai-sdk' },
    body: JSON.stringify({
      model: 'openai/gpt-image-2',
      prompt,
      quality: 'low',
      size: '1024x1024',
      n: 1,
      stream: false,
    }),
  });
  if (!r.ok) throw new Error(`lovable_image_${r.status}: ${await r.text()}`);
  const j = await r.json();
  const rawB64 = j.data?.[0]?.b64_json ?? j.image_base64 ?? j.b64_json;
  const image = rawB64 ? `data:image/png;base64,${String(rawB64).replace(/^data:image\/[^;]+;base64,/, '')}` : (j.data?.[0]?.url ?? j.image_url ?? null);
  if (!image) throw new Error('lovable_image_empty_response');
  return { provider: 'lovable', image };
}

async function runChain(fns: Array<() => Promise<any>>) {
  const errors: string[] = [];
  for (const fn of fns) {
    try { return await fn(); } catch (e) { errors.push((e as Error).message); }
  }
  throw new Error(errors.join(' | ') || 'no_provider_available');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { mode = 'chat', prompt = '', messages, model, action, provider } = body;

    if (action === 'status') {
      const ollamaUrl = inspectPublicUrl(OLLAMA_URL);
      return Response.json({
        emergent: !!EMERGENT_KEY,
        ollama: !!OLLAMA_URL,
        lovable: !!LOVABLE_KEY,
        emergent_url: EMERGENT_URL,
        ollama_url: OLLAMA_URL || null,
        ollama_url_public: ollamaUrl.is_public,
        ollama_url_check: ollamaUrl,
        ollama_model: OLLAMA_MODEL,
      }, { headers: corsHeaders });
    }

    if (action === 'test') {
      const target = body.provider as string;
      const out: any = { provider: target, ok: false };
      try {
        if (target === 'emergent') await tryEmergentChat([{ role: 'user', content: 'ping' }], model);
        else if (target === 'ollama') {
          out.url_check = await pingOllamaBaseUrl();
          await tryOllamaChat([{ role: 'user', content: 'ping' }], model);
        }
        else if (target === 'lovable') await tryLovableChat([{ role: 'user', content: 'ping' }]);
        out.ok = true;
      } catch (e) { out.error = (e as Error).message; }
      return Response.json(out, { headers: corsHeaders });
    }

    if (mode === 'image') {
      const result = await runChain([
        () => tryLovableImage(prompt),
        () => tryEmergentImage(prompt),
      ]);
      return Response.json(result, { headers: corsHeaders });
    }

    const msgs = messages ?? [{ role: 'user', content: prompt }];
    const result = provider === 'ollama'
      ? await tryOllamaChat(msgs, model)
      : await runChain([
        () => tryEmergentChat(msgs, model),
        () => tryOllamaChat(msgs, model),
        () => tryLovableChat(msgs),
      ]);
    return Response.json(result, { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});