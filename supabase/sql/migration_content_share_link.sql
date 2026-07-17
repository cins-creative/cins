-- Link chia sẻ OG bất biến theo từng lần bấm Copy link.
-- Chỉ server (service role) đọc/ghi; client không truy cập trực tiếp.
-- Target: CINS production ospzzzxcomrmhqrnkoiw.
-- Chạy: node scripts/run-content-share-link-migration.mjs
-- Idempotent.

CREATE TABLE IF NOT EXISTS public.content_share_link (
  token             text PRIMARY KEY,
  id_nguoi_tao      uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  id_to_chuc        uuid REFERENCES public.org_to_chuc(id) ON DELETE CASCADE,
  target_path       text NOT NULL,
  tieu_de           text NOT NULL,
  mo_ta             text,
  image_id          text NOT NULL,
  image_url         text NOT NULL,
  tao_luc           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_share_link_token_format
    CHECK (token ~ '^[A-Za-z0-9_-]{10,24}$'),
  CONSTRAINT content_share_link_target_internal
    CHECK (target_path ~ '^/[^[:space:]]*$'),
  CONSTRAINT content_share_link_image_https
    CHECK (image_url ~ '^https://')
);

CREATE INDEX IF NOT EXISTS idx_content_share_link_image_id
  ON public.content_share_link (image_id);

CREATE INDEX IF NOT EXISTS idx_content_share_link_creator_created
  ON public.content_share_link (id_nguoi_tao, tao_luc DESC);

COMMENT ON TABLE public.content_share_link IS
  'Short-link /s/{token}: cố định metadata + Cloudflare OG snapshot cho từng lần chia sẻ; người xem được đưa về target_path.';

ALTER TABLE public.content_share_link ENABLE ROW LEVEL SECURITY;

-- Không tạo policy: anon/authenticated bị deny mặc định; route server dùng service role.
REVOKE ALL ON TABLE public.content_share_link FROM anon, authenticated;
GRANT ALL ON TABLE public.content_share_link TO service_role;
