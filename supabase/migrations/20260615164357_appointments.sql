-- Tabela de agendamentos usada pelo painel Agenda e pelo ChatIA / WhatsApp.
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  client_name text NOT NULL DEFAULT 'Cliente',
  phone text,
  email text,
  legal_area text,
  case_summary text,
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  source text DEFAULT 'panel',
  status text NOT NULL DEFAULT 'scheduled',
  meeting_link text,
  raw_payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO anon;
GRANT ALL ON public.appointments TO service_role;

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointments_select_all" ON public.appointments;
CREATE POLICY "appointments_select_all" ON public.appointments FOR SELECT USING (true);

DROP POLICY IF EXISTS "appointments_insert_all" ON public.appointments;
CREATE POLICY "appointments_insert_all" ON public.appointments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "appointments_update_all" ON public.appointments;
CREATE POLICY "appointments_update_all" ON public.appointments FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "appointments_delete_all" ON public.appointments;
CREATE POLICY "appointments_delete_all" ON public.appointments FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS appointments_date_idx
  ON public.appointments (appointment_date, appointment_time);
