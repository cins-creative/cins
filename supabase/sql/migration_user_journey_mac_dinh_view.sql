-- Journey: chế độ hiển thị mặc định trên trang cá nhân (2026-07-13)
-- Khi người dùng KHÁC mở trang cá nhân, hiển thị mặc định theo lựa chọn của chủ.
--
-- user_nguoi_dung.journey_mac_dinh_view (text, nullable)
--   'timeline'      → dòng thời gian Journey (mặc định khi NULL)
--   'gallery'       → Gallery dạng thẻ  (?view=gallery)
--   'gallery_luoi'  → Gallery lưới gọn  (?view=gallery&display=luoi)
--
-- user_nguoi_dung.journey_mac_dinh_ap_dung_toi (boolean, default false)
--   false → chỉ áp chế độ mặc định cho KHÁCH (chủ trang vẫn vào timeline).
--   true  → áp cho cả chính chủ khi tự mở trang mình.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + CHECK constraint có guard.

ALTER TABLE public.user_nguoi_dung
  ADD COLUMN IF NOT EXISTS journey_mac_dinh_view text;

ALTER TABLE public.user_nguoi_dung
  ADD COLUMN IF NOT EXISTS journey_mac_dinh_ap_dung_toi boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_nguoi_dung_journey_mac_dinh_view_check'
  ) THEN
    ALTER TABLE public.user_nguoi_dung
      ADD CONSTRAINT user_nguoi_dung_journey_mac_dinh_view_check
      CHECK (
        journey_mac_dinh_view IS NULL
        OR journey_mac_dinh_view IN ('timeline', 'gallery', 'gallery_luoi')
      );
  END IF;
END $$;
