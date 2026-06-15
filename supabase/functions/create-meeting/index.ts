import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// Cria um evento no Google Calendar do dono da conexão (calendário "primary")
// com Google Meet anexado e devolve { meeting_link, event_id, html_link }.
//
// Body esperado:
//   {
//     title: string,
//     starts_at: ISO string,
//     duration_min?: number (default 60),
//     description?: string,
//     attendees?: { email: string; name?: string }[]
//   }

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_calendar/calendar/v3';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GCAL_KEY = Deno.env.get('GOOGLE_CALENDAR_API_KEY');
    if (!LOVABLE_API_KEY || !GCAL_KEY) {
      return new Response(
        JSON.stringify({ error: 'Google Calendar não está conectado neste projeto.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const title = String(body.title || 'Consulta jurídica').slice(0, 200);
    const startIso = body.starts_at ? new Date(body.starts_at) : new Date();
    if (Number.isNaN(startIso.getTime())) {
      return new Response(JSON.stringify({ error: 'starts_at inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const durationMin = Number(body.duration_min) > 0 ? Number(body.duration_min) : 60;
    const endIso = new Date(startIso.getTime() + durationMin * 60_000);
    const attendees = Array.isArray(body.attendees)
      ? body.attendees
          .filter((a: any) => a && typeof a.email === 'string' && a.email.includes('@'))
          .map((a: any) => ({ email: a.email, displayName: a.name }))
      : [];

    const event = {
      summary: title,
      description: String(body.description || '').slice(0, 4000),
      start: { dateTime: startIso.toISOString() },
      end: { dateTime: endIso.toISOString() },
      attendees,
      conferenceData: {
        createRequest: {
          requestId: `kenia-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    };

    const url = `${GATEWAY_URL}/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all`;
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': GCAL_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });
    const text = await r.text();
    if (!r.ok) {
      console.error('google calendar error', r.status, text);
      return new Response(
        JSON.stringify({ error: 'Falha ao criar evento no Google Calendar', status: r.status, detail: text.slice(0, 500) }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const data = JSON.parse(text);
    const meetLink =
      data.hangoutLink ||
      data?.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri ||
      null;

    return new Response(
      JSON.stringify({
        meeting_link: meetLink,
        event_id: data.id,
        html_link: data.htmlLink,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('create-meeting unexpected', e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});