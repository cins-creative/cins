-- Phân quyền cấp hệ thống CINs (admin / curator / thành viên).
-- super_admin suy từ email info.cins.vn@gmail.com trong app — KHÔNG lưu bảng này.
-- Chạy trên Supabase SQL Editor (idempotent).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'vai_tro_he_thong_enum' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.vai_tro_he_thong_enum AS ENUM (
      'admin',
      'curator',
      'thanh_vien'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_quyen_he_thong (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_nguoi_dung  uuid NOT NULL UNIQUE REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  vai_tro        public.vai_tro_he_thong_enum NOT NULL,
  cap_boi        uuid REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  tao_luc        timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_quyen_he_thong_vai_tro_not_thanh_vien
    CHECK (vai_tro IN ('admin', 'curator'))
);

COMMENT ON TABLE public.user_quyen_he_thong IS
  'Vai trò hệ thống CINs. thanh_vien = không có dòng. super_admin = email cố định app.';

CREATE INDEX IF NOT EXISTS idx_user_quyen_he_thong_vai_tro
  ON public.user_quyen_he_thong (vai_tro);

ALTER TABLE public.user_quyen_he_thong ENABLE ROW LEVEL SECURITY;

-- Không policy: chỉ service role (admin panel) truy cập.
