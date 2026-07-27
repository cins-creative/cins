-- Bình luận dưới danh nghĩa tổ chức (owner/admin).
-- NULL = cá nhân; có giá trị = hiện avatar/tên org, vẫn giữ nguoi_binh_luan = người gửi thật.

ALTER TABLE social_binh_luan
  ADD COLUMN IF NOT EXISTS id_to_chuc uuid REFERENCES org_to_chuc (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS social_binh_luan_id_to_chuc_idx
  ON social_binh_luan (id_to_chuc)
  WHERE id_to_chuc IS NOT NULL;

COMMENT ON COLUMN social_binh_luan.id_to_chuc IS
  'Org danh nghĩa khi comment-as-org (owner/admin). NULL = cá nhân.';
