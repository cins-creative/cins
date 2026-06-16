-- Soft-delete bài đăng org (Ẩn) — API PATCH/DELETE dùng trang_thai = archived.

ALTER TYPE trang_thai_bai_dang_enum ADD VALUE IF NOT EXISTS 'archived';

COMMENT ON TYPE trang_thai_bai_dang_enum IS
  'org_bai_dang.trang_thai: nhap (nháp/lên lịch) · da_dang (công khai) · archived (ẩn khỏi timeline).';
