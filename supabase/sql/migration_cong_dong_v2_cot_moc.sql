-- Cộng đồng v2: post = content_cot_moc (che_do_hien_thi='cong_dong'), bỏ content_thao_luan*.
-- Chạy 2 bước nếu enum mới cần commit riêng; file này idempotent where possible.

-- ── Bước 1: enum + cột mốc ────────────────────────────────────────────────

ALTER TYPE public.che_do_hien_thi_moc_enum ADD VALUE IF NOT EXISTS 'cong_dong';

ALTER TABLE public.content_cot_moc
  ADD COLUMN IF NOT EXISTS ghim boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_cot_moc_cong_dong_org
  ON public.content_cot_moc (id_to_chuc, che_do_hien_thi)
  WHERE che_do_hien_thi = 'cong_dong'::public.che_do_hien_thi_moc_enum
    AND id_to_chuc IS NOT NULL;

COMMENT ON COLUMN public.content_cot_moc.ghim IS
  'Ghim trên feed cộng đồng (admin). Chỉ meaningful khi che_do_hien_thi=cong_dong.';

-- ── Bước 2: rename filter + junction mới ──────────────────────────────────

ALTER TABLE IF EXISTS public.content_thao_luan_filter
  RENAME TO cong_dong_filter;

CREATE TABLE IF NOT EXISTS public.cong_dong_filter_gan (
  id_cot_moc uuid NOT NULL REFERENCES public.content_cot_moc(id) ON DELETE CASCADE,
  id_filter  uuid NOT NULL REFERENCES public.cong_dong_filter(id) ON DELETE CASCADE,
  PRIMARY KEY (id_cot_moc, id_filter)
);

CREATE INDEX IF NOT EXISTS idx_cong_dong_filter_gan_filter
  ON public.cong_dong_filter_gan (id_filter, id_cot_moc);

COMMENT ON TABLE public.cong_dong_filter IS
  'Nhãn flair cộng đồng (rename từ content_thao_luan_filter)';

COMMENT ON TABLE public.cong_dong_filter_gan IS
  'Gắn nhãn flair lên cột mốc cộng đồng (content_cot_moc che_do_hien_thi=cong_dong)';

-- Drop junction cũ + bảng thao_luan (CASCADE comment/reaction trên thao_luan id cũ)
DROP TABLE IF EXISTS public.content_thao_luan_filter_gan CASCADE;
DROP TABLE IF EXISTS public.content_thao_luan_media CASCADE;
DROP TABLE IF EXISTS public.content_thao_luan CASCADE;

-- ── RLS cong_dong_filter_gan ──────────────────────────────────────────────

ALTER TABLE public.cong_dong_filter_gan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cong_dong_filter_gan_select ON public.cong_dong_filter_gan;
CREATE POLICY cong_dong_filter_gan_select ON public.cong_dong_filter_gan
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.content_cot_moc m
      WHERE m.id = id_cot_moc
        AND m.che_do_hien_thi = 'cong_dong'::public.che_do_hien_thi_moc_enum
        AND m.id_to_chuc IS NOT NULL
        AND (
          cong_dong_cong_khai(m.id_to_chuc)
          OR is_thanh_vien_to_chuc(current_profile_id(), m.id_to_chuc)
        )
    )
  );

DROP POLICY IF EXISTS cong_dong_filter_gan_write ON public.cong_dong_filter_gan;
CREATE POLICY cong_dong_filter_gan_write ON public.cong_dong_filter_gan
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.content_cot_moc m
      WHERE m.id = id_cot_moc
        AND m.che_do_hien_thi = 'cong_dong'::public.che_do_hien_thi_moc_enum
        AND (
          m.id_nguoi_dung = current_profile_id()
          OR is_admin_to_chuc(current_profile_id(), m.id_to_chuc)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.content_cot_moc m
      WHERE m.id = id_cot_moc
        AND m.che_do_hien_thi = 'cong_dong'::public.che_do_hien_thi_moc_enum
        AND m.id_nguoi_dung = current_profile_id()
        AND is_thanh_vien_to_chuc(current_profile_id(), m.id_to_chuc)
    )
  );

-- Cập nhật policy cong_dong_filter (tên bảng đã rename)
DROP POLICY IF EXISTS filter_select ON public.cong_dong_filter;
CREATE POLICY filter_select ON public.cong_dong_filter
  FOR SELECT
  USING (
    loai_context <> 'cong_dong'
    OR cong_dong_cong_khai(id_context)
    OR is_thanh_vien_to_chuc(current_profile_id(), id_context)
  );

DROP POLICY IF EXISTS filter_write ON public.cong_dong_filter;
CREATE POLICY filter_write ON public.cong_dong_filter
  FOR ALL
  USING (
    loai_context = 'cong_dong'
    AND is_admin_to_chuc(current_profile_id(), id_context)
  )
  WITH CHECK (
    loai_context = 'cong_dong'
    AND is_admin_to_chuc(current_profile_id(), id_context)
  );
