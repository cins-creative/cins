-- Mức thông báo khi follow org (cộng đồng).
-- tat_ca: mọi bài mới | chi_noi_bat: ghim / admin | tat: không nhận.

ALTER TABLE user_theo_doi
  ADD COLUMN IF NOT EXISTS muc_thong_bao TEXT NOT NULL DEFAULT 'chi_noi_bat';

COMMENT ON COLUMN user_theo_doi.muc_thong_bao IS
  'Mức nhận social_thong_bao khi follow org: tat_ca | chi_noi_bat | tat';
