-- Bộ giáo trình + module bài tập MM (idempotent)
-- Plan: docs/PLAN_giao_trinh_modules.md
-- ALTER đã duyệt 2026-08-04: org_bai_tap (+id_to_chuc, +yeu_cau, id_khoa_hoc DROP NOT NULL)
--                      org_khoa_hoc (+id_bo_giao_trinh)

BEGIN;

-- 1. Enum thuộc tính bài trong bộ
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'loai_bai_giao_trinh_enum'
  ) THEN
    CREATE TYPE public.loai_bai_giao_trinh_enum AS ENUM (
      'bai_tap',
      'ly_thuyet',
      'tham_khao',
      'demo',
      'bai_mau',
      'kiem_tra',
      'du_an',
      'on_tap'
    );
  END IF;
END $$;

-- 2. Bảng bộ giáo trình (cấp org)
CREATE TABLE IF NOT EXISTS public.org_bo_giao_trinh (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_to_chuc uuid NOT NULL REFERENCES public.org_to_chuc(id) ON DELETE CASCADE,
  ten_bo text NOT NULL,
  mo_ta text NULL,
  thu_tu integer NOT NULL DEFAULT 0,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS org_bo_giao_trinh_org_thu_tu_idx
  ON public.org_bo_giao_trinh (id_to_chuc, thu_tu);

CREATE UNIQUE INDEX IF NOT EXISTS org_bo_giao_trinh_org_ten_uq
  ON public.org_bo_giao_trinh (id_to_chuc, lower(ten_bo));

-- 3. ALTER org_bai_tap (trước junction vì FK id_bai_tap)
ALTER TABLE public.org_bai_tap
  ADD COLUMN IF NOT EXISTS id_to_chuc uuid NULL;

ALTER TABLE public.org_bai_tap
  ADD COLUMN IF NOT EXISTS yeu_cau text NULL;

-- Backfill id_to_chuc từ khóa
UPDATE public.org_bai_tap bt
SET id_to_chuc = k.id_to_chuc
FROM public.org_khoa_hoc k
WHERE bt.id_khoa_hoc = k.id
  AND bt.id_to_chuc IS NULL;

-- Xóa module mồ côi (khóa đã mất, không backfill được)
DELETE FROM public.org_bai_tap
WHERE id_to_chuc IS NULL;

-- FK id_to_chuc (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'org_bai_tap_id_to_chuc_fkey'
  ) THEN
    ALTER TABLE public.org_bai_tap
      ADD CONSTRAINT org_bai_tap_id_to_chuc_fkey
      FOREIGN KEY (id_to_chuc) REFERENCES public.org_to_chuc(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.org_bai_tap
  ALTER COLUMN id_to_chuc SET NOT NULL;

-- Nới id_khoa_hoc (legacy pointer)
ALTER TABLE public.org_bai_tap
  ALTER COLUMN id_khoa_hoc DROP NOT NULL;

CREATE INDEX IF NOT EXISTS org_bai_tap_org_thu_tu_idx
  ON public.org_bai_tap (id_to_chuc, thu_tu);

-- 4. Junction MM
CREATE TABLE IF NOT EXISTS public.org_giao_trinh_bai (
  id_bo uuid NOT NULL REFERENCES public.org_bo_giao_trinh(id) ON DELETE CASCADE,
  id_bai_tap uuid NOT NULL REFERENCES public.org_bai_tap(id) ON DELETE CASCADE,
  thuoc_tinh public.loai_bai_giao_trinh_enum NOT NULL DEFAULT 'bai_tap',
  thu_tu integer NOT NULL DEFAULT 0,
  ghi_chu text NULL,
  PRIMARY KEY (id_bo, id_bai_tap)
);

CREATE INDEX IF NOT EXISTS org_giao_trinh_bai_bo_thu_tu_idx
  ON public.org_giao_trinh_bai (id_bo, thu_tu);

CREATE INDEX IF NOT EXISTS org_giao_trinh_bai_bai_idx
  ON public.org_giao_trinh_bai (id_bai_tap);

-- 5. ALTER org_khoa_hoc — gắn 1 bộ
ALTER TABLE public.org_khoa_hoc
  ADD COLUMN IF NOT EXISTS id_bo_giao_trinh uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'org_khoa_hoc_id_bo_giao_trinh_fkey'
  ) THEN
    ALTER TABLE public.org_khoa_hoc
      ADD CONSTRAINT org_khoa_hoc_id_bo_giao_trinh_fkey
      FOREIGN KEY (id_bo_giao_trinh)
      REFERENCES public.org_bo_giao_trinh(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS org_khoa_hoc_bo_giao_trinh_idx
  ON public.org_khoa_hoc (id_bo_giao_trinh)
  WHERE id_bo_giao_trinh IS NOT NULL;

-- 6. Backfill: mỗi khóa có bài visible → 1 bộ + junction + gắn khóa
DO $$
DECLARE
  r RECORD;
  v_bo_id uuid;
  v_ten text;
  v_suffix int;
  v_candidate text;
BEGIN
  FOR r IN
    SELECT
      k.id AS khoa_id,
      k.id_to_chuc,
      k.ten_khoa_hoc
    FROM public.org_khoa_hoc k
    WHERE k.id_bo_giao_trinh IS NULL
      AND EXISTS (
        SELECT 1
        FROM public.org_bai_tap bt
        WHERE bt.id_khoa_hoc = k.id
          AND COALESCE(bt.visible, true) = true
      )
  LOOP
    v_ten := trim(r.ten_khoa_hoc);
    IF v_ten = '' THEN
      v_ten := 'Bộ giáo trình';
    END IF;

    v_candidate := v_ten;
    v_suffix := 1;
    WHILE EXISTS (
      SELECT 1
      FROM public.org_bo_giao_trinh b
      WHERE b.id_to_chuc = r.id_to_chuc
        AND lower(b.ten_bo) = lower(v_candidate)
    ) LOOP
      v_suffix := v_suffix + 1;
      v_candidate := v_ten || ' (' || v_suffix::text || ')';
    END LOOP;

    INSERT INTO public.org_bo_giao_trinh (id_to_chuc, ten_bo, thu_tu)
    VALUES (r.id_to_chuc, v_candidate, 0)
    RETURNING id INTO v_bo_id;

    INSERT INTO public.org_giao_trinh_bai (id_bo, id_bai_tap, thuoc_tinh, thu_tu)
    SELECT
      v_bo_id,
      bt.id,
      'bai_tap'::public.loai_bai_giao_trinh_enum,
      COALESCE(bt.thu_tu, 0)
    FROM public.org_bai_tap bt
    WHERE bt.id_khoa_hoc = r.khoa_id
      AND COALESCE(bt.visible, true) = true
    ON CONFLICT (id_bo, id_bai_tap) DO NOTHING;

    UPDATE public.org_khoa_hoc
    SET id_bo_giao_trinh = v_bo_id
    WHERE id = r.khoa_id;
  END LOOP;
END $$;

-- 7. RLS bộ + junction
ALTER TABLE public.org_bo_giao_trinh ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_giao_trinh_bai ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_bo_giao_trinh_select_public ON public.org_bo_giao_trinh;
CREATE POLICY org_bo_giao_trinh_select_public ON public.org_bo_giao_trinh
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_to_chuc o
      WHERE o.id = org_bo_giao_trinh.id_to_chuc
        AND o.loai_to_chuc = 'co_so_dao_tao'::public.loai_to_chuc_enum
    )
  );

