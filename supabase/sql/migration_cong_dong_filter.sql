-- Cộng đồng — nhãn lọc feed (Reddit flair-style, 1 feed chung).
-- Canonical schema: loai_context + id_context (đồng bộ content_thao_luan).
-- Idempotent — bỏ qua nếu bảng/RLS đã có từ migration trước.

CREATE TABLE IF NOT EXISTS public.content_thao_luan_filter (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loai_context text NOT NULL DEFAULT 'cong_dong',
  id_context   uuid NOT NULL,
  ten          text NOT NULL,
  slug         text NOT NULL,
  mau          text NOT NULL DEFAULT '#1F74C9',
  icon         text,
  thu_tu       smallint NOT NULL DEFAULT 0,
  tao_luc      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (loai_context, id_context, slug)
);

CREATE INDEX IF NOT EXISTS idx_filter_context
  ON public.content_thao_luan_filter (loai_context, id_context, thu_tu);

COMMENT ON TABLE public.content_thao_luan_filter IS
  'Nhãn taxonomy do admin cộng đồng định nghĩa — lọc trên 1 feed chung';

CREATE TABLE IF NOT EXISTS public.content_thao_luan_filter_gan (
  id_thao_luan uuid NOT NULL REFERENCES public.content_thao_luan(id) ON DELETE CASCADE,
  id_filter    uuid NOT NULL REFERENCES public.content_thao_luan_filter(id) ON DELETE CASCADE,
  PRIMARY KEY (id_thao_luan, id_filter)
);

CREATE INDEX IF NOT EXISTS idx_thao_luan_filter_gan_filter
  ON public.content_thao_luan_filter_gan (id_filter, id_thao_luan);

ALTER TABLE public.content_thao_luan_filter ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_thao_luan_filter_gan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS filter_select ON public.content_thao_luan_filter;
CREATE POLICY filter_select ON public.content_thao_luan_filter
  FOR SELECT
  USING (
    loai_context <> 'cong_dong'
    OR cong_dong_cong_khai(id_context)
    OR is_thanh_vien_to_chuc(current_profile_id(), id_context)
  );

DROP POLICY IF EXISTS filter_write ON public.content_thao_luan_filter;
CREATE POLICY filter_write ON public.content_thao_luan_filter
  FOR ALL
  USING (
    loai_context = 'cong_dong'
    AND is_admin_to_chuc(current_profile_id(), id_context)
  )
  WITH CHECK (
    loai_context = 'cong_dong'
    AND is_admin_to_chuc(current_profile_id(), id_context)
  );

DROP POLICY IF EXISTS filter_gan_select ON public.content_thao_luan_filter_gan;
CREATE POLICY filter_gan_select ON public.content_thao_luan_filter_gan
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.content_thao_luan t
      WHERE t.id = id_thao_luan
        AND t.da_xoa = false
        AND (
          t.loai_context <> 'cong_dong'
          OR cong_dong_cong_khai(t.id_context)
          OR is_thanh_vien_to_chuc(current_profile_id(), t.id_context)
        )
    )
  );

DROP POLICY IF EXISTS filter_gan_write ON public.content_thao_luan_filter_gan;
CREATE POLICY filter_gan_write ON public.content_thao_luan_filter_gan
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.content_thao_luan t
      WHERE t.id = id_thao_luan
        AND (
          t.nguoi_dang = current_profile_id()
          OR (
            t.loai_context = 'cong_dong'
            AND is_admin_to_chuc(current_profile_id(), t.id_context)
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.content_thao_luan t
      WHERE t.id = id_thao_luan
        AND t.nguoi_dang = current_profile_id()
        AND is_thanh_vien_to_chuc(current_profile_id(), t.id_context)
    )
  );
