-- Junction lớp ↔ chi nhánh (N chi nhánh / lớp).
-- Idempotent. Giữ org_lop_hoc.id_chi_nhanh làm chi nhánh chính (= phần tử đầu).
-- Plan: docs/PLAN_hinh_thuc_ve_lop.md Phase 0.

CREATE TABLE IF NOT EXISTS public.org_lop_hoc_chi_nhanh (
  id_lop_hoc    uuid NOT NULL
                  REFERENCES public.org_lop_hoc(id) ON DELETE CASCADE,
  id_chi_nhanh  uuid NOT NULL
                  REFERENCES public.org_chi_nhanh(id) ON DELETE CASCADE,
  thu_tu        int4 NOT NULL DEFAULT 0,
  tao_luc       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id_lop_hoc, id_chi_nhanh)
);

COMMENT ON TABLE public.org_lop_hoc_chi_nhanh IS
  'Chi nhánh gắn lớp (offline/kết hợp). id_chi_nhanh trên org_lop_hoc = chính (thu_tu 0).';

CREATE INDEX IF NOT EXISTS idx_lop_chi_nhanh_chi_nhanh
  ON public.org_lop_hoc_chi_nhanh (id_chi_nhanh);

-- Backfill từ cột FK đơn sẵn có.
INSERT INTO public.org_lop_hoc_chi_nhanh (id_lop_hoc, id_chi_nhanh, thu_tu)
SELECT l.id, l.id_chi_nhanh, 0
FROM public.org_lop_hoc l
WHERE l.id_chi_nhanh IS NOT NULL
ON CONFLICT (id_lop_hoc, id_chi_nhanh) DO NOTHING;

ALTER TABLE public.org_lop_hoc_chi_nhanh ENABLE ROW LEVEL SECURITY;
