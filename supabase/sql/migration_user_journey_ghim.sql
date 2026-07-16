-- Ghim cột mốc lên đầu Journey timeline (chỉ sort view Journey — không đổi visibility).
-- Chạy: node scripts/run-user-journey-ghim-migration.mjs
-- Idempotent.

CREATE TABLE IF NOT EXISTS public.user_journey_ghim (
  id_nguoi_dung  uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  milestone_key  text NOT NULL,
  ghim_luc       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id_nguoi_dung, milestone_key)
);

CREATE INDEX IF NOT EXISTS idx_user_journey_ghim_owner_luc
  ON public.user_journey_ghim (id_nguoi_dung, ghim_luc DESC);

COMMENT ON TABLE public.user_journey_ghim IS
  'Ghim cột mốc lên đầu Journey timeline của chủ trang — không đổi che_do_hien_thi; chỉ áp sort view Journey.';

ALTER TABLE public.user_journey_ghim ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_journey_ghim_select ON public.user_journey_ghim;
CREATE POLICY user_journey_ghim_select ON public.user_journey_ghim
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS user_journey_ghim_insert ON public.user_journey_ghim;
CREATE POLICY user_journey_ghim_insert ON public.user_journey_ghim
  FOR INSERT
  TO authenticated
  WITH CHECK (id_nguoi_dung = public.current_profile_id());

DROP POLICY IF EXISTS user_journey_ghim_update ON public.user_journey_ghim;
CREATE POLICY user_journey_ghim_update ON public.user_journey_ghim
  FOR UPDATE
  TO authenticated
  USING (id_nguoi_dung = public.current_profile_id())
  WITH CHECK (id_nguoi_dung = public.current_profile_id());

DROP POLICY IF EXISTS user_journey_ghim_delete ON public.user_journey_ghim;
CREATE POLICY user_journey_ghim_delete ON public.user_journey_ghim
  FOR DELETE
  TO authenticated
  USING (id_nguoi_dung = public.current_profile_id());
