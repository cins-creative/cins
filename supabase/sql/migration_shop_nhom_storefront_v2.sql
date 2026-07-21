-- =====================================================================
-- migration_shop_nhom_storefront_v2.sql
-- L33: ảnh loại hàng (shop_nhom.anh_id) + buyer review (shop_nhom_danh_gia)
-- Idempotent. CINs ospzzzxcomrmhqrnkoiw.
-- =====================================================================

ALTER TABLE public.shop_nhom
  ADD COLUMN IF NOT EXISTS anh_id text;

COMMENT ON COLUMN public.shop_nhom.anh_id IS
  'Cloudflare Images id — ảnh card loại hàng trên /{slug}/shop.';

CREATE TABLE IF NOT EXISTS public.shop_nhom_danh_gia (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_nhom         uuid NOT NULL
                    REFERENCES public.shop_nhom(id) ON DELETE CASCADE,
  id_nguoi_dung   uuid NOT NULL
                    REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  id_don_hang     uuid NOT NULL
                    REFERENCES public.shop_don_hang(id) ON DELETE RESTRICT,
  diem            smallint NOT NULL
                    CHECK (diem >= 1 AND diem <= 5),
  noi_dung        text,
  anh_ids         text[] NOT NULL DEFAULT '{}',
  da_xoa          boolean NOT NULL DEFAULT false,
  tao_luc         timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shop_nhom_danh_gia_noi_dung_len
    CHECK (noi_dung IS NULL OR char_length(noi_dung) <= 2000),
  CONSTRAINT shop_nhom_danh_gia_anh_len
    CHECK (cardinality(anh_ids) <= 6)
);

COMMENT ON TABLE public.shop_nhom_danh_gia IS
  'L33: đánh giá loại hàng — chỉ buyer đã mua (verified purchase); shop không tự đăng.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_shop_nhom_danh_gia_buyer_nhom
  ON public.shop_nhom_danh_gia (id_nhom, id_nguoi_dung)
  WHERE da_xoa = false;

CREATE INDEX IF NOT EXISTS idx_shop_nhom_danh_gia_nhom
  ON public.shop_nhom_danh_gia (id_nhom, tao_luc DESC)
  WHERE da_xoa = false;

ALTER TABLE public.shop_nhom_danh_gia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shop_nhom_danh_gia_doc ON public.shop_nhom_danh_gia;
CREATE POLICY shop_nhom_danh_gia_doc ON public.shop_nhom_danh_gia
  FOR SELECT
  USING (
    da_xoa = false
    AND EXISTS (
      SELECT 1
      FROM public.shop_nhom n
      JOIN public.user_nguoi_dung u ON u.id = n.id_nguoi_dung
      WHERE n.id = id_nhom
        AND n.da_xoa = false
        AND (
          n.id_nguoi_dung = public.current_profile_id()
          OR (u.ban_hang_bat = true AND u.shop_hien_thi = true)
        )
    )
  );

DROP POLICY IF EXISTS shop_nhom_danh_gia_buyer_insert ON public.shop_nhom_danh_gia;
CREATE POLICY shop_nhom_danh_gia_buyer_insert ON public.shop_nhom_danh_gia
  FOR INSERT
  WITH CHECK (
    id_nguoi_dung = public.current_profile_id()
    AND EXISTS (
      SELECT 1
      FROM public.shop_nhom n
      WHERE n.id = id_nhom
        AND n.da_xoa = false
        AND n.id_nguoi_dung <> public.current_profile_id()
    )
    AND EXISTS (
      SELECT 1
      FROM public.shop_don_hang d
      JOIN public.shop_don_hang_dong dd ON dd.id_don_hang = d.id
      JOIN public.shop_bien_the bt ON bt.id = dd.id_bien_the
      JOIN public.shop_san_pham sp ON sp.id = bt.id_san_pham
      JOIN public.shop_nhom n ON n.id = id_nhom
      WHERE d.id = id_don_hang
        AND d.id_nguoi_mua = public.current_profile_id()
        AND d.id_nguoi_ban = n.id_nguoi_dung
        AND d.trang_thai IN ('da_nhan_tien', 'da_giao_tai_su_kien')
        AND sp.id_nhom = id_nhom
        AND sp.da_xoa = false
    )
  );

DROP POLICY IF EXISTS shop_nhom_danh_gia_buyer_update ON public.shop_nhom_danh_gia;
CREATE POLICY shop_nhom_danh_gia_buyer_update ON public.shop_nhom_danh_gia
  FOR UPDATE
  USING (id_nguoi_dung = public.current_profile_id())
  WITH CHECK (id_nguoi_dung = public.current_profile_id());
