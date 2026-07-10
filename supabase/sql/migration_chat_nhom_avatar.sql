-- Avatar tuỳ chỉnh cho nhóm chat (loai_phong = nhom).
-- Idempotent.

ALTER TABLE public.chat_phong
  ADD COLUMN IF NOT EXISTS avatar_id text;

COMMENT ON COLUMN public.chat_phong.avatar_id IS
  'Cloudflare Images id — ảnh đại diện nhóm (loai_phong = nhom). NULL = mosaic thành viên.';
