ALTER TABLE public.bazi_readings
ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS content_policy_retry_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS first_attempt_at timestamptz NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS alert_status text;

CREATE TABLE public.system_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reading_id uuid REFERENCES public.bazi_readings(id) ON DELETE SET NULL,
  alert_type text NOT NULL,          -- 'api_key_invalid' / 'data_missing' / 'content_policy_exceeded'
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX system_alerts_unresolved_idx ON public.system_alerts(created_at) WHERE resolved_at IS NULL;
