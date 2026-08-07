-- P2 — Hoá đơn hợp nhất (PLAN_thanh_toan_tai_cau_truc.md §5 P2)
-- Bảng mới: cins_hoa_don · cins_hoa_don_dong · cins_thanh_toan · cins_phan_bo
-- ALTER: org_phi_dong.id_hoa_don · shop_phi_dong.id_hoa_don (nullable)
-- ALTER: cins_cau_hinh_tai_chinh + shop_toi_thieu_xuat_ky_vnd · shop_nguong · so_ngay_an_han
-- Target: CINS ospzzzxcomrmhqrnkoiw
-- Chạy: npm run migrate:cins-hoa-don
-- Idempotent.

-- ═══════════════════════════════════════════════════════════════
-- 0. Tham số cấu hình (nullable → code fallback)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.cins_cau_hinh_tai_chinh
  ADD COLUMN IF NOT EXISTS shop_ty_le numeric(5, 4)
    CHECK (shop_ty_le IS NULL OR (shop_ty_le >= 0 AND shop_ty_le <= 1));

ALTER TABLE public.cins_cau_hinh_tai_chinh
  ADD COLUMN IF NOT EXISTS shop_nguong_kich_hoat_vnd bigint
    CHECK (shop_nguong_kich_hoat_vnd IS NULL OR shop_nguong_kich_hoat_vnd >= 0);

ALTER TABLE public.cins_cau_hinh_tai_chinh
  ADD COLUMN IF NOT EXISTS shop_toi_thieu_xuat_ky_vnd bigint
    CHECK (shop_toi_thieu_xuat_ky_vnd IS NULL OR shop_toi_thieu_xuat_ky_vnd >= 0);

ALTER TABLE public.cins_cau_hinh_tai_chinh
  ADD COLUMN IF NOT EXISTS so_ngay_han_tra int
    CHECK (so_ngay_han_tra IS NULL OR so_ngay_han_tra >= 0);

ALTER TABLE public.cins_cau_hinh_tai_chinh
  ADD COLUMN IF NOT EXISTS so_ngay_an_han_tu_khai int
    CHECK (so_ngay_an_han_tu_khai IS NULL OR so_ngay_an_han_tu_khai >= 0);

COMMENT ON COLUMN public.cins_cau_hinh_tai_chinh.shop_toi_thieu_xuat_ky_vnd IS
  'P2 B4 — không xuất kỳ shop nếu phí < ngưỡng (mặc định app 50000 nếu NULL).';

-- ═══════════════════════════════════════════════════════════════
-- 1. cins_hoa_don
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.cins_hoa_don (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_tk                 uuid NOT NULL
                          REFERENCES public.cins_tk_thanh_toan(id) ON DELETE CASCADE,
  id_dich_vu            uuid NOT NULL
                          REFERENCES public.cins_dich_vu(id) ON DELETE CASCADE,
  tu_ngay               date NOT NULL,
  den_ngay              date NOT NULL,
  ngay_chot             date NOT NULL,
  thong_bao_luc         timestamptz NOT NULL DEFAULT now(),
  han_tra               date NOT NULL,
  so_tien_vnd           bigint NOT NULL DEFAULT 0
                          CHECK (so_tien_vnd >= 0),
  dieu_chinh_vnd        bigint NOT NULL DEFAULT 0,
  da_tra_vnd            bigint NOT NULL DEFAULT 0
                          CHECK (da_tra_vnd >= 0),
  trang_thai            text NOT NULL DEFAULT 'chua_tra'
                          CHECK (trang_thai IN (
                            'chua_tra', 'da_tra', 'qua_han', 'mien',
                            'ngung_theo_doi'
                          )),
  ma_tham_chieu         text NOT NULL,
  tu_khai_da_tra_luc    timestamptz,
  so_hoa_don            text,
  xuat_hoa_don_luc      timestamptz,
  hoa_don_thong_tin     jsonb,
  /* Nguồn legacy để backfill / dual-write */
  nguon_bang            text
                          CHECK (nguon_bang IS NULL OR nguon_bang IN (
                            'org_phi_ky', 'shop_phi_ky'
                          )),
  nguon_id              uuid,
  tao_luc               timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cins_hoa_don_range_chk CHECK (den_ngay >= tu_ngay),
  CONSTRAINT cins_hoa_don_han_chk CHECK (han_tra >= ngay_chot)
);

COMMENT ON TABLE public.cins_hoa_don IS
  'Hoá đơn phí nền tảng hợp nhất (P2). han_tra từ thong_bao_luc + so_ngay_han_tra.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_cins_hoa_don_ma_tham_chieu
  ON public.cins_hoa_don (ma_tham_chieu);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cins_hoa_don_nguon
  ON public.cins_hoa_don (nguon_bang, nguon_id)
  WHERE nguon_bang IS NOT NULL AND nguon_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cins_hoa_don_tk_tt
  ON public.cins_hoa_don (id_tk, trang_thai, han_tra);

