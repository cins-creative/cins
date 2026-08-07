-- CINs: bảng thông báo phí sàn (hiển thị only — không auto áp dụng tỷ lệ)
-- Plan: docs/PLAN_thong_bao_phi_san.md
-- Chạy: npm run migrate:cins-phi-thong-bao
-- Idempotent. Chỉ CREATE.

CREATE TABLE IF NOT EXISTS public.cins_phi_thong_bao (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doi_tuong           text NOT NULL
                        CHECK (doi_tuong IN ('shop', 'csdt')),
  tieu_de             text NOT NULL,
  noi_dung            text NOT NULL,
  ty_le_du_kien       numeric(5, 4)
                        CHECK (ty_le_du_kien IS NULL OR (ty_le_du_kien >= 0 AND ty_le_du_kien <= 1)),
  hieu_luc_du_kien    date,
  cong_bo_luc         timestamptz,
  trang_thai          text NOT NULL DEFAULT 'nhap'
                        CHECK (trang_thai IN ('nhap', 'da_cong_bo', 'huy')),
  tao_boi             uuid,
  tao_luc             timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cins_phi_thong_bao_public
  ON public.cins_phi_thong_bao (doi_tuong, cong_bo_luc DESC)
  WHERE trang_thai = 'da_cong_bo';

CREATE INDEX IF NOT EXISTS idx_cins_phi_thong_bao_admin
  ON public.cins_phi_thong_bao (cap_nhat_luc DESC);

ALTER TABLE public.cins_phi_thong_bao ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.cins_phi_thong_bao FROM anon, authenticated;
GRANT ALL ON TABLE public.cins_phi_thong_bao TO service_role;
