-- org_tuyen_dung v3 — địa chỉ cụ thể + cấp độ nhiều giá trị.
-- Idempotent — chạy sau migration_org_tuyen_dung_v2_distribution.sql.
-- ⚠️ Chuyển `cap_do` từ text -> text[] (giữ lại giá trị cũ thành mảng 1 phần tử).

-- 1) Địa chỉ cụ thể nơi làm việc (số nhà, đường, phường/quận…).
ALTER TABLE public.org_tuyen_dung
  ADD COLUMN IF NOT EXISTS dia_chi text;

COMMENT ON COLUMN public.org_tuyen_dung.dia_chi IS
  'Địa chỉ cụ thể nơi làm việc (số nhà, đường, phường/quận) — bổ sung cho tinh_thanh.';

-- 2) cap_do: text -> text[] (chỉ đổi nếu chưa phải mảng).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'org_tuyen_dung'
      AND column_name = 'cap_do'
      AND data_type <> 'ARRAY'
  ) THEN
    ALTER TABLE public.org_tuyen_dung ALTER COLUMN cap_do DROP DEFAULT;
    ALTER TABLE public.org_tuyen_dung
      ALTER COLUMN cap_do TYPE text[]
      USING (
        CASE
          WHEN cap_do IS NULL OR btrim(cap_do) = '' THEN NULL
          ELSE ARRAY[btrim(cap_do)]
        END
      );
  END IF;
END $$;

COMMENT ON COLUMN public.org_tuyen_dung.cap_do IS
  'Cấp độ vị trí — nhiều giá trị (intern, fresher, junior, middle, senior, lead, director).';
