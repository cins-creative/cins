-- Ảnh bìa (thumbnail) cho bộ meme — idempotent.
ALTER TABLE public.user_emoji_bo
  ADD COLUMN IF NOT EXISTS cloudflare_id_anh_bia text;

COMMENT ON COLUMN public.user_emoji_bo.cloudflare_id_anh_bia IS
  'Thumbnail tab bộ meme — Cloudflare Images id; fallback meme đầu tiên nếu null.';
