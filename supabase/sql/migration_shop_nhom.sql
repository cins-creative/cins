-- =====================================================================
-- migration_shop_nhom.sql — L33: nhóm phân loại có mô tả (entity riêng)
-- Idempotent. CINs ospzzzxcomrmhqrnkoiw.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.shop_nhom (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_nguoi_dung uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  -- 1 = phân loại 1 (group storefront); 2 = phân loại 2
  truc          smallint NOT NULL CHECK (truc IN (1, 2)),
  nhan          text NOT NULL,
  mo_ta         text,
  thu_tu        integer NOT NULL DEFAULT 0,
  da_xoa        boolean NOT NULL DEFAULT false,
  tao_luc       timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shop_nhom_nhan_len CHECK (char_length(btrim(nhan)) > 0 AND char_length(nhan) <= 40),
  CONSTRAINT shop_nhom_mo_ta_len CHECK (mo_ta IS NULL OR char_length(mo_ta) <= 280)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_shop_nhom_owner_truc_nhan
  ON public.shop_nhom (id_nguoi_dung, truc, nhan)
  WHERE da_xoa = false;

CREATE INDEX IF NOT EXISTS idx_shop_nhom_owner_truc
  ON public.shop_nhom (id_nguoi_dung, truc, thu_tu, nhan)
  WHERE da_xoa = false;

COMMENT ON TABLE public.shop_nhom IS
  'L33: nhóm phân loại sản phẩm (entity) — nhãn + mô tả ngắn; SP gắn qua id_nhom / id_nhom_2.';

COMMENT ON COLUMN public.shop_nhom.truc IS
  '1 = trục phân loại 1 (layout group storefront); 2 = trục phân loại 2.';

COMMENT ON COLUMN public.shop_nhom.mo_ta IS
  'Mô tả ngắn hiện dưới tiêu đề nhóm trên /{slug}/shop.';

-- FK trên sản phẩm
ALTER TABLE public.shop_san_pham
  ADD COLUMN IF NOT EXISTS id_nhom uuid REFERENCES public.shop_nhom(id) ON DELETE SET NULL;

ALTER TABLE public.shop_san_pham
  ADD COLUMN IF NOT EXISTS id_nhom_2 uuid REFERENCES public.shop_nhom(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shop_san_pham_id_nhom
  ON public.shop_san_pham (id_nhom)
  WHERE da_xoa = false AND id_nhom IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shop_san_pham_id_nhom_2
  ON public.shop_san_pham (id_nhom_2)
  WHERE da_xoa = false AND id_nhom_2 IS NOT NULL;

COMMENT ON COLUMN public.shop_san_pham.id_nhom IS
  'FK shop_nhom truc=1. phan_loai text giữ denormalized = nhom.nhan.';

COMMENT ON COLUMN public.shop_san_pham.id_nhom_2 IS
  'FK shop_nhom truc=2. phan_loai_2 text giữ denormalized = nhom.nhan.';

-- Backfill nhóm từ nhãn text hiện có
INSERT INTO public.shop_nhom (id_nguoi_dung, truc, nhan)
SELECT DISTINCT sp.id_nguoi_dung, 1, btrim(sp.phan_loai)
FROM public.shop_san_pham sp
WHERE sp.da_xoa = false
  AND sp.phan_loai IS NOT NULL
  AND btrim(sp.phan_loai) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.shop_nhom n
    WHERE n.id_nguoi_dung = sp.id_nguoi_dung
      AND n.truc = 1
      AND n.nhan = btrim(sp.phan_loai)
      AND n.da_xoa = false
  );

INSERT INTO public.shop_nhom (id_nguoi_dung, truc, nhan)
SELECT DISTINCT sp.id_nguoi_dung, 2, btrim(sp.phan_loai_2)
FROM public.shop_san_pham sp
WHERE sp.da_xoa = false
  AND sp.phan_loai_2 IS NOT NULL
  AND btrim(sp.phan_loai_2) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.shop_nhom n
    WHERE n.id_nguoi_dung = sp.id_nguoi_dung
      AND n.truc = 2
      AND n.nhan = btrim(sp.phan_loai_2)
      AND n.da_xoa = false
  );

-- Gắn FK
UPDATE public.shop_san_pham sp
SET id_nhom = n.id,
    cap_nhat_luc = now()
FROM public.shop_nhom n
WHERE sp.id_nhom IS NULL
  AND sp.da_xoa = false
  AND sp.phan_loai IS NOT NULL
  AND n.id_nguoi_dung = sp.id_nguoi_dung
  AND n.truc = 1
  AND n.nhan = btrim(sp.phan_loai)
  AND n.da_xoa = false;

UPDATE public.shop_san_pham sp
SET id_nhom_2 = n.id,
    cap_nhat_luc = now()
FROM public.shop_nhom n
WHERE sp.id_nhom_2 IS NULL
  AND sp.da_xoa = false
  AND sp.phan_loai_2 IS NOT NULL
  AND n.id_nguoi_dung = sp.id_nguoi_dung
  AND n.truc = 2
  AND n.nhan = btrim(sp.phan_loai_2)
  AND n.da_xoa = false;

-- RLS
ALTER TABLE public.shop_nhom ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shop_nhom_owner ON public.shop_nhom;
CREATE POLICY shop_nhom_owner ON public.shop_nhom
  FOR ALL
  USING (id_nguoi_dung = public.current_profile_id())
  WITH CHECK (id_nguoi_dung = public.current_profile_id());

DROP POLICY IF EXISTS shop_nhom_doc_cong_khai ON public.shop_nhom;
CREATE POLICY shop_nhom_doc_cong_khai ON public.shop_nhom
  FOR SELECT
  USING (da_xoa = false);
