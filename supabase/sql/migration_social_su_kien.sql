-- =====================================================================
-- migration_social_su_kien.sql
-- Analytics tiếp cận / tương tác cho nội dung (cột mốc, tác phẩm, hồ sơ).
--
-- Đo 3 nhóm sự kiện chính:
--   1. hien_thi          — lượt tiếp cận (card lọt vào màn hình người khác)
--   2. mo_card           — click "Xem đầy đủ" / mở nội dung
--   3. mo_popover_nguoi  — click org-chip mở hồ sơ (xem thông tin cá nhân)
--
-- Nguyên tắc:
--   • Reuse bảng partitioned `social_luot_xem` đã có (thêm chiều "loại sự kiện").
--   • Phản-vanity (DECISIONS L18): số liệu là insight RIÊNG TƯ của chủ bài —
--     đọc qua service role + check chủ sở hữu, KHÔNG có policy đọc công khai.
--   • Khách chưa đăng nhập: dedup bằng `phien_id` (đã hash phía app).
--   • Tổng hợp về `social_thong_ke_doi_tuong_ngay` để render nhanh.
--
-- An toàn chạy lại nhiều lần (idempotent).
-- =====================================================================

-- 1) Enum loại sự kiện ---------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loai_su_kien_social_enum') THEN
    CREATE TYPE loai_su_kien_social_enum AS ENUM (
      'hien_thi',          -- impression / lượt tiếp cận
      'mo_card',           -- mở / xem đầy đủ nội dung
      'xem_binh_luan',     -- mở phần bình luận
      'mo_popover_nguoi',  -- click org-chip → popover hồ sơ
      'xem_profile_full',  -- bấm "Xem Journey" trong popover
      'click_lien_ket',    -- click ra link ngoài
      'xem_media'          -- mở ảnh / video
    );
  END IF;
END $$;

-- 2) Enum nguồn (bề mặt phát sinh) --------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'nguon_su_kien_enum') THEN
    CREATE TYPE nguon_su_kien_enum AS ENUM (
      'journey_home',
      'entity_lens',
      'permalink',
      'gallery',
      'org_page',
      'cong_dong',
      'khac'
    );
  END IF;
END $$;

-- 3) Mở rộng đối tượng social: cho phép hồ sơ người / tổ chức -----------
ALTER TYPE loai_doi_tuong_social_enum ADD VALUE IF NOT EXISTS 'nguoi_dung';
ALTER TYPE loai_doi_tuong_social_enum ADD VALUE IF NOT EXISTS 'to_chuc';

-- 4) Thêm chiều dữ liệu vào log thô (partitioned → cascade xuống con) ----
ALTER TABLE public.social_luot_xem
  ADD COLUMN IF NOT EXISTS loai_su_kien  loai_su_kien_social_enum NOT NULL DEFAULT 'hien_thi',
  ADD COLUMN IF NOT EXISTS phien_id      text,
  ADD COLUMN IF NOT EXISTS nguon         nguon_su_kien_enum,
  ADD COLUMN IF NOT EXISTS loai_boi_canh loai_doi_tuong_social_enum,
  ADD COLUMN IF NOT EXISTS id_boi_canh   uuid,
  ADD COLUMN IF NOT EXISTS ngu_canh      jsonb;

COMMENT ON COLUMN public.social_luot_xem.loai_su_kien  IS 'Loại sự kiện: hien_thi/mo_card/mo_popover_nguoi/...';
COMMENT ON COLUMN public.social_luot_xem.phien_id      IS 'ID phiên/khách đã hash (dedup khách chưa đăng nhập).';
COMMENT ON COLUMN public.social_luot_xem.nguon         IS 'Bề mặt phát sinh: journey_home/entity_lens/permalink/...';
COMMENT ON COLUMN public.social_luot_xem.loai_boi_canh IS 'Đối tượng bối cảnh (vd profile click phát sinh từ cot_moc nào).';
COMMENT ON COLUMN public.social_luot_xem.id_boi_canh   IS 'ID đối tượng bối cảnh.';

-- 5) Index phục vụ tổng hợp + truy vấn theo đối tượng -------------------
CREATE INDEX IF NOT EXISTS social_luot_xem_doi_tuong_idx
  ON public.social_luot_xem (loai_doi_tuong, id_doi_tuong, loai_su_kien, tao_luc);

CREATE INDEX IF NOT EXISTS social_luot_xem_boi_canh_idx
  ON public.social_luot_xem (loai_boi_canh, id_boi_canh, loai_su_kien)
  WHERE id_boi_canh IS NOT NULL;

CREATE INDEX IF NOT EXISTS social_luot_xem_chua_xu_ly_idx
  ON public.social_luot_xem (tao_luc)
  WHERE da_xu_ly_hint = false;

