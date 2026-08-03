-- Gói học phí ↔ nhiều khóa (N–N).
-- Backfill từ org_goi_hoc_phi.id_khoa_hoc (cột legacy giữ làm “khóa chính”).

CREATE TABLE IF NOT EXISTS public.org_goi_hoc_phi_khoa (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_goi       uuid NOT NULL
                 REFERENCES public.org_goi_hoc_phi(id) ON DELETE CASCADE,
  id_khoa_hoc  uuid NOT NULL
                 REFERENCES public.org_khoa_hoc(id) ON DELETE CASCADE,
  tao_luc      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_org_goi_hoc_phi_khoa UNIQUE (id_goi, id_khoa_hoc)
);

COMMENT ON TABLE public.org_goi_hoc_phi_khoa IS
  'Gói học phí gắn nhiều khóa — VD gói 1 tháng Online cho Hình họa + Bố cục + Trang trí.';

CREATE INDEX IF NOT EXISTS idx_org_goi_hoc_phi_khoa_goi
  ON public.org_goi_hoc_phi_khoa (id_goi);
CREATE INDEX IF NOT EXISTS idx_org_goi_hoc_phi_khoa_khoa
  ON public.org_goi_hoc_phi_khoa (id_khoa_hoc);

INSERT INTO public.org_goi_hoc_phi_khoa (id_goi, id_khoa_hoc)
SELECT g.id, g.id_khoa_hoc
  FROM public.org_goi_hoc_phi g
 WHERE g.id_khoa_hoc IS NOT NULL
ON CONFLICT (id_goi, id_khoa_hoc) DO NOTHING;

ALTER TABLE public.org_goi_hoc_phi_khoa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_goi_hoc_phi_khoa_doc ON public.org_goi_hoc_phi_khoa;
CREATE POLICY org_goi_hoc_phi_khoa_doc ON public.org_goi_hoc_phi_khoa
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.org_goi_hoc_phi g
       WHERE g.id = id_goi
         AND g.dang_ban = true
    )
  );
