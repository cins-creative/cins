-- Bài tập khóa học cơ sở (org_bai_tap) + chế độ hiển thị trên org_khoa_hoc
-- Chạy trên Supabase SQL Editor (idempotent).

CREATE TABLE IF NOT EXISTS public.org_bai_tap (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_khoa_hoc uuid NOT NULL REFERENCES public.org_khoa_hoc(id) ON DELETE CASCADE,
  id_giao_trinh uuid NULL REFERENCES public.org_giao_trinh(id) ON DELETE SET NULL,
  ten_bai_tap text NOT NULL,
  mo_ta text NULL,
  video_youtube_url text NULL,
  thumbnail_url text NULL,
  visible boolean NOT NULL DEFAULT true,
  thu_tu integer NOT NULL DEFAULT 0,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS org_bai_tap_khoa_thu_tu_idx
  ON public.org_bai_tap (id_khoa_hoc, thu_tu);

ALTER TABLE public.org_khoa_hoc
  ADD COLUMN IF NOT EXISTS bai_tap_hien_thi text NOT NULL DEFAULT 'day_du';

ALTER TABLE public.org_bai_tap ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_bai_tap_select_public ON public.org_bai_tap;
CREATE POLICY org_bai_tap_select_public ON public.org_bai_tap
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_khoa_hoc k
      JOIN public.org_to_chuc o ON o.id = k.id_to_chuc
      WHERE k.id = org_bai_tap.id_khoa_hoc
        AND o.loai_to_chuc = 'co_so_dao_tao'::public.loai_to_chuc_enum
    )
  );

DROP POLICY IF EXISTS org_bai_tap_write_admin ON public.org_bai_tap;
CREATE POLICY org_bai_tap_write_admin ON public.org_bai_tap
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_khoa_hoc k
      WHERE k.id = org_bai_tap.id_khoa_hoc
        AND public.is_admin_to_chuc(public.current_profile_id(), k.id_to_chuc)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.org_khoa_hoc k
      WHERE k.id = org_bai_tap.id_khoa_hoc
        AND public.is_admin_to_chuc(public.current_profile_id(), k.id_to_chuc)
    )
  );
