-- Hiển thị cột mốc ngoài (tagged / Lưu về) trên Journey của từng user.
-- Không đụng content_cot_moc gốc của tác giả.

ALTER TABLE content_tac_pham_tac_gia
  ADD COLUMN IF NOT EXISTS che_do_hien_thi_journey TEXT NOT NULL DEFAULT 'public';

ALTER TABLE social_luu
  ADD COLUMN IF NOT EXISTS che_do_hien_thi_journey TEXT NOT NULL DEFAULT 'public';

COMMENT ON COLUMN content_tac_pham_tac_gia.che_do_hien_thi_journey IS
  'feature | public | chi_minh — cách bài hiện trên Journey của người được tag (không đổi cot_moc gốc).';

COMMENT ON COLUMN social_luu.che_do_hien_thi_journey IS
  'feature | public | chi_minh — cách mục Lưu về hiện trên Journey của người lưu.';
