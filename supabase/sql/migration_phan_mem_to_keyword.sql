-- Gộp loại bài `phan_mem` (Phần mềm) → `keyword` (Khái niệm / Thẻ).
-- Idempotent: chỉ UPDATE hàng còn loai_bai_viet = 'phan_mem'.
-- Không DROP VALUE enum `phan_mem` (Postgres khó gỡ enum; để bước UI/code sau).
-- Unique `article_bai_viet.slug` là toàn cục — inspect 2026-08-16: 0 collision.

UPDATE public.article_bai_viet
SET
  loai_bai_viet = 'keyword'::loai_bai_viet_enum,
  cap_nhat_luc = now()
WHERE loai_bai_viet = 'phan_mem'::loai_bai_viet_enum;
