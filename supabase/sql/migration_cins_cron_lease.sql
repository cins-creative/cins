-- =====================================================================
-- migration_cins_cron_lease.sql
-- P0-b PLAN_analytics_scale: lease chống cron chạy chồng + log lần chạy.
-- Không dùng pg_advisory_lock (session-level, không an toàn qua pooler
-- transaction mode). Lease = 1 row, giành bằng INSERT … ON CONFLICT WHERE.
-- An toàn chạy lại nhiều lần (idempotent).
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.cins_cron_lease (
  ten           text PRIMARY KEY,
  chay_luc      timestamptz NOT NULL DEFAULT now(),
  het_han_luc   timestamptz NOT NULL DEFAULT now(),
  nguon         text
);

ALTER TABLE public.cins_cron_lease ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.cins_cron_lease FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.cins_cron_log (
  id         bigserial PRIMARY KEY,
  ten        text NOT NULL,
  ok         boolean NOT NULL,
  chi_tiet   jsonb,
  tao_luc    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cins_cron_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.cins_cron_log FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS cins_cron_log_ten_idx
  ON public.cins_cron_log (ten, tao_luc DESC);

CREATE OR REPLACE FUNCTION public.cins_cron_giu_lease(
  p_ten text,
  p_giay integer DEFAULT 600,
  p_nguon text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean;
BEGIN
  INSERT INTO public.cins_cron_lease (ten, chay_luc, het_han_luc, nguon)
  VALUES (p_ten, now(), now() + make_interval(secs => p_giay), p_nguon)
  ON CONFLICT (ten) DO UPDATE
    SET chay_luc    = now(),
        het_han_luc = now() + make_interval(secs => p_giay),
        nguon       = p_nguon
    WHERE public.cins_cron_lease.het_han_luc < now()
  RETURNING true INTO v_ok;
  RETURN coalesce(v_ok, false);
END $$;

CREATE OR REPLACE FUNCTION public.cins_cron_tra_lease(p_ten text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.cins_cron_lease
     SET het_han_luc = now() - interval '1 second'
   WHERE ten = p_ten;
$$;

REVOKE ALL ON FUNCTION public.cins_cron_giu_lease(text, integer, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cins_cron_tra_lease(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cins_cron_giu_lease(text, integer, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.cins_cron_tra_lease(text)
  TO service_role;
