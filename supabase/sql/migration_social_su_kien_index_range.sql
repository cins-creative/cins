-- =====================================================================
-- migration_social_su_kien_index_range.sql
-- P1-a PLAN_analytics_scale: index phục vụ feed/insight + RPC có khoảng tao_luc.
--
-- Parent index = ON ONLY (nhanh, chưa valid). Child index CONCURRENTLY
-- do script `run-analytics-p1-migration.mjs` tạo + ATTACH.
-- An toàn chạy lại (IF NOT EXISTS / CREATE OR REPLACE).
-- =====================================================================

CREATE INDEX IF NOT EXISTS social_luot_xem_viewer_idx
  ON ONLY public.social_luot_xem (nguoi_xem, id_doi_tuong, loai_su_kien)
  WHERE nguoi_xem IS NOT NULL;

CREATE INDEX IF NOT EXISTS social_luot_xem_id_doi_tuong_idx
  ON ONLY public.social_luot_xem (id_doi_tuong, loai_su_kien, tao_luc);

CREATE INDEX IF NOT EXISTS social_luot_xem_boi_canh_tao_luc_idx
  ON ONLY public.social_luot_xem (id_boi_canh, loai_su_kien, tao_luc)
  WHERE id_boi_canh IS NOT NULL;

-- ── Overload 4-arg: prune partition + 2 nhánh khớp index ──────────────
CREATE OR REPLACE FUNCTION public.social_insight_doi_tuong(
  p_loai loai_doi_tuong_social_enum,
  p_id   uuid,
  p_tu   timestamptz,
  p_den  timestamptz
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
    WHERE tao_luc >= p_tu AND tao_luc < p_den
      AND loai_boi_canh = p_loai AND id_boi_canh = p_id
    UNION ALL
    SELECT loai_su_kien, nguoi_xem, phien_id
    FROM public.social_luot_xem
    WHERE tao_luc >= p_tu AND tao_luc < p_den
      AND id_boi_canh IS NULL
      AND loai_doi_tuong = p_loai AND id_doi_tuong = p_id
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

CREATE OR REPLACE FUNCTION public.social_insight_nguon(
  p_loai loai_doi_tuong_social_enum,
  p_id   uuid,
  p_tu   timestamptz,
  p_den  timestamptz
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
  WHERE tao_luc >= p_tu AND tao_luc < p_den
    AND loai_doi_tuong = p_loai
    AND id_doi_tuong   = p_id
    AND loai_su_kien   = 'hien_thi'
  GROUP BY 1;
$$;

CREATE OR REPLACE FUNCTION public.social_insight_giai_doan(
  p_loai loai_doi_tuong_social_enum,
  p_id   uuid,
  p_tu   timestamptz,
  p_den  timestamptz
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
    WHERE tao_luc >= p_tu AND tao_luc < p_den
      AND loai_doi_tuong = p_loai
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

-- Wrapper 2-arg: mặc định 90 ngày (gọi cũ / PostgREST không gửi p_tu).
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
  SELECT * FROM public.social_insight_doi_tuong(
    p_loai, p_id, now() - interval '90 days', now()
  );
$$;

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
  SELECT * FROM public.social_insight_nguon(
    p_loai, p_id, now() - interval '90 days', now()
  );
$$;

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
  SELECT * FROM public.social_insight_giai_doan(
    p_loai, p_id, now() - interval '90 days', now()
  );
$$;

REVOKE ALL ON FUNCTION public.social_insight_doi_tuong(loai_doi_tuong_social_enum, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.social_insight_nguon(loai_doi_tuong_social_enum, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.social_insight_giai_doan(loai_doi_tuong_social_enum, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.social_insight_doi_tuong(loai_doi_tuong_social_enum, uuid, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.social_insight_nguon(loai_doi_tuong_social_enum, uuid, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.social_insight_giai_doan(loai_doi_tuong_social_enum, uuid, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.social_insight_doi_tuong(loai_doi_tuong_social_enum, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.social_insight_nguon(loai_doi_tuong_social_enum, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.social_insight_giai_doan(loai_doi_tuong_social_enum, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.social_insight_doi_tuong(loai_doi_tuong_social_enum, uuid, timestamptz, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.social_insight_nguon(loai_doi_tuong_social_enum, uuid, timestamptz, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.social_insight_giai_doan(loai_doi_tuong_social_enum, uuid, timestamptz, timestamptz) TO service_role;