DROP POLICY IF EXISTS org_bo_giao_trinh_write_admin ON public.org_bo_giao_trinh;
CREATE POLICY org_bo_giao_trinh_write_admin ON public.org_bo_giao_trinh
  FOR ALL
  TO authenticated
  USING (public.is_admin_to_chuc(public.current_profile_id(), id_to_chuc))
  WITH CHECK (public.is_admin_to_chuc(public.current_profile_id(), id_to_chuc));

DROP POLICY IF EXISTS org_giao_trinh_bai_select_public ON public.org_giao_trinh_bai;
CREATE POLICY org_giao_trinh_bai_select_public ON public.org_giao_trinh_bai
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_bo_giao_trinh b
      JOIN public.org_to_chuc o ON o.id = b.id_to_chuc
      WHERE b.id = org_giao_trinh_bai.id_bo
        AND o.loai_to_chuc = 'co_so_dao_tao'::public.loai_to_chuc_enum
    )
  );

DROP POLICY IF EXISTS org_giao_trinh_bai_write_admin ON public.org_giao_trinh_bai;
CREATE POLICY org_giao_trinh_bai_write_admin ON public.org_giao_trinh_bai
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_bo_giao_trinh b
      WHERE b.id = org_giao_trinh_bai.id_bo
        AND public.is_admin_to_chuc(public.current_profile_id(), b.id_to_chuc)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.org_bo_giao_trinh b
      WHERE b.id = org_giao_trinh_bai.id_bo
        AND public.is_admin_to_chuc(public.current_profile_id(), b.id_to_chuc)
    )
  );

-- Cập nhật RLS org_bai_tap theo id_to_chuc (module không bắt buộc có khóa)
DROP POLICY IF EXISTS org_bai_tap_select_public ON public.org_bai_tap;
CREATE POLICY org_bai_tap_select_public ON public.org_bai_tap
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_to_chuc o
      WHERE o.id = org_bai_tap.id_to_chuc
        AND o.loai_to_chuc = 'co_so_dao_tao'::public.loai_to_chuc_enum
    )
  );

DROP POLICY IF EXISTS org_bai_tap_write_admin ON public.org_bai_tap;
CREATE POLICY org_bai_tap_write_admin ON public.org_bai_tap
  FOR ALL
  TO authenticated
  USING (public.is_admin_to_chuc(public.current_profile_id(), id_to_chuc))
  WITH CHECK (public.is_admin_to_chuc(public.current_profile_id(), id_to_chuc));

COMMIT;
