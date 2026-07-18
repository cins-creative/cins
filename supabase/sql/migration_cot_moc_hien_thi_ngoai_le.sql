-- Tùy chỉnh hiển thị cột mốc: chặn người cụ thể, hoặc chỉ cho phép một số người.
-- Không thêm enum che_do_hien_thi — nền vẫn là theo_nhom (chặn) / chi_minh (cho phép).

CREATE TABLE IF NOT EXISTS content_cot_moc_hien_thi_ngoai_le (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cot_moc uuid NOT NULL REFERENCES content_cot_moc (id) ON DELETE CASCADE,
  id_nguoi_dung uuid NOT NULL REFERENCES user_nguoi_dung (id) ON DELETE CASCADE,
  loai text NOT NULL CHECK (loai IN ('chan', 'cho_phep')),
  tao_luc timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_cot_moc_hien_thi_ngoai_le_unique
    UNIQUE (id_cot_moc, id_nguoi_dung)
);

CREATE INDEX IF NOT EXISTS content_cot_moc_hien_thi_ngoai_le_moc_idx
  ON content_cot_moc_hien_thi_ngoai_le (id_cot_moc);

CREATE INDEX IF NOT EXISTS content_cot_moc_hien_thi_ngoai_le_user_loai_idx
  ON content_cot_moc_hien_thi_ngoai_le (id_nguoi_dung, loai);

COMMENT ON TABLE content_cot_moc_hien_thi_ngoai_le IS
  'Ngoại lệ hiển thị cột mốc: chan = ẩn với người này (nền theo_nhom); cho_phep = chỉ người này (+ chủ) xem (nền chi_minh). Một cột mốc chỉ dùng một loai.';

COMMENT ON COLUMN content_cot_moc_hien_thi_ngoai_le.loai IS
  'chan | cho_phep — không trộn hai loại trên cùng id_cot_moc (enforce ở app).';

ALTER TABLE content_cot_moc_hien_thi_ngoai_le ENABLE ROW LEVEL SECURITY;
