-- =====================================================================
-- migration_chat_nhom_owner.sql
-- Vai trò nhóm: owner / admin / thanh_vien trên enum vai_tro_chat_enum.
-- Admin cũ (người tạo / sớm nhất) → owner. Idempotent.
-- =====================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'vai_tro_chat_enum'
      AND e.enumlabel = 'owner'
  ) THEN
    ALTER TYPE public.vai_tro_chat_enum ADD VALUE 'owner';
  END IF;
END
$$;

-- Mỗi phòng nhóm: admin tham gia sớm nhất → owner (các admin khác giữ nguyên).
WITH ranked AS (
  SELECT
    tv.id,
    ROW_NUMBER() OVER (
      PARTITION BY tv.id_phong
      ORDER BY tv.tham_gia_luc ASC NULLS LAST, tv.id ASC
    ) AS rn
  FROM public.chat_thanh_vien tv
  INNER JOIN public.chat_phong p ON p.id = tv.id_phong
  WHERE p.loai_phong = 'nhom'
    AND tv.vai_tro = 'admin'
    AND tv.roi_luc IS NULL
)
UPDATE public.chat_thanh_vien tv
SET vai_tro = 'owner'
FROM ranked r
WHERE tv.id = r.id
  AND r.rn = 1
  AND tv.vai_tro::text = 'admin';

COMMENT ON COLUMN public.chat_thanh_vien.vai_tro IS
  'Nhóm chat: owner | admin | thanh_vien (enum vai_tro_chat_enum).';
