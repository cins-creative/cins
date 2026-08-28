-- Customize giao diện trang hồ sơ (2026-08-28)
-- user_nguoi_dung.giao_dien (jsonb NOT NULL DEFAULT '{}')
--   {} → mặc định CINs (accent cins, nền none)
--   { v, theme: { accent, background }, customs?, … } — xem docs/PLAN_customize_theme.md
--
-- Idempotent: ADD COLUMN IF NOT EXISTS.
-- Inventory ALTER: docs/CINS_DECISIONS.md (2026-08-28).

ALTER TABLE public.user_nguoi_dung
  ADD COLUMN IF NOT EXISTS giao_dien jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.user_nguoi_dung.giao_dien IS
  'Tùy chỉnh giao diện trang hồ sơ: {v,theme:{accent,background},customs?}. {} = mặc định CINs. Không gộp với cột theme (share OG).';
