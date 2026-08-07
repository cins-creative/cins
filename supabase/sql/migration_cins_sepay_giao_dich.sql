-- CINs SePay: log thô giao dịch + view đối soát
-- Plan: docs/PLAN_sepay_cins.md
-- Target: CINS ospzzzxcomrmhqrnkoiw
-- Chạy: npm run migrate:cins-sepay
-- Idempotent. Chỉ CREATE — không ALTER bảng live.

-- ═══════════════════════════════════════════════════════════════
-- 1. cins_sepay_giao_dich
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.cins_sepay_giao_dich (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sepay_id            text NOT NULL,
  gateway             text,
  so_tai_khoan        text,
  tai_khoan_nguon     text,
  loai_chuyen         text NOT NULL
                        CHECK (loai_chuyen IN ('in', 'out')),
  so_tien_vnd         bigint NOT NULL CHECK (so_tien_vnd >= 0),
  noi_dung            text,
  ma_trich_xuat       text,
  ma_he               text NOT NULL
                        CHECK (ma_he IN ('cins', 'sineart', 'khac')),
  id_thanh_toan       uuid
                        REFERENCES public.cins_thanh_toan(id) ON DELETE SET NULL,
  trang_thai_xu_ly    text NOT NULL DEFAULT 'cho'
                        CHECK (trang_thai_xu_ly IN (
                          'cho', 'da_khop', 'khong_khop', 'bo_qua', 'loi'
                        )),
  ghi_chu_xu_ly       text,
  raw_webhook         jsonb,
  nhan_luc            timestamptz NOT NULL DEFAULT now(),
  tao_luc             timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cins_sepay_giao_dich_sepay
  ON public.cins_sepay_giao_dich (sepay_id);

CREATE INDEX IF NOT EXISTS idx_cins_sepay_giao_dich_ma
  ON public.cins_sepay_giao_dich (ma_trich_xuat)
  WHERE ma_trich_xuat IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cins_sepay_giao_dich_tt_nhan
  ON public.cins_sepay_giao_dich (trang_thai_xu_ly, nhan_luc DESC);

CREATE INDEX IF NOT EXISTS idx_cins_sepay_giao_dich_he_nhan
  ON public.cins_sepay_giao_dich (ma_he, nhan_luc DESC);

CREATE INDEX IF NOT EXISTS idx_cins_sepay_giao_dich_tien_cho
  ON public.cins_sepay_giao_dich (so_tien_vnd, nhan_luc DESC)
  WHERE trang_thai_xu_ly = 'cho';

ALTER TABLE public.cins_sepay_giao_dich ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.cins_sepay_giao_dich FROM anon, authenticated;
GRANT ALL ON TABLE public.cins_sepay_giao_dich TO service_role;

-- ═══════════════════════════════════════════════════════════════
-- 2. View đối soát (admin) — lọc sineart
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.cins_sepay_doi_soat
  WITH (security_invoker = true)
AS
SELECT
  g.id,
  g.sepay_id,
  g.nhan_luc,
  g.so_tien_vnd,
  g.ma_trich_xuat,
  g.ma_he,
  g.trang_thai_xu_ly,
  g.ghi_chu_xu_ly,
  g.id_thanh_toan,
  t.con_lai_vnd,
  COALESCE(
    (
      SELECT SUM(pb.so_tien_vnd)::bigint
      FROM public.cins_phan_bo pb
      WHERE pb.id_thanh_toan = g.id_thanh_toan
    ),
    0
  ) AS da_phan_bo_vnd,
  (
    SELECT hd.ma_tham_chieu
    FROM public.cins_phan_bo pb
    JOIN public.cins_hoa_don hd ON hd.id = pb.id_hoa_don
    WHERE pb.id_thanh_toan = g.id_thanh_toan
    ORDER BY pb.tao_luc ASC
    LIMIT 1
  ) AS hoa_don_ma
FROM public.cins_sepay_giao_dich g
LEFT JOIN public.cins_thanh_toan t ON t.id = g.id_thanh_toan
WHERE g.ma_he <> 'sineart';

REVOKE ALL ON public.cins_sepay_doi_soat FROM anon, authenticated;
GRANT SELECT ON public.cins_sepay_doi_soat TO service_role;