-- 6) Bảng tổng hợp theo ngày (subject = nội dung mà số liệu thuộc về) ---
CREATE TABLE IF NOT EXISTS public.social_thong_ke_doi_tuong_ngay (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  loai_doi_tuong      loai_doi_tuong_social_enum NOT NULL,
  id_doi_tuong        uuid NOT NULL,
  ngay                date NOT NULL,
  luot_tiep_can       integer NOT NULL DEFAULT 0,  -- tổng impression
  tiep_can_unique     integer NOT NULL DEFAULT 0,  -- số người/phiên duy nhất
  luot_xem_noi_dung   integer NOT NULL DEFAULT 0,
  luot_mo_comment     integer NOT NULL DEFAULT 0,
  luot_click_profile  integer NOT NULL DEFAULT 0,
  luot_xem_media      integer NOT NULL DEFAULT 0,
  luot_click_lien_ket integer NOT NULL DEFAULT 0,
  cap_nhat_luc        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_tk_doi_tuong_ngay_uniq UNIQUE (loai_doi_tuong, id_doi_tuong, ngay)
);

CREATE INDEX IF NOT EXISTS social_tk_doi_tuong_idx
  ON public.social_thong_ke_doi_tuong_ngay (loai_doi_tuong, id_doi_tuong, ngay DESC);

-- 7) RLS — số liệu riêng tư. Không policy public ⇒ chỉ service_role đọc/ghi.
ALTER TABLE public.social_thong_ke_doi_tuong_ngay ENABLE ROW LEVEL SECURITY;

-- 8) Hàm tổng hợp event thô → rollup ngày (gọi bằng cron/service role) ---
--    Quy gán theo "bối cảnh": sự kiện profile-click từ 1 cột mốc được tính
--    cho chính cột mốc đó (coalesce(boi_canh, doi_tuong)).
CREATE OR REPLACE FUNCTION public.social_rollup_su_kien(
  p_ngay date DEFAULT ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows integer;
BEGIN
  WITH ev AS (
    SELECT
      coalesce(loai_boi_canh, loai_doi_tuong) AS s_loai,
      coalesce(id_boi_canh, id_doi_tuong)     AS s_id,
      loai_su_kien,
      nguoi_xem,
      phien_id
    FROM public.social_luot_xem
    WHERE (tao_luc AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = p_ngay
  ),
  agg AS (
    SELECT
      s_loai, s_id,
      count(*) FILTER (WHERE loai_su_kien = 'hien_thi')                            AS tiep_can,
      count(DISTINCT coalesce(nguoi_xem::text, phien_id))
        FILTER (WHERE loai_su_kien = 'hien_thi')                                   AS tiep_can_uniq,
      count(*) FILTER (WHERE loai_su_kien = 'mo_card')                             AS xem_noi_dung,
      count(*) FILTER (WHERE loai_su_kien = 'xem_binh_luan')                       AS mo_comment,
      count(*) FILTER (WHERE loai_su_kien IN ('mo_popover_nguoi','xem_profile_full')) AS click_profile,
      count(*) FILTER (WHERE loai_su_kien = 'xem_media')                           AS xem_media,
      count(*) FILTER (WHERE loai_su_kien = 'click_lien_ket')                      AS click_lien_ket
    FROM ev
    GROUP BY s_loai, s_id
  )
  INSERT INTO public.social_thong_ke_doi_tuong_ngay AS t (
    loai_doi_tuong, id_doi_tuong, ngay,
    luot_tiep_can, tiep_can_unique, luot_xem_noi_dung,
    luot_mo_comment, luot_click_profile, luot_xem_media, luot_click_lien_ket
  )
  SELECT
    s_loai, s_id, p_ngay,
    tiep_can, tiep_can_uniq, xem_noi_dung,
    mo_comment, click_profile, xem_media, click_lien_ket
  FROM agg
  ON CONFLICT (loai_doi_tuong, id_doi_tuong, ngay) DO UPDATE SET
    luot_tiep_can       = EXCLUDED.luot_tiep_can,
    tiep_can_unique     = EXCLUDED.tiep_can_unique,
    luot_xem_noi_dung   = EXCLUDED.luot_xem_noi_dung,
    luot_mo_comment     = EXCLUDED.luot_mo_comment,
    luot_click_profile  = EXCLUDED.luot_click_profile,
    luot_xem_media      = EXCLUDED.luot_xem_media,
    luot_click_lien_ket = EXCLUDED.luot_click_lien_ket,
    cap_nhat_luc        = now();

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  UPDATE public.social_luot_xem
    SET da_xu_ly_hint = true
    WHERE (tao_luc AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = p_ngay
      AND da_xu_ly_hint = false;

  RETURN v_rows;
END $$;

REVOKE ALL ON FUNCTION public.social_rollup_su_kien(date) FROM PUBLIC, anon, authenticated;
