-- =====================================================================
-- migration_social_su_kien_breakdown.sql
-- Bổ sung 3 RPC đọc số liệu RIÊNG TƯ của 1 đối tượng (cột mốc…) từ log thô
-- `social_luot_xem` — REAL-TIME (không chờ rollup ngày).
--
--   1. social_insight_doi_tuong  — tổng các chỉ số (reach, xem nội dung, …)
--   2. social_insight_nguon      — tách lượt tiếp cận theo NGUỒN bề mặt
--                                  (bên ngoài vs trong trang tổ chức)
--   3. social_insight_giai_doan  — số người xem DUY NHẤT theo "loại người"
--                                  (giai_doan); khách chưa đăng nhập → 'khach'
--
-- Phản-vanity: tất cả SECURITY DEFINER + REVOKE khỏi anon/authenticated.
-- App đã kiểm tra quyền (canViewCotMocInsight) trước khi gọi qua service role.
-- An toàn chạy lại nhiều lần (idempotent: CREATE OR REPLACE).
-- =====================================================================

-- 1) Tổng các chỉ số — quy gán theo bối cảnh (profile-click từ cột mốc nào
--    được tính cho chính cột mốc đó), mirror logic rollup.
CREATE OR REPLACE FUNCTION public.social_insight_doi_tuong(
  p_loai loai_doi_tuong_social_enum,
  p_id   uuid
)
RETURNS TABLE (
  luot_tiep_can       bigint,
  tiep_can_unique     bigint,
  luot_xem_noi_dung   bigint,
  luot_mo_comment     bigint,
  luot_click_profile  bigint,
  luot_xem_media      bigint,
  luot_click_lien_ket bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ev AS (
    SELECT loai_su_kien, nguoi_xem, phien_id
    FROM public.social_luot_xem
    WHERE coalesce(loai_boi_canh, loai_doi_tuong) = p_loai
      AND coalesce(id_boi_canh, id_doi_tuong)     = p_id
  )
  SELECT
    count(*) FILTER (WHERE loai_su_kien = 'hien_thi'),
    count(DISTINCT coalesce(nguoi_xem::text, phien_id))
      FILTER (WHERE loai_su_kien = 'hien_thi'),
    count(*) FILTER (WHERE loai_su_kien = 'mo_card'),
    count(*) FILTER (WHERE loai_su_kien = 'xem_binh_luan'),
    count(*) FILTER (WHERE loai_su_kien IN ('mo_popover_nguoi','xem_profile_full')),
    count(*) FILTER (WHERE loai_su_kien = 'xem_media'),
    count(*) FILTER (WHERE loai_su_kien = 'click_lien_ket')
  FROM ev;
$$;

-- 2) Tách lượt tiếp cận (impression) theo nguồn bề mặt.
--    Impression đo trực tiếp trên đối tượng (không qua bối cảnh).
CREATE OR REPLACE FUNCTION public.social_insight_nguon(
  p_loai loai_doi_tuong_social_enum,
  p_id   uuid
)
RETURNS TABLE (
  nguon text,
  luot  bigint,
  nguoi bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    coalesce(nguon::text, 'khac') AS nguon,
    count(*)                       AS luot,
    count(DISTINCT coalesce(nguoi_xem::text, phien_id)) AS nguoi
  FROM public.social_luot_xem
  WHERE loai_doi_tuong = p_loai
    AND id_doi_tuong   = p_id
    AND loai_su_kien   = 'hien_thi'
  GROUP BY 1;
$$;

-- 3) Số người xem duy nhất theo loại người (giai_doan).
--    Khách (chưa đăng nhập) gom vào 'khach'.
CREATE OR REPLACE FUNCTION public.social_insight_giai_doan(
  p_loai loai_doi_tuong_social_enum,
  p_id   uuid
)
RETURNS TABLE (
  giai_doan text,
  nguoi     bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH viewers AS (
    SELECT DISTINCT
      coalesce(nguoi_xem::text, phien_id) AS viewer_key,
      nguoi_xem
    FROM public.social_luot_xem
    WHERE loai_doi_tuong = p_loai
      AND id_doi_tuong   = p_id
      AND loai_su_kien   = 'hien_thi'
      AND coalesce(nguoi_xem::text, phien_id) IS NOT NULL
  )
  SELECT
    CASE
      WHEN v.nguoi_xem IS NULL THEN 'khach'
      ELSE coalesce(u.giai_doan::text, 'chua_khai')
    END AS giai_doan,
    count(*) AS nguoi
  FROM viewers v
  LEFT JOIN public.user_nguoi_dung u ON u.id = v.nguoi_xem
  GROUP BY 1;
$$;

-- 4) Quyền: chỉ service_role (app đã check chủ sở hữu). Chặn anon/authenticated.
REVOKE ALL ON FUNCTION public.social_insight_doi_tuong(loai_doi_tuong_social_enum, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.social_insight_nguon(loai_doi_tuong_social_enum, uuid)      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.social_insight_giai_doan(loai_doi_tuong_social_enum, uuid)  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.social_insight_doi_tuong(loai_doi_tuong_social_enum, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.social_insight_nguon(loai_doi_tuong_social_enum, uuid)      TO service_role;
GRANT EXECUTE ON FUNCTION public.social_insight_giai_doan(loai_doi_tuong_social_enum, uuid)  TO service_role;
