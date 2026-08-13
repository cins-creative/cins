-- =====================================================================
-- migration_social_rollup_range.sql
-- P1-b PLAN_analytics_scale: rollup so sánh tao_luc trực tiếp (prune
-- partition). Bỏ mass UPDATE da_xu_ly_hint (cột giữ cho pipeline AI hint).
-- Giữ nguyên cột extra live của social_thong_ke_doi_tuong_ngay.
-- An toàn chạy lại (CREATE OR REPLACE).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.social_rollup_su_kien(
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
      coalesce(loai_boi_canh, loai_doi_tuong) AS s_loai,
      coalesce(id_boi_canh, id_doi_tuong)     AS s_id,
      loai_su_kien,
      nguoi_xem,
      phien_id,
      ngu_canh
    FROM public.social_luot_xem
    WHERE tao_luc >= v_tu AND tao_luc < v_den
  ),
  agg AS (
    SELECT
      s_loai, s_id,
      count(*) FILTER (WHERE loai_su_kien IN ('hien_thi','lot_man_hinh')) AS tiep_can,
      count(DISTINCT coalesce(nguoi_xem::text, phien_id))
        FILTER (WHERE loai_su_kien IN ('hien_thi','lot_man_hinh')) AS tiep_can_uniq,
      count(*) FILTER (WHERE loai_su_kien = 'lot_man_hinh') AS lot_man_hinh,
      count(*) FILTER (WHERE loai_su_kien = 'mo_card') AS xem_noi_dung,
      count(*) FILTER (WHERE loai_su_kien = 'xem_binh_luan') AS mo_comment,
      count(*) FILTER (WHERE loai_su_kien IN ('mo_popover_nguoi','xem_profile_full')) AS click_profile,
      count(*) FILTER (WHERE loai_su_kien = 'xem_media') AS xem_media,
      count(*) FILTER (WHERE loai_su_kien = 'click_lien_ket') AS click_lien_ket,
      count(*) FILTER (WHERE loai_su_kien = 'tuong_tac') AS tuong_tac,
      coalesce(sum(
        CASE WHEN loai_su_kien = 'thoi_gian_xem'
          THEN least(coalesce((ngu_canh->>'ms')::bigint, 0), 600000)
          ELSE 0 END
      ), 0) AS tong_ms,
      count(*) FILTER (WHERE loai_su_kien = 'thoi_gian_xem') AS so_mau_tg
    FROM ev
    GROUP BY s_loai, s_id
  )
  INSERT INTO public.social_thong_ke_doi_tuong_ngay AS t (
    loai_doi_tuong, id_doi_tuong, ngay,
    luot_tiep_can, tiep_can_unique, luot_xem_noi_dung,
    luot_mo_comment, luot_click_profile, luot_xem_media, luot_click_lien_ket,
    lot_man_hinh, luot_tuong_tac, tong_thoi_gian_ms, so_mau_thoi_gian
  )
  SELECT
    s_loai, s_id, p_ngay,
    tiep_can, tiep_can_uniq, xem_noi_dung,
    mo_comment, click_profile, xem_media, click_lien_ket,
    lot_man_hinh, tuong_tac, tong_ms, so_mau_tg
  FROM agg
  ON CONFLICT (loai_doi_tuong, id_doi_tuong, ngay) DO UPDATE SET
    luot_tiep_can       = EXCLUDED.luot_tiep_can,
    tiep_can_unique     = EXCLUDED.tiep_can_unique,
    luot_xem_noi_dung   = EXCLUDED.luot_xem_noi_dung,
    luot_mo_comment     = EXCLUDED.luot_mo_comment,
    luot_click_profile  = EXCLUDED.luot_click_profile,
    luot_xem_media      = EXCLUDED.luot_xem_media,
    luot_click_lien_ket = EXCLUDED.luot_click_lien_ket,
    lot_man_hinh        = EXCLUDED.lot_man_hinh,
    luot_tuong_tac      = EXCLUDED.luot_tuong_tac,
    tong_thoi_gian_ms   = EXCLUDED.tong_thoi_gian_ms,
    so_mau_thoi_gian    = EXCLUDED.so_mau_thoi_gian,
    cap_nhat_luc        = now();

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END $function$;

CREATE OR REPLACE FUNCTION public.social_rollup_nguon(
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
    WHERE tao_luc >= v_tu AND tao_luc < v_den
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
DECLARE
  v_tu  timestamptz := (p_ngay::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh');
  v_den timestamptz := ((p_ngay + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh');
  v_rows integer;
BEGIN
  WITH viewers AS (
    SELECT DISTINCT
      loai_doi_tuong,
      id_doi_tuong,
      coalesce(nguoi_xem::text, phien_id) AS viewer_key,
      nguoi_xem
    FROM public.social_luot_xem
    WHERE tao_luc >= v_tu AND tao_luc < v_den
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
  v_tu  timestamptz := (p_ngay::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh');
  v_den timestamptz := ((p_ngay + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh');
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
    WHERE tao_luc >= v_tu AND tao_luc < v_den
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
    WHERE d.tao_luc >= v_tu AND d.tao_luc < v_den
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

REVOKE ALL ON FUNCTION public.social_rollup_su_kien(date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.social_rollup_nguon(date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.social_rollup_nhom(date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.shop_rollup_san_pham(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.social_rollup_su_kien(date) TO service_role;
GRANT EXECUTE ON FUNCTION public.social_rollup_nguon(date) TO service_role;
GRANT EXECUTE ON FUNCTION public.social_rollup_nhom(date) TO service_role;
GRANT EXECUTE ON FUNCTION public.shop_rollup_san_pham(date) TO service_role;
