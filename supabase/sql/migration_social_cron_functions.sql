-- =====================================================================
-- migration_social_cron_functions.sql
-- P0-c PLAN_analytics_scale: dump bảng rollup + hàm cron đang sống trên DB
-- vào repo (trước đây chỉ tồn tại trên production, không có file SQL).
--
-- Dump 2026-08-13 từ DB thật. CREATE IF NOT EXISTS / CREATE OR REPLACE.
-- social_xoa_danh_tinh_cu: thêm cận dưới 32 ngày + so sánh tao_luc trực tiếp
-- (prune partition) — trước đây UPDATE mọi row < 90 ngày mỗi lần chạy.
-- Vẫn CHỈ NULL nguoi_xem (không đụng phien_id) — đúng hành vi live.
-- =====================================================================

-- ── Bảng đích rollup (đã có trên DB) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.social_thong_ke_nguon_ngay (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  loai_doi_tuong  loai_doi_tuong_social_enum NOT NULL,
  id_doi_tuong    uuid NOT NULL,
  nguon           nguon_su_kien_enum NOT NULL,
  ngay            date NOT NULL,
  lot_man_hinh    integer NOT NULL DEFAULT 0,
  luot_tiep_can   integer NOT NULL DEFAULT 0,
  tiep_can_unique integer NOT NULL DEFAULT 0,
  luot_mo         integer NOT NULL DEFAULT 0,
  cap_nhat_luc    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_tk_nguon_ngay_uniq
    UNIQUE (loai_doi_tuong, id_doi_tuong, nguon, ngay)
);

CREATE INDEX IF NOT EXISTS social_tk_nguon_doi_tuong_idx
  ON public.social_thong_ke_nguon_ngay (loai_doi_tuong, id_doi_tuong, ngay DESC);

ALTER TABLE public.social_thong_ke_nguon_ngay ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.social_thong_ke_nguon_ngay FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.social_thong_ke_nhom_ngay (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  loai_doi_tuong  loai_doi_tuong_social_enum NOT NULL,
  id_doi_tuong    uuid NOT NULL,
  ngay            date NOT NULL,
  loai_nhom       text NOT NULL,
  gia_tri         text NOT NULL,
  so_nguoi        integer NOT NULL DEFAULT 0,
  cap_nhat_luc    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_tk_nhom_ngay_uniq
    UNIQUE (loai_doi_tuong, id_doi_tuong, ngay, loai_nhom, gia_tri)
);

CREATE INDEX IF NOT EXISTS social_tk_nhom_doi_tuong_idx
  ON public.social_thong_ke_nhom_ngay (loai_doi_tuong, id_doi_tuong, ngay DESC);

ALTER TABLE public.social_thong_ke_nhom_ngay ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.social_thong_ke_nhom_ngay FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.shop_thong_ke_san_pham_ngay (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_san_pham       uuid NOT NULL,
  id_cua_hang       uuid NOT NULL,
  ngay              date NOT NULL,
  lot_man_hinh      integer NOT NULL DEFAULT 0,
  luot_thay         integer NOT NULL DEFAULT 0,
  nguoi_thay        integer NOT NULL DEFAULT 0,
  luot_mo           integer NOT NULL DEFAULT 0,
  luot_phong_to     integer NOT NULL DEFAULT 0,
  tong_thoi_gian_ms bigint NOT NULL DEFAULT 0,
  luot_them_gio     integer NOT NULL DEFAULT 0,
  so_don            integer NOT NULL DEFAULT 0,
  so_luong_ban      integer NOT NULL DEFAULT 0,
  doanh_thu         numeric NOT NULL DEFAULT 0,
  cap_nhat_luc      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shop_tk_san_pham_ngay_uniq UNIQUE (id_san_pham, ngay)
);

CREATE INDEX IF NOT EXISTS shop_tk_san_pham_cua_hang_idx
  ON public.shop_thong_ke_san_pham_ngay (id_cua_hang, ngay DESC);

ALTER TABLE public.shop_thong_ke_san_pham_ngay ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.shop_thong_ke_san_pham_ngay FROM PUBLIC, anon, authenticated;

-- Cột extra trên social_thong_ke_doi_tuong_ngay (đã có live, thiếu trong
-- migration_social_su_kien.sql). ADD IF NOT EXISTS = no-op trên production.
ALTER TABLE public.social_thong_ke_doi_tuong_ngay
  ADD COLUMN IF NOT EXISTS lot_man_hinh         integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS luot_tuong_tac       integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tong_thoi_gian_ms    bigint  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS so_mau_thoi_gian     integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS thoi_gian_trung_vi_ms integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tiep_can_nguoi_la    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tiep_can_theo_doi    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tiep_can_ban_be      integer NOT NULL DEFAULT 0;

-- ── Hàm rollup (dump live, chưa đổi query shape — đó là P1-b) ─────────

