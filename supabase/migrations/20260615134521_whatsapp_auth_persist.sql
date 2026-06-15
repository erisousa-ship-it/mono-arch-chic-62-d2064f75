-- Persistência da sessão Baileys do WhatsApp (sobrevive a reinícios do servidor).
CREATE TABLE IF NOT EXISTS public.whatsapp_auth (
  filename text PRIMARY KEY,
  data text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.whatsapp_auth TO service_role;

ALTER TABLE public.whatsapp_auth ENABLE ROW LEVEL SECURITY;

-- Apenas o backend (service_role) acessa; sem policies para anon/authenticated.
CREATE POLICY "service role full access" ON public.whatsapp_auth FOR ALL TO service_role USING (true) WITH CHECK (true);
