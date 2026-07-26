-- Gỡ giai đoạn `moi_bat_dau` ("Mới bắt đầu") khỏi CINs.
-- 2026-07-26 · User duyệt ALTER enum (L34 gate).
--
-- A. Data: moi_bat_dau → dang_hoc; scrub array tuyển dụng.
-- B. Recreate `giai_doan_enum` không còn `moi_bat_dau` (Postgres không DROP VALUE).

-- A1. Data (idempotent)
UPDATE public.user_nguoi_dung
SET giai_doan = 'dang_hoc'
WHERE giai_doan = 'moi_bat_dau';

UPDATE public.org_tuyen_dung
SET giai_doan_muc_tieu = array_remove(giai_doan_muc_tieu, 'moi_bat_dau')
WHERE 'moi_bat_dau' = ANY (giai_doan_muc_tieu);

UPDATE public.org_tuyen_dung
SET giai_doan_muc_tieu = ARRAY['dang_lam', 'tim_viec', 'freelance']::text[]
WHERE cardinality(giai_doan_muc_tieu) = 0;

-- B. DROP enum value bằng recreate (idempotent nếu value đã hết)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'giai_doan_enum'
      AND e.enumlabel = 'moi_bat_dau'
  ) THEN
    ALTER TYPE public.giai_doan_enum RENAME TO giai_doan_enum_old;
    CREATE TYPE public.giai_doan_enum AS ENUM (
      'dang_hoc',
      'dang_lam',
      'tim_viec',
      'freelance',
      'dang_day'
    );
    ALTER TABLE public.user_nguoi_dung
      ALTER COLUMN giai_doan TYPE public.giai_doan_enum
      USING giai_doan::text::public.giai_doan_enum;
    DROP TYPE public.giai_doan_enum_old;
  END IF;
END $$;

COMMENT ON TYPE public.giai_doan_enum IS
  'Giai đoạn Journey: dang_hoc / dang_lam / tim_viec / freelance / dang_day';