CREATE OR REPLACE FUNCTION public.social_rollup_nguon(
  p_ngay date DEFAULT ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE v_rows integer;
BEGIN
  WITH agg AS (
    SELECT
      loai_doi_tuong,
      id_doi_tuong,
      coalesce(nguon, 'khac'::nguon_su_kien_enum) AS nguon,
      count(*) FILTER (WHERE loai_su_kien = 'lot_man_hinh') AS lot_man_hinh,
      count(*) FILTER (WHERE loai_su_kien IN ('hien_thi','lot_man_hinh')) AS luot_tiep_can,
      count(DISTINCT coalesce(nguoi_xem::text, phien_id))
        FILTER (WHERE loai_su_kien IN ('hien_thi','lot_man_hinh')) AS tiep_can_unique,
      count(*) FILTER (WHERE loai_su_kien = 'mo_card') AS luot_mo
    FROM public.social_luot_xem
    WHERE (tao_luc AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = p_ngay
    GROUP BY 1, 2, 3
  )
  INSERT INTO public.social_thong_ke_nguon_ngay AS t (
    loai_doi_tuong, id_doi_tuong, nguon, ngay,
    lot_man_hinh, luot_tiep_can, tiep_can_unique, luot_mo
  )
  SELECT
    loai_doi_tuong, id_doi_tuong, nguon, p_ngay,
    lot_man_hinh, luot_tiep_can, tiep_can_unique, luot_mo
  FROM agg
  ON CONFLICT (loai_doi_tuong, id_doi_tuong, nguon, ngay) DO UPDATE SET
    lot_man_hinh = EXCLUDED.lot_man_hinh,
    luot_tiep_can = EXCLUDED.luot_tiep_can,
    tiep_can_unique = EXCLUDED.tiep_can_unique,
    luot_mo = EXCLUDED.luot_mo,
    cap_nhat_luc = now();
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END $function$;

CREATE OR REPLACE FUNCTION public.social_rollup_nhom(
  p_ngay date DEFAULT ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE v_rows integer;
BEGIN
  WITH viewers AS (
    SELECT DISTINCT
      loai_doi_tuong,
      id_doi_tuong,
      coalesce(nguoi_xem::text, phien_id) AS viewer_key,
      nguoi_xem
    FROM public.social_luot_xem
    WHERE (tao_luc AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = p_ngay
      AND loai_su_kien IN ('hien_thi','lot_man_hinh')
      AND coalesce(nguoi_xem::text, phien_id) IS NOT NULL
  ),
  agg AS (
    SELECT
      v.loai_doi_tuong,
      v.id_doi_tuong,
      CASE
        WHEN v.nguoi_xem IS NULL THEN 'khach'
        ELSE coalesce(u.giai_doan::text, 'chua_khai')
      END AS gia_tri,
      count(*)::integer AS so_nguoi
    FROM viewers v
    LEFT JOIN public.user_nguoi_dung u ON u.id = v.nguoi_xem
    GROUP BY 1, 2, 3
  )
  INSERT INTO public.social_thong_ke_nhom_ngay AS t (
    loai_doi_tuong, id_doi_tuong, ngay, loai_nhom, gia_tri, so_nguoi
  )
  SELECT loai_doi_tuong, id_doi_tuong, p_ngay, 'giai_doan', gia_tri, so_nguoi
  FROM agg
  ON CONFLICT (loai_doi_tuong, id_doi_tuong, ngay, loai_nhom, gia_tri) DO UPDATE SET
    so_nguoi = EXCLUDED.so_nguoi,
    cap_nhat_luc = now();
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END $function$;

CREATE OR REPLACE FUNCTION public.shop_rollup_san_pham(
  p_ngay date DEFAULT ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_rows integer := 0;
BEGIN
  WITH ev AS (
    SELECT
      id_doi_tuong AS id_san_pham,
      loai_su_kien,
      nguoi_xem,
      phien_id,
      ngu_canh
    FROM public.social_luot_xem
    WHERE (tao_luc AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = p_ngay
      AND loai_doi_tuong = 'shop_san_pham'
  ),
  agg AS (
    SELECT
      id_san_pham,
      count(*) FILTER (WHERE loai_su_kien = 'lot_man_hinh') AS lot_man_hinh,
      count(*) FILTER (WHERE loai_su_kien IN ('hien_thi','lot_man_hinh')) AS luot_thay,
      count(DISTINCT coalesce(nguoi_xem::text, phien_id))
        FILTER (WHERE loai_su_kien IN ('hien_thi','lot_man_hinh')) AS nguoi_thay,
      count(*) FILTER (
        WHERE loai_su_kien = 'tuong_tac'
          AND coalesce(ngu_canh->>'hanh_vi','') IN ('mo_catalog','click_sidebar_hang')
      ) AS luot_mo,
      count(*) FILTER (
        WHERE loai_su_kien = 'tuong_tac'
          AND coalesce(ngu_canh->>'hanh_vi','') = 'phong_to_anh'
      ) AS luot_phong_to,
      count(*) FILTER (
        WHERE loai_su_kien = 'tuong_tac'
          AND coalesce(ngu_canh->>'hanh_vi','') = 'them_gio'
      ) AS luot_them_gio,
      coalesce(sum(
        CASE WHEN loai_su_kien = 'thoi_gian_xem'
          THEN least(coalesce((ngu_canh->>'ms')::bigint, 0), 600000)
          ELSE 0 END
      ), 0) AS tong_ms
    FROM ev
    GROUP BY id_san_pham
  ),
  sp_meta AS (
    SELECT sp.id, ch.id AS id_cua_hang
    FROM public.shop_san_pham sp
    LEFT JOIN public.shop_cua_hang ch
      ON ch.id_nguoi_dung = sp.id_nguoi_dung AND ch.da_xoa = false
    WHERE sp.id IN (SELECT id_san_pham FROM agg)
  )
  INSERT INTO public.shop_thong_ke_san_pham_ngay AS t (
    id_san_pham, id_cua_hang, ngay,
    lot_man_hinh, luot_thay, nguoi_thay, luot_mo, luot_phong_to,
    luot_them_gio, tong_thoi_gian_ms
  )
  SELECT
    a.id_san_pham,
    coalesce(m.id_cua_hang, '00000000-0000-0000-0000-000000000000'::uuid),
    p_ngay,
    a.lot_man_hinh, a.luot_thay, a.nguoi_thay, a.luot_mo, a.luot_phong_to,
    a.luot_them_gio, a.tong_ms
  FROM agg a
  LEFT JOIN sp_meta m ON m.id = a.id_san_pham
  ON CONFLICT (id_san_pham, ngay) DO UPDATE SET
    id_cua_hang = COALESCE(EXCLUDED.id_cua_hang, t.id_cua_hang),
    lot_man_hinh = EXCLUDED.lot_man_hinh,
    luot_thay = EXCLUDED.luot_thay,
    nguoi_thay = EXCLUDED.nguoi_thay,
    luot_mo = EXCLUDED.luot_mo,
    luot_phong_to = EXCLUDED.luot_phong_to,
    luot_them_gio = EXCLUDED.luot_them_gio,
    tong_thoi_gian_ms = EXCLUDED.tong_thoi_gian_ms,
    cap_nhat_luc = now();

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  WITH don_ngay AS (
    SELECT d.id, d.tong_tien
    FROM public.shop_don_hang d
    WHERE (d.tao_luc AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = p_ngay
      AND d.trang_thai IN ('da_nhan_tien', 'da_giao_tai_su_kien', 'hoan_thanh')
  ),
  dong_agg AS (
    SELECT
      bt.id_san_pham,
      coalesce(ch.id, '00000000-0000-0000-0000-000000000000'::uuid) AS id_cua_hang,
      count(DISTINCT dd.id_don_hang) AS so_don,
      coalesce(sum(dd.so_luong), 0)::integer AS so_luong_ban,
      coalesce(sum(dd.so_luong * dd.gia_don_vi), 0)::numeric AS doanh_thu
    FROM public.shop_don_hang_dong dd
    JOIN don_ngay dn ON dn.id = dd.id_don_hang
    JOIN public.shop_bien_the bt ON bt.id = dd.id_bien_the
    JOIN public.shop_san_pham sp ON sp.id = bt.id_san_pham
    LEFT JOIN public.shop_cua_hang ch
      ON ch.id_nguoi_dung = sp.id_nguoi_dung AND ch.da_xoa = false
    GROUP BY bt.id_san_pham, ch.id
  )
  INSERT INTO public.shop_thong_ke_san_pham_ngay AS t (
    id_san_pham, id_cua_hang, ngay, so_don, so_luong_ban, doanh_thu
  )
  SELECT id_san_pham, id_cua_hang, p_ngay, so_don, so_luong_ban, doanh_thu
  FROM dong_agg
  ON CONFLICT (id_san_pham, ngay) DO UPDATE SET
    so_don = EXCLUDED.so_don,
    so_luong_ban = EXCLUDED.so_luong_ban,
    doanh_thu = EXCLUDED.doanh_thu,
    cap_nhat_luc = now();

  RETURN v_rows;
END $function$;

-- Scrub danh tính: cửa sổ [p_truoc_ngay-32, p_truoc_ngay) theo lịch VN,
-- so sánh tao_luc trực tiếp để prune partition. Chỉ NULL nguoi_xem.
CREATE OR REPLACE FUNCTION public.social_xoa_danh_tinh_cu(p_truoc_ngay date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_rows integer;
  v_den timestamptz := (p_truoc_ngay::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh');
  v_tu  timestamptz := v_den - interval '32 days';
BEGIN
  UPDATE public.social_luot_xem
    SET nguoi_xem = NULL
    WHERE nguoi_xem IS NOT NULL
      AND tao_luc >= v_tu
      AND tao_luc < v_den;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END $function$;

REVOKE ALL ON FUNCTION public.social_rollup_nguon(date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.social_rollup_nhom(date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.shop_rollup_san_pham(date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.social_xoa_danh_tinh_cu(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.social_rollup_nguon(date) TO service_role;
GRANT EXECUTE ON FUNCTION public.social_rollup_nhom(date) TO service_role;
GRANT EXECUTE ON FUNCTION public.shop_rollup_san_pham(date) TO service_role;
GRANT EXECUTE ON FUNCTION public.social_xoa_danh_tinh_cu(date) TO service_role;
