-- Share OG theme storage notes (2026-07-13)
-- Không thêm cột mới: reuse cột sẵn có sau khi đối chiếu DB.
--
-- user_nguoi_dung.theme (text, trước đây unused)
--   JSON string: { "active": ShareOgTheme, "customs": [{ imageId, createdAt }] }
--
-- org_to_chuc.cau_hinh.share_og_theme (jsonb nested)
--   Cùng shape object (không stringify).
--
-- Idempotent: file này chỉ ghi chú — không ALTER.
-- Nếu sau này cần jsonb native cho user: ALTER … theme TYPE jsonb USING theme::jsonb;

SELECT 1;
