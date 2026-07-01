-- org_su_kien: miễn phí / tính phí + khu vực (tinh_thanh_vn_enum) cho gợi ý theo vùng.

ALTER TABLE org_su_kien
  ADD COLUMN IF NOT EXISTS mien_phi boolean NOT NULL DEFAULT true;

ALTER TABLE org_su_kien
  ADD COLUMN IF NOT EXISTS gia_ve integer;

ALTER TABLE org_su_kien
  ADD COLUMN IF NOT EXISTS tinh_thanh tinh_thanh_vn_enum;

COMMENT ON COLUMN org_su_kien.mien_phi IS 'true = miễn phí; false = tính phí (gia_ve tuỳ chọn).';
COMMENT ON COLUMN org_su_kien.gia_ve IS 'Giá vé VND khi tính phí — có thể null nếu chưa công bố.';
COMMENT ON COLUMN org_su_kien.tinh_thanh IS 'Khu vực tổ chức — phục vụ gợi ý / delivery tới nhóm gần khu vực.';
