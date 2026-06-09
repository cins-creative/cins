-- Ghi chú riêng khi lưu về Journey — không đổi nội dung gốc.

ALTER TABLE social_luu
  ADD COLUMN IF NOT EXISTS ghi_chu_rieng text;

COMMENT ON COLUMN social_luu.ghi_chu_rieng IS
  'Ghi chú riêng của người lưu; chỉ họ thấy trên Journey của mình.';
