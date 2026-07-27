-- Autopilot Giai đoạn 7 — công tắc tương tác ảo per-nick.
-- Thêm cột auto_tai_khoan.tuong_tac_bat (mặc định FALSE = tắt).
-- Bật/tắt từng nick trong /admin/tai-khoan-ai; cron tuong-tac chỉ chạy nick TRUE.
-- Idempotent. Chạy: npm run migrate:autopilot-tuong-tac

ALTER TABLE public.auto_tai_khoan
  ADD COLUMN IF NOT EXISTS tuong_tac_bat boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.auto_tai_khoan.tuong_tac_bat IS
  'Giai đoạn 7: bật thả emoji/comment ảo cho nick này (mặc định tắt). Độc lập với dang_bat (đăng bài).';
