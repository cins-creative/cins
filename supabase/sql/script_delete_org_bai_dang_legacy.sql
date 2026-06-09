-- Xóa bài đăng org LEGACY (HTML / chưa có blocks Journey).
-- Chạy SAU migration_org_bai_dang_noi_dung_blocks.sql.
--
-- Định nghĩa «bài cũ»:
--   noi_dung_blocks IS NULL  OR  noi_dung_blocks = '[]'
--
-- Không xóa bài đã có blocks (noi_dung_blocks khác []).
--
-- Preview trước khi xóa:
--   SELECT id, id_to_chuc, tieu_de, tao_luc, trang_thai
--   FROM public.org_bai_dang
--   WHERE noi_dung_blocks IS NULL OR noi_dung_blocks = '[]'::jsonb;

BEGIN;

-- ── 1. Reaction / lưu (polymorphic org_bai_dang) ──
DELETE FROM public.social_reaction r
WHERE r.loai_doi_tuong = 'org_bai_dang'
  AND r.id_doi_tuong IN (
    SELECT id
    FROM public.org_bai_dang
    WHERE noi_dung_blocks IS NULL
       OR noi_dung_blocks = '[]'::jsonb
  );

DELETE FROM public.social_luu s
WHERE s.loai_doi_tuong = 'org_bai_dang'
  AND s.id_doi_tuong IN (
    SELECT id
    FROM public.org_bai_dang
    WHERE noi_dung_blocks IS NULL
       OR noi_dung_blocks = '[]'::jsonb
  );

-- ── 2. Tag ngành gắn bài ──
DELETE FROM public.org_bai_dang_tag t
WHERE t.id_bai_dang IN (
  SELECT id
  FROM public.org_bai_dang
  WHERE noi_dung_blocks IS NULL
     OR noi_dung_blocks = '[]'::jsonb
);

-- ── 3. Filter cá nhân (nếu đã có bảng filter_gan) ──
DO $$
BEGIN
  IF to_regclass('public.filter_gan') IS NOT NULL THEN
    DELETE FROM public.filter_gan fg
    WHERE fg.loai_doi_tuong = 'org_bai_dang'
      AND fg.id_doi_tuong IN (
        SELECT id
        FROM public.org_bai_dang
        WHERE noi_dung_blocks IS NULL
           OR noi_dung_blocks = '[]'::jsonb
      );
  END IF;
END $$;

-- ── 4. Bài đăng ──
DELETE FROM public.org_bai_dang
WHERE noi_dung_blocks IS NULL
   OR noi_dung_blocks = '[]'::jsonb;

COMMIT;

-- ── Xóa TẤT CẢ bài đăng org (mọi org) — chỉ khi muốn reset hoàn toàn ──
-- BEGIN;
-- DELETE FROM public.social_reaction WHERE loai_doi_tuong = 'org_bai_dang';
-- DELETE FROM public.social_luu WHERE loai_doi_tuong = 'org_bai_dang';
-- DELETE FROM public.org_bai_dang_tag;
-- DELETE FROM public.org_bai_dang;
-- COMMIT;
