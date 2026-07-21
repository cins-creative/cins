-- Catalog loại vé sự kiện (phase 1 — hiển thị, chưa bán/thanh toán).
-- Chạy trên Supabase SQL Editor (idempotent).

CREATE TABLE IF NOT EXISTS public.org_su_kien_loai_ve (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_su_kien uuid NOT NULL REFERENCES public.org_su_kien(id) ON DELETE CASCADE,
  ten text NOT NULL,
  mo_ta text NULL,
  gia integer NOT NULL CHECK (gia >= 0),
  cover_id text NULL,
  thu_tu integer NOT NULL DEFAULT 0,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS org_su_kien_loai_ve_su_kien_thu_tu_idx
  ON public.org_su_kien_loai_ve (id_su_kien, thu_tu);

COMMENT ON TABLE public.org_su_kien_loai_ve IS
  'Catalog loại vé gắn org_su_kien — ảnh/mô tả/giá; chưa bán trên CINs.';
COMMENT ON COLUMN public.org_su_kien_loai_ve.gia IS
  'Giá VND (>=0). 0 = hạng miễn phí trong sự kiện tính phí.';
COMMENT ON COLUMN public.org_su_kien_loai_ve.cover_id IS
  'Cloudflare Images id — cùng nếp cover sự kiện.';
COMMENT ON COLUMN public.org_su_kien.gia_ve IS
  'Denormalize: min(gia) các loại vé khi tính phí; null nếu miễn phí / chưa có loại.';

-- Backfill: sự kiện tính phí đã có gia_ve → 1 loại «Vé thường».
INSERT INTO public.org_su_kien_loai_ve (id_su_kien, ten, mo_ta, gia, thu_tu)
SELECT
  sk.id,
  'Vé thường',
  NULL,
  sk.gia_ve,
  0
FROM public.org_su_kien sk
WHERE sk.mien_phi = false
  AND sk.gia_ve IS NOT NULL
  AND sk.gia_ve >= 0
  AND NOT EXISTS (
    SELECT 1 FROM public.org_su_kien_loai_ve v WHERE v.id_su_kien = sk.id
  );

ALTER TABLE public.org_su_kien_loai_ve ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_su_kien_loai_ve_select_public ON public.org_su_kien_loai_ve;
CREATE POLICY org_su_kien_loai_ve_select_public ON public.org_su_kien_loai_ve
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS org_su_kien_loai_ve_write_admin ON public.org_su_kien_loai_ve;
CREATE POLICY org_su_kien_loai_ve_write_admin ON public.org_su_kien_loai_ve
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_su_kien sk
      WHERE sk.id = org_su_kien_loai_ve.id_su_kien
        AND public.is_admin_to_chuc(public.current_profile_id(), sk.id_to_chuc)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.org_su_kien sk
      WHERE sk.id = org_su_kien_loai_ve.id_su_kien
        AND public.is_admin_to_chuc(public.current_profile_id(), sk.id_to_chuc)
    )
  );

GRANT SELECT ON public.org_su_kien_loai_ve TO anon, authenticated;
GRANT ALL ON public.org_su_kien_loai_ve TO service_role;
