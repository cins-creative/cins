-- Comment Block v1 — chạy từng lệnh riêng trên Supabase SQL editor.
-- Sau khi chạy: đối chiếu schema DB trực tiếp (không còn file CINS_SCHEMA.md).

-- 1) Reaction trỏ vào comment (PG: không dùng giá trị mới trong cùng transaction với ADD VALUE).
ALTER TYPE loai_doi_tuong_social_enum ADD VALUE IF NOT EXISTS 'binh_luan';

-- 2) Pin comment (NULL = chưa pin).
ALTER TABLE social_binh_luan ADD COLUMN IF NOT EXISTS ghim_luc timestamptz;

-- 3) Index fetch theo đối tượng + cây reply.
CREATE INDEX IF NOT EXISTS idx_binh_luan_doi_tuong
  ON social_binh_luan (loai_doi_tuong, id_doi_tuong, id_cha, tao_luc);

-- 4) Dọn reaction trùng: mỗi user chỉ giữ một emoji / comment (row mới nhất).
DELETE FROM social_reaction sr
USING (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY id_nguoi_dung, loai_doi_tuong, id_doi_tuong
        ORDER BY id DESC
      ) AS rn
    FROM social_reaction
    WHERE loai_doi_tuong = 'binh_luan'
  ) ranked
  WHERE rn > 1
) dup
WHERE sr.id = dup.id;
