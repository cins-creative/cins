-- Lần giới thiệu sản phẩm gần nhất theo loại hàng — cooldown 3 ngày / loại.
-- CREATE TABLE mới (không ALTER shop_nhom).

CREATE TABLE IF NOT EXISTS public.shop_nhom_gioi_thieu (
  id_nhom     uuid PRIMARY KEY REFERENCES public.shop_nhom(id) ON DELETE CASCADE,
  id_cot_moc  uuid REFERENCES public.content_cot_moc(id) ON DELETE SET NULL,
  tao_luc     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.shop_nhom_gioi_thieu IS
  'Mốc lần đăng «Giới thiệu sản phẩm» gần nhất — cooldown 3 ngày / loại hàng.';

CREATE INDEX IF NOT EXISTS idx_shop_nhom_gioi_thieu_tao_luc
  ON public.shop_nhom_gioi_thieu (tao_luc DESC);

ALTER TABLE public.shop_nhom_gioi_thieu ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shop_nhom_gioi_thieu_owner ON public.shop_nhom_gioi_thieu;
CREATE POLICY shop_nhom_gioi_thieu_owner ON public.shop_nhom_gioi_thieu
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.shop_nhom n
      WHERE n.id = id_nhom
        AND n.id_nguoi_dung = public.current_profile_id()
        AND n.da_xoa = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shop_nhom n
      WHERE n.id = id_nhom
        AND n.id_nguoi_dung = public.current_profile_id()
        AND n.da_xoa = false
    )
  );
