-- org_dang_ky_su_kien: phân biệt "Quan tâm" vs "Sẽ tham gia".

DO $$ BEGIN
  CREATE TYPE loai_phan_hoi_su_kien_enum AS ENUM ('quan_tam', 'se_tham_gia');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE org_dang_ky_su_kien
  ADD COLUMN IF NOT EXISTS loai_phan_hoi loai_phan_hoi_su_kien_enum NOT NULL DEFAULT 'se_tham_gia';

COMMENT ON COLUMN org_dang_ky_su_kien.loai_phan_hoi IS
  'quan_tam = quan tâm; se_tham_gia = đăng ký tham dự (tính vào slot).';