CREATE INDEX IF NOT EXISTS idx_cins_hoa_don_dv
  ON public.cins_hoa_don (id_dich_vu, ngay_chot DESC);

ALTER TABLE public.cins_hoa_don ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cins_hoa_don_select ON public.cins_hoa_don;
CREATE POLICY cins_hoa_don_select ON public.cins_hoa_don
  FOR SELECT TO authenticated
  USING (public.can_doc_cins_tk(id_tk));

GRANT SELECT ON TABLE public.cins_hoa_don TO authenticated;
GRANT ALL ON TABLE public.cins_hoa_don TO service_role;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.cins_hoa_don FROM authenticated;
REVOKE ALL ON TABLE public.cins_hoa_don FROM anon;

-- ═══════════════════════════════════════════════════════════════
-- 2. cins_hoa_don_dong
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.cins_hoa_don_dong (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_hoa_don      uuid NOT NULL
                    REFERENCES public.cins_hoa_don(id) ON DELETE CASCADE,
  nguon_loai      text NOT NULL,
  nguon_id        uuid,
  dien_giai       text,
  doanh_thu_vnd   bigint NOT NULL DEFAULT 0 CHECK (doanh_thu_vnd >= 0),
  ty_le           numeric(5, 4),
  phi_vnd         bigint NOT NULL DEFAULT 0,
  loai_tru        boolean NOT NULL DEFAULT false,
  tao_luc         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cins_hoa_don_dong_hd
  ON public.cins_hoa_don_dong (id_hoa_don);

ALTER TABLE public.cins_hoa_don_dong ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cins_hoa_don_dong_select ON public.cins_hoa_don_dong;
CREATE POLICY cins_hoa_don_dong_select ON public.cins_hoa_don_dong
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cins_hoa_don h
      WHERE h.id = id_hoa_don AND public.can_doc_cins_tk(h.id_tk)
    )
  );

GRANT SELECT ON TABLE public.cins_hoa_don_dong TO authenticated;
GRANT ALL ON TABLE public.cins_hoa_don_dong TO service_role;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.cins_hoa_don_dong FROM authenticated;
REVOKE ALL ON TABLE public.cins_hoa_don_dong FROM anon;

-- ═══════════════════════════════════════════════════════════════
-- 3. cins_thanh_toan (service-role only — PII/mask)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.cins_thanh_toan (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_tk             uuid
                      REFERENCES public.cins_tk_thanh_toan(id) ON DELETE SET NULL,
  nguon             text NOT NULL
                      CHECK (nguon IN ('sepay', 'the', 'gan_tay')),
  sepay_id          text,
  so_tien_vnd       bigint NOT NULL CHECK (so_tien_vnd >= 0),
  con_lai_vnd       bigint NOT NULL DEFAULT 0 CHECK (con_lai_vnd >= 0),
  noi_dung          text,
  tai_khoan_nguon   text,
  nhan_luc          timestamptz NOT NULL DEFAULT now(),
  tao_luc           timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cins_thanh_toan_sepay
  ON public.cins_thanh_toan (sepay_id)
  WHERE sepay_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cins_thanh_toan_tk
  ON public.cins_thanh_toan (id_tk, nhan_luc DESC);

ALTER TABLE public.cins_thanh_toan ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.cins_thanh_toan FROM anon, authenticated;
GRANT ALL ON TABLE public.cins_thanh_toan TO service_role;

-- ═══════════════════════════════════════════════════════════════
-- 4. cins_phan_bo
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.cins_phan_bo (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_thanh_toan     uuid NOT NULL
                      REFERENCES public.cins_thanh_toan(id) ON DELETE CASCADE,
  id_hoa_don        uuid NOT NULL
                      REFERENCES public.cins_hoa_don(id) ON DELETE CASCADE,
  so_tien_vnd       bigint NOT NULL CHECK (so_tien_vnd > 0),
  tao_luc           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cins_phan_bo_tt
  ON public.cins_phan_bo (id_thanh_toan);

CREATE INDEX IF NOT EXISTS idx_cins_phan_bo_hd
  ON public.cins_phan_bo (id_hoa_don);

ALTER TABLE public.cins_phan_bo ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.cins_phan_bo FROM anon, authenticated;
GRANT ALL ON TABLE public.cins_phan_bo TO service_role;

-- ═══════════════════════════════════════════════════════════════
-- 5. Nối bảng đo cũ (nullable)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.org_phi_dong
  ADD COLUMN IF NOT EXISTS id_hoa_don uuid
    REFERENCES public.cins_hoa_don(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_org_phi_dong_hoa_don
  ON public.org_phi_dong (id_hoa_don)
  WHERE id_hoa_don IS NOT NULL;

ALTER TABLE public.shop_phi_dong
  ADD COLUMN IF NOT EXISTS id_hoa_don uuid
    REFERENCES public.cins_hoa_don(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shop_phi_dong_hoa_don
  ON public.shop_phi_dong (id_hoa_don)
  WHERE id_hoa_don IS NOT NULL;
