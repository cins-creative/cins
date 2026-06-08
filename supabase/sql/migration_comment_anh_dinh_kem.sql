-- Comment ảnh đính kèm — Cloudflare image id (text[]), tối đa 4 ảnh / comment (enforce app).
-- Sau khi chạy: regenerate docs/CINS_SCHEMA.md.

ALTER TABLE social_binh_luan
  ADD COLUMN IF NOT EXISTS anh_dinh_kem text[];
