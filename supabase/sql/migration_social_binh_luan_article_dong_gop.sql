-- Bình luận trên bản đóng góp entity — dùng chung social_binh_luan + CommentBlock (Journey).
-- Project: ospzzzxcomrmhqrnkoiw
-- Idempotent.

ALTER TYPE public.loai_doi_tuong_social_enum
  ADD VALUE IF NOT EXISTS 'article_dong_gop';
