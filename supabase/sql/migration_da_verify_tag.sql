-- v7: thêm cờ verify cho tag, dùng cho ưu tiên autocomplete (KHÔNG phải gatekeeping)
ALTER TABLE article_bai_viet
  ADD COLUMN IF NOT EXISTS da_verify BOOLEAN NOT NULL DEFAULT false;

-- partial index: autocomplete chỉ filter verified, không scan toàn bảng
CREATE INDEX IF NOT EXISTS idx_article_bai_viet_da_verify
  ON article_bai_viet (da_verify)
  WHERE da_verify = true;
