-- Thêm loại tin sticker cho meme chat — idempotent.
ALTER TYPE public.loai_tin_nhan_enum ADD VALUE IF NOT EXISTS 'sticker';
