import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * MOCK publisher: marca posts agendados cuja data já chegou como "published".
 * Quando o usuário tiver credenciais do Meta, basta substituir a parte
 * marcada com TODO pela chamada real à Graph API.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const now = new Date().toISOString();
    const { data: due, error } = await supabase
      .from("scheduled_posts")
      .select("id, platforms")
      .eq("status", "scheduled")
      .lte("scheduled_for", now)
      .limit(50);

    if (error) throw error;

    let processed = 0;
    for (const post of due ?? []) {
      // TODO: Substituir por chamada real ao Meta Graph API quando o usuário conectar.
      // Hoje apenas marcamos como publicado (mock).
      const { error: updErr } = await supabase
        .from("scheduled_posts")
        .update({ status: "published", published_at: new Date().toISOString() })
        .eq("id", post.id);
      if (!updErr) processed++;
    }

    return new Response(
      JSON.stringify({ processed, total: due?.length ?? 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("publish-scheduled-posts error:", error);
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
