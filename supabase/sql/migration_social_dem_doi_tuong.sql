-- =====================================================================
-- migration_social_dem_doi_tuong.sql
-- P3 PLAN_analytics_scale: counter denormalize cho feed (reach toàn cục).
-- Nguồn: SUM rollup ngày + COUNT social_da_xem. Rebuild mỗi lần cron
-- (bảng ngày nhỏ; idempotent). An toàn chạy lại.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.social_dem_doi_tuong (
  loai_doi_tuong loai_doi_tuong_social_enum NOT NULL,
  id_doi_tuong   uuid PRIMARY KEY,
  luot_tiep_can  bigint NOT NULL DEFAULT 0,
  nguoi_tiep_can bigint NOT NULL DEFAULT 0,
  cap_nhat_luc   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS social_dem_doi_tuong_loai_idx
  ON public.social_dem_doi_tuong (loai_doi_tuong);

ALTER TABLE public.social_dem_doi_tuong ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.social_dem_doi_tuong FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.social_dem_doi_tuong TO service_role;

COMMENT ON TABLE public.social_dem_doi_tuong IS
  'Counter feed: luot_tiep_can = SUM ngày; nguoi_tiep_can = COUNT social_da_xem (unique thật).';

CREATE OR REPLACE FUNCTION public.social_rollup_dem_doi_tuong()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_rows integer;
BEGIN
  WITH luot AS (
    SELECT
      loai_doi_tuong,
      id_doi_tuong,
      sum(luot_tiep_can)::bigint AS luot
    FROM public.social_thong_ke_doi_tuong_ngay
    GROUP BY loai_doi_tuong, id_doi_tuong
  ),
  nguoi AS (
    SELECT
      loai_doi_tuong,
      id_doi_tuong,
      count(*)::bigint AS nguoi
    FROM public.social_da_xem
    GROUP BY loai_doi_tuong, id_doi_tuong
  )
  INSERT INTO public.social_dem_doi_tuong AS t (
    loai_doi_tuong, id_doi_tuong, luot_tiep_can, nguoi_tiep_can
  )
  SELECT
    coalesce(luot.loai_doi_tuong, nguoi.loai_doi_tuong),
    coalesce(luot.id_doi_tuong, nguoi.id_doi_tuong),
    coalesce(luot.luot, 0),
    coalesce(nguoi.nguoi, 0)
  FROM luot
  FULL OUTER JOIN nguoi ON nguoi.id_doi_tuong = luot.id_doi_tuong
  ON CONFLICT (id_doi_tuong) DO UPDATE SET
    loai_doi_tuong = EXCLUDED.loai_doi_tuong,
    luot_tiep_can  = EXCLUDED.luot_tiep_can,
    nguoi_tiep_can = EXCLUDED.nguoi_tiep_can,
    cap_nhat_luc   = now();

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END $function$;

REVOKE ALL ON FUNCTION public.social_rollup_dem_doi_tuong() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.social_rollup_dem_doi_tuong() TO service_role;
