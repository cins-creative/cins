-- Org bài đăng — nội dung kiểu Journey (Block[] JSONB).
-- Áp cho mọi org dùng org_bai_dang (truong_dai_hoc, co_so_dao_tao, studio).
-- Giữ cột noi_dung (HTML legacy) trong giai đoạn chuyển; source of truth mới = noi_dung_blocks.

ALTER TABLE public.org_bai_dang
  ADD COLUMN IF NOT EXISTS noi_dung_blocks jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.org_bai_dang.noi_dung_blocks IS
  'Mảng Block editor — cùng format content_tac_pham.noi_dung_blocks (article / photo grid / video). '
  'noi_dung (HTML) legacy giữ tạm cho bài cũ đến khi backfill xong.';
