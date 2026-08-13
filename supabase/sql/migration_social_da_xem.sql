-- =====================================================================
-- migration_social_da_xem.sql
-- P2 PLAN_analytics_scale: cặp viewer×đối tượng (unique vĩnh viễn) +
-- rollup tháng + backfill 90 ngày. Scrub nguoi_xem trên bảng này cùng mốc 90 ngày.
--
-- viewer_key = coalesce(nguoi_xem::text, phien_id)
--   • user đăng nhập: UUID ổn định (không phụ thuộc SU_KIEN_SALT)
--   • khách: phien_id đã hash ở app — KHÔNG rotate salt
-- An toàn chạy lại (IF NOT EXISTS / CREATE OR REPLACE).
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.social_da_xem (
  viewer_key     text NOT NULL,
  loai_doi_tuong loai_doi_tuong_social_enum NOT NULL,
  id_doi_tuong   uuid NOT NULL,
  nguoi_xem      uuid,
  so_lan         integer NOT NULL DEFAULT 1,
  so_lan_ngay    integer NOT NULL DEFAULT 0,
  ngay_cuoi      date,
  lan_dau        timestamptz NOT NULL DEFAULT now(),
  lan_cuoi       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (viewer_key, id_doi_tuong)
);

ALTER TABLE public.social_da_xem
  ADD COLUMN IF NOT EXISTS so_lan_ngay integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ngay_cuoi date;

CREATE INDEX IF NOT EXISTS social_da_xem_doi_tuong_idx
  ON public.social_da_xem (id_doi_tuong, loai_doi_tuong);
CREATE INDEX IF NOT EXISTS social_da_xem_nguoi_xem_idx
  ON public.social_da_xem (nguoi_xem, lan_cuoi DESC)
  WHERE nguoi_xem IS NOT NULL;

ALTER TABLE public.social_da_xem ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.social_da_xem FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.social_da_xem TO service_role;

COMMENT ON COLUMN public.social_da_xem.viewer_key IS
  'coalesce(nguoi_xem::text, phien_id). Khách: phien_id đã hash ở app (SU_KIEN_SALT — không rotate). Không hash lại trong SQL.';

CREATE TABLE IF NOT EXISTS public.social_thong_ke_doi_tuong_thang (
  loai_doi_tuong loai_doi_tuong_social_enum NOT NULL,
  id_doi_tuong   uuid NOT NULL,
  thang          date NOT NULL,
  luot_tiep_can       integer NOT NULL DEFAULT 0,
  luot_xem_noi_dung   integer NOT NULL DEFAULT 0,
  luot_mo_comment     integer NOT NULL DEFAULT 0,
  luot_click_profile  integer NOT NULL DEFAULT 0,
  luot_xem_media      integer NOT NULL DEFAULT 0,
  luot_click_lien_ket integer NOT NULL DEFAULT 0,
  lot_man_hinh        integer NOT NULL DEFAULT 0,
  luot_tuong_tac      integer NOT NULL DEFAULT 0,
  tiep_can_unique_ngay_tong integer NOT NULL DEFAULT 0,
  cap_nhat_luc timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (loai_doi_tuong, id_doi_tuong, thang)
);

ALTER TABLE public.social_thong_ke_doi_tuong_thang ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.social_thong_ke_doi_tuong_thang FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.social_thong_ke_doi_tuong_thang TO service_role;

COMMENT ON COLUMN public.social_thong_ke_doi_tuong_thang.tiep_can_unique_ngay_tong IS
  'Tổng unique theo ngày — KHÔNG phải unique của cả tháng.';

