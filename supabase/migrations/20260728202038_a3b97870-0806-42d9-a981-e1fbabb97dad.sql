-- API integrations (service accounts)
CREATE TABLE public.api_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  scopes text[] NOT NULL DEFAULT '{}',
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.api_integrations TO authenticated;
GRANT ALL ON public.api_integrations TO service_role;

ALTER TABLE public.api_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view integrations" ON public.api_integrations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'administrateur'));
CREATE POLICY "Admins can create integrations" ON public.api_integrations
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'administrateur'));
CREATE POLICY "Admins can update integrations" ON public.api_integrations
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'administrateur'))
  WITH CHECK (public.has_role(auth.uid(), 'administrateur'));

CREATE TRIGGER update_api_integrations_updated_at
  BEFORE UPDATE ON public.api_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit log
CREATE TABLE public.api_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid REFERENCES public.api_integrations(id) ON DELETE SET NULL,
  integration_name text,
  resource text NOT NULL,
  record_id text,
  operation text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  result text NOT NULL,
  denial_reason text,
  request_id uuid NOT NULL,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.api_audit_log TO authenticated;
GRANT ALL ON public.api_audit_log TO service_role;

ALTER TABLE public.api_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit log" ON public.api_audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'administrateur'));

CREATE INDEX idx_api_audit_log_created_at ON public.api_audit_log (created_at DESC);
CREATE INDEX idx_api_audit_log_integration ON public.api_audit_log (integration_id);
CREATE INDEX idx_api_audit_log_resource ON public.api_audit_log (resource);

-- Idempotency keys (server only)
CREATE TABLE public.api_idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.api_integrations(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  endpoint text NOT NULL,
  request_hash text NOT NULL,
  status_code integer NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (integration_id, idempotency_key)
);

GRANT ALL ON public.api_idempotency_keys TO service_role;
ALTER TABLE public.api_idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Rate limit counters (server only)
CREATE TABLE public.api_rate_limits (
  bucket text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0
);

GRANT ALL ON public.api_rate_limits TO service_role;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;