-- Idempotent: cùng ngày chạy lại = thay so_lan_ngay, không cộng dồn.
CREATE OR REPLACE FUNCTION public.social_rollup_da_xem(
  p_ngay date DEFAULT ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_tu  timestamptz := (p_ngay::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh');
  v_den timestamptz := ((p_ngay + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh');
  v_rows integer;
BEGIN
  WITH ev AS (
    SELECT
      coalesce(nguoi_xem::text, phien_id) AS viewer_key,
      coalesce(loai_boi_canh, loai_doi_tuong) AS s_loai,
      coalesce(id_boi_canh, id_doi_tuong) AS s_id,
      nguoi_xem,
      tao_luc
    FROM public.social_luot_xem
    WHERE tao_luc >= v_tu AND tao_luc < v_den
      AND loai_su_kien IN ('hien_thi', 'lot_man_hinh')
      AND coalesce(nguoi_xem::text, phien_id) IS NOT NULL
  ),
  agg AS (
    SELECT
      viewer_key,
      s_loai,
      s_id,
      (array_agg(nguoi_xem) FILTER (WHERE nguoi_xem IS NOT NULL))[1] AS nguoi_xem,
      count(*)::integer AS so_lan,
      min(tao_luc) AS lan_dau,
      max(tao_luc) AS lan_cuoi
    FROM ev
    GROUP BY viewer_key, s_loai, s_id
  )
  INSERT INTO public.social_da_xem AS t (
    viewer_key, loai_doi_tuong, id_doi_tuong, nguoi_xem,
    so_lan, so_lan_ngay, ngay_cuoi, lan_dau, lan_cuoi
  )
  SELECT
    viewer_key, s_loai, s_id, nguoi_xem,
    so_lan, so_lan, p_ngay, lan_dau, lan_cuoi
  FROM agg
  ON CONFLICT (viewer_key, id_doi_tuong) DO UPDATE SET
    so_lan = CASE
      WHEN t.ngay_cuoi IS NOT DISTINCT FROM p_ngay
        THEN t.so_lan - t.so_lan_ngay + EXCLUDED.so_lan
      WHEN t.ngay_cuoi IS NULL OR p_ngay > t.ngay_cuoi
        THEN t.so_lan + EXCLUDED.so_lan
      ELSE t.so_lan
    END,
    so_lan_ngay = CASE
      WHEN t.ngay_cuoi IS NULL OR p_ngay >= t.ngay_cuoi
        THEN EXCLUDED.so_lan
      ELSE t.so_lan_ngay
    END,
    ngay_cuoi = CASE
      WHEN t.ngay_cuoi IS NULL OR p_ngay >= t.ngay_cuoi
        THEN p_ngay
      ELSE t.ngay_cuoi
    END,
    lan_cuoi  = greatest(t.lan_cuoi, EXCLUDED.lan_cuoi),
    lan_dau   = least(t.lan_dau, EXCLUDED.lan_dau),
    nguoi_xem = coalesce(EXCLUDED.nguoi_xem, t.nguoi_xem);

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END $function$;

CREATE OR REPLACE FUNCTION public.social_backfill_da_xem(
  p_tu date,
  p_den date
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  d date;
  n integer := 0;
BEGIN
  d := p_tu;
  WHILE d <= p_den LOOP
    n := n + public.social_rollup_da_xem(d);
    d := d + 1;
  END LOOP;
  RETURN n;
END $function$;

CREATE OR REPLACE FUNCTION public.social_rollup_thang(
  p_thang date DEFAULT (date_trunc(
    'month', (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::timestamp
  ))::date
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_tu  date := date_trunc('month', p_thang::timestamp)::date;
  v_den date := (v_tu + interval '1 month')::date;
  v_rows integer;
BEGIN
  INSERT INTO public.social_thong_ke_doi_tuong_thang AS t (
    loai_doi_tuong, id_doi_tuong, thang,
    luot_tiep_can, luot_xem_noi_dung, luot_mo_comment,
    luot_click_profile, luot_xem_media, luot_click_lien_ket,
    lot_man_hinh, luot_tuong_tac, tiep_can_unique_ngay_tong
  )
  SELECT
    loai_doi_tuong, id_doi_tuong, v_tu,
    coalesce(sum(luot_tiep_can), 0),
    coalesce(sum(luot_xem_noi_dung), 0),
    coalesce(sum(luot_mo_comment), 0),
    coalesce(sum(luot_click_profile), 0),
    coalesce(sum(luot_xem_media), 0),
    coalesce(sum(luot_click_lien_ket), 0),
    coalesce(sum(lot_man_hinh), 0),
    coalesce(sum(luot_tuong_tac), 0),
    coalesce(sum(tiep_can_unique), 0)
  FROM public.social_thong_ke_doi_tuong_ngay
  WHERE ngay >= v_tu AND ngay < v_den
  GROUP BY loai_doi_tuong, id_doi_tuong
  ON CONFLICT (loai_doi_tuong, id_doi_tuong, thang) DO UPDATE SET
    luot_tiep_can = EXCLUDED.luot_tiep_can,
    luot_xem_noi_dung = EXCLUDED.luot_xem_noi_dung,
    luot_mo_comment = EXCLUDED.luot_mo_comment,
    luot_click_profile = EXCLUDED.luot_click_profile,
    luot_xem_media = EXCLUDED.luot_xem_media,
    luot_click_lien_ket = EXCLUDED.luot_click_lien_ket,
    lot_man_hinh = EXCLUDED.lot_man_hinh,
    luot_tuong_tac = EXCLUDED.luot_tuong_tac,
    tiep_can_unique_ngay_tong = EXCLUDED.tiep_can_unique_ngay_tong,
    cap_nhat_luc = now();

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END $function$;

-- Scrub: raw + social_da_xem.nguoi_xem (giữ viewer_key).
CREATE OR REPLACE FUNCTION public.social_xoa_danh_tinh_cu(p_truoc_ngay date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_rows integer;
  v_da integer;
  v_den timestamptz := (p_truoc_ngay::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh');
  v_tu  timestamptz := v_den - interval '32 days';
BEGIN
  UPDATE public.social_luot_xem
    SET nguoi_xem = NULL
    WHERE nguoi_xem IS NOT NULL
      AND tao_luc >= v_tu
      AND tao_luc < v_den;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  UPDATE public.social_da_xem
    SET nguoi_xem = NULL
    WHERE nguoi_xem IS NOT NULL
      AND lan_cuoi < v_den;
  GET DIAGNOSTICS v_da = ROW_COUNT;

  RETURN v_rows + v_da;
END $function$;

REVOKE ALL ON FUNCTION public.social_rollup_da_xem(date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.social_backfill_da_xem(date, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.social_rollup_thang(date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.social_xoa_danh_tinh_cu(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.social_rollup_da_xem(date) TO service_role;
GRANT EXECUTE ON FUNCTION public.social_backfill_da_xem(date, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.social_rollup_thang(date) TO service_role;
GRANT EXECUTE ON FUNCTION public.social_xoa_danh_tinh_cu(date) TO service_role;
