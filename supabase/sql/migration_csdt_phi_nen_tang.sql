-- Phí nền tảng CSĐT (Phase A-1) — PLAN_csdt_phi_nen_tang_va_lead.md
-- 5 bảng mới, KHÔNG ALTER bảng live.
-- Target: CINS production ospzzzxcomrmhqrnkoiw.
-- Chạy: npm run migrate:csdt-phi
-- Idempotent.
--
-- RLS:
--   cins_cau_hinh_tai_chinh + org_phi_thanh_toan → service-role only (không policy authenticated)
--   org_phi_ky / org_phi_dong / org_phi_khieu_nai → SELECT cho thành viên org; ghi qua service-role API

-- ═══════════════════════════════════════════════════════════════
-- 1. cins_cau_hinh_tai_chinh — cấu hình /admin/tai-chinh
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.cins_cau_hinh_tai_chinh (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Phí CSĐT
  csdt_ty_le                  numeric(5, 4) NOT NULL DEFAULT 0.1000
                              CHECK (csdt_ty_le >= 0 AND csdt_ty_le <= 1),
  csdt_nguong_kich_hoat_vnd   bigint NOT NULL DEFAULT 2000000
                              CHECK (csdt_nguong_kich_hoat_vnd >= 0),
  csdt_so_ngay_han_tra        int NOT NULL DEFAULT 7
                              CHECK (csdt_so_ngay_han_tra >= 0),
  csdt_nguong_egress_gb       int
                              CHECK (csdt_nguong_egress_gb IS NULL OR csdt_nguong_egress_gb > 0),
  -- STK nhận phí CINs (điền sau qua admin)
  bank_ten                    text,
  bank_so_tk                  text,
  bank_chu_tk                 text,
  bank_bin                    text,
  -- Doanh nghiệp CINs (hóa đơn)
  dn_ten_phap_nhan            text,
  dn_mst                      text,
  dn_dia_chi                  text,
  dn_nguoi_dai_dien           text,
  dn_email_hoa_don            text,
  xuat_hoa_don_bat            boolean NOT NULL DEFAULT false,
  -- Audit / lịch sử (mỗi lần lưu = insert dòng mới)
  ghi_chu                     text,
  cap_nhat_boi                uuid REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  tao_luc                     timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc                timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cins_cau_hinh_tai_chinh IS
  'Cấu hình tài chính nền tảng CINs (tỷ lệ/ngưỡng phí CSĐT, STK, DN). Đọc dòng cap_nhat_luc mới nhất. Không lưu secret.';

COMMENT ON COLUMN public.cins_cau_hinh_tai_chinh.csdt_nguong_egress_gb IS
  'NULL = tắt điều kiện egress phòng học khi kích hoạt phí.';

COMMENT ON COLUMN public.cins_cau_hinh_tai_chinh.xuat_hoa_don_bat IS
  'false giai đoạn này — schema đã chừa chỗ xuất HĐĐT.';

CREATE INDEX IF NOT EXISTS idx_cins_cau_hinh_tai_chinh_cap_nhat
  ON public.cins_cau_hinh_tai_chinh (cap_nhat_luc DESC);

-- Seed 1 dòng mặc định nếu bảng trống (10% / 2tr / 7 ngày · STK & DN trống · HĐ tắt)
INSERT INTO public.cins_cau_hinh_tai_chinh (
  csdt_ty_le,
  csdt_nguong_kich_hoat_vnd,
  csdt_so_ngay_han_tra,
  xuat_hoa_don_bat,
  ghi_chu
)
SELECT 0.1000, 2000000, 7, false, 'Seed giai đoạn 1 — A-1'
WHERE NOT EXISTS (SELECT 1 FROM public.cins_cau_hinh_tai_chinh LIMIT 1);

ALTER TABLE public.cins_cau_hinh_tai_chinh ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.cins_cau_hinh_tai_chinh FROM anon, authenticated;
GRANT ALL ON TABLE public.cins_cau_hinh_tai_chinh TO service_role;

-- ═══════════════════════════════════════════════════════════════
-- 2. org_phi_ky — hóa đơn kỳ (tạo trước vì org_phi_dong FK tới đây)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.org_phi_ky (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_to_chuc                uuid NOT NULL
                              REFERENCES public.org_to_chuc(id) ON DELETE CASCADE,
  loai_ky                   text NOT NULL
                              CHECK (loai_ky IN ('kich_hoat', 'thang')),
  tu_ngay                   date NOT NULL,
  den_ngay                  date NOT NULL,
  ngay_chot                 date NOT NULL,
  han_tra                   date NOT NULL,
  doanh_thu_ghi_nhan_vnd    bigint NOT NULL DEFAULT 0
                              CHECK (doanh_thu_ghi_nhan_vnd >= 0),
  ty_le                     numeric(5, 4) NOT NULL
                              CHECK (ty_le >= 0 AND ty_le <= 1),
  phi_phai_tra_vnd          bigint NOT NULL DEFAULT 0
                              CHECK (phi_phai_tra_vnd >= 0),
  dieu_chinh_vnd            bigint NOT NULL DEFAULT 0,
  da_tra_vnd                bigint NOT NULL DEFAULT 0
                              CHECK (da_tra_vnd >= 0),
  trang_thai                text NOT NULL DEFAULT 'chua_tra'
                              CHECK (trang_thai IN ('chua_tra', 'da_tra', 'qua_han', 'mien')),
  ma_tham_chieu             text NOT NULL,
  so_hoa_don                text,
  xuat_hoa_don_luc          timestamptz,
  hoa_don_thong_tin         jsonb,
  xac_nhan_boi              uuid REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  xac_nhan_luc              timestamptz,
  ghi_chu                   text,
  tao_luc                   timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_phi_ky_range_chk CHECK (den_ngay >= tu_ngay),
  CONSTRAINT org_phi_ky_han_chk CHECK (han_tra >= ngay_chot)
);

COMMENT ON TABLE public.org_phi_ky IS
  'Hóa đơn kỳ phí nền tảng CSĐT. Số phải trả = max(0, phi_phai_tra_vnd + dieu_chinh_vnd).';

COMMENT ON COLUMN public.org_phi_ky.dieu_chinh_vnd IS
  'Credit âm từ đơn huỷ ở kỳ đã trả; không sửa kỳ cũ.';

COMMENT ON COLUMN public.org_phi_ky.hoa_don_thong_tin IS
  'Snapshot bên mua/bán lúc chốt kỳ — dữ liệu xuất HĐĐT sau này.';

COMMENT ON COLUMN public.org_phi_ky.ma_tham_chieu IS
  'Nội dung CK Sepay — dạng CINS + hash org + YYMM.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_org_phi_ky_ma_tham_chieu
  ON public.org_phi_ky (ma_tham_chieu);

CREATE UNIQUE INDEX IF NOT EXISTS uq_org_phi_ky_org_ngay_chot
  ON public.org_phi_ky (id_to_chuc, ngay_chot);

CREATE INDEX IF NOT EXISTS idx_org_phi_ky_trang_thai_han
  ON public.org_phi_ky (trang_thai, han_tra);

CREATE INDEX IF NOT EXISTS idx_org_phi_ky_org
  ON public.org_phi_ky (id_to_chuc, ngay_chot DESC);

ALTER TABLE public.org_phi_ky ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_phi_ky_select_member ON public.org_phi_ky;
CREATE POLICY org_phi_ky_select_member ON public.org_phi_ky
  FOR SELECT
  TO authenticated
  USING (
    public.is_thanh_vien_to_chuc(public.current_profile_id(), id_to_chuc)
  );

GRANT SELECT ON TABLE public.org_phi_ky TO authenticated;
GRANT ALL ON TABLE public.org_phi_ky TO service_role;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.org_phi_ky FROM authenticated;
REVOKE ALL ON TABLE public.org_phi_ky FROM anon;

-- ═══════════════════════════════════════════════════════════════
-- 3. org_phi_dong — snapshot phí theo đơn học phí
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.org_phi_dong (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_to_chuc          uuid NOT NULL
                        REFERENCES public.org_to_chuc(id) ON DELETE CASCADE,
  id_don_hoc_phi      uuid
                        REFERENCES public.org_don_hoc_phi(id) ON DELETE SET NULL,
  id_ky               uuid
                        REFERENCES public.org_phi_ky(id) ON DELETE SET NULL,
  doanh_thu_vnd       bigint NOT NULL CHECK (doanh_thu_vnd >= 0),
  ty_le               numeric(5, 4) NOT NULL CHECK (ty_le >= 0 AND ty_le <= 1),
  phi_vnd             bigint NOT NULL,
  loai_tru            boolean NOT NULL DEFAULT false,
  ly_do_loai_tru      text,
  xac_nhan_luc        timestamptz NOT NULL,
  tao_luc             timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.org_phi_dong IS
  'Snapshot phí nền tảng theo từng đơn HP đã xác nhận. SET NULL khi gỡ ghi danh — giữ số phí (không CASCADE).';

COMMENT ON COLUMN public.org_phi_dong.id_don_hoc_phi IS
  'ON DELETE SET NULL: gỡ ghi danh CASCADE xóa đơn nhưng không xóa phí đã tích.';

-- Idempotent theo đơn (khi còn liên kết)
CREATE UNIQUE INDEX IF NOT EXISTS uq_org_phi_dong_don
  ON public.org_phi_dong (id_don_hoc_phi)
  WHERE id_don_hoc_phi IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_org_phi_dong_org_xac_nhan
  ON public.org_phi_dong (id_to_chuc, xac_nhan_luc);

CREATE INDEX IF NOT EXISTS idx_org_phi_dong_ky
  ON public.org_phi_dong (id_ky)
  WHERE id_ky IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_org_phi_dong_chua_vao_ky
  ON public.org_phi_dong (id_to_chuc, xac_nhan_luc)
  WHERE id_ky IS NULL AND loai_tru = false;

ALTER TABLE public.org_phi_dong ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_phi_dong_select_member ON public.org_phi_dong;
CREATE POLICY org_phi_dong_select_member ON public.org_phi_dong
  FOR SELECT
  TO authenticated
  USING (
    public.is_thanh_vien_to_chuc(public.current_profile_id(), id_to_chuc)
  );

GRANT SELECT ON TABLE public.org_phi_dong TO authenticated;
GRANT ALL ON TABLE public.org_phi_dong TO service_role;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.org_phi_dong FROM authenticated;
REVOKE ALL ON TABLE public.org_phi_dong FROM anon;

-- ═══════════════════════════════════════════════════════════════
-- 4. org_phi_thanh_toan — giao dịch Sepay (service-role only)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.org_phi_thanh_toan (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_ky               uuid
                        REFERENCES public.org_phi_ky(id) ON DELETE SET NULL,
  id_to_chuc          uuid
                        REFERENCES public.org_to_chuc(id) ON DELETE SET NULL,
  sepay_id            text NOT NULL,
  so_tien_vnd         bigint NOT NULL CHECK (so_tien_vnd >= 0),
  noi_dung            text,
  tai_khoan_nguon     text,
  nhan_luc            timestamptz NOT NULL,
  gan_boi             uuid REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  gan_luc             timestamptz,
  tao_luc             timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.org_phi_thanh_toan IS
  'Giao dịch Sepay đối soát phí nền tảng. id_ky NULL = chưa khớp (sai mã). Service-role only.';

COMMENT ON COLUMN public.org_phi_thanh_toan.tai_khoan_nguon IS
  'Chỉ mask 4 số cuối — không lưu full STK nguồn.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_org_phi_thanh_toan_sepay
  ON public.org_phi_thanh_toan (sepay_id);

CREATE INDEX IF NOT EXISTS idx_org_phi_thanh_toan_chua_khop
  ON public.org_phi_thanh_toan (tao_luc DESC)
  WHERE id_ky IS NULL;

CREATE INDEX IF NOT EXISTS idx_org_phi_thanh_toan_ky
  ON public.org_phi_thanh_toan (id_ky)
  WHERE id_ky IS NOT NULL;

ALTER TABLE public.org_phi_thanh_toan ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.org_phi_thanh_toan FROM anon, authenticated;
GRANT ALL ON TABLE public.org_phi_thanh_toan TO service_role;

-- ═══════════════════════════════════════════════════════════════
-- 5. org_phi_khieu_nai — khiếu nại đối soát
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.org_phi_khieu_nai (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_to_chuc          uuid NOT NULL
                        REFERENCES public.org_to_chuc(id) ON DELETE CASCADE,
  id_ky               uuid
                        REFERENCES public.org_phi_ky(id) ON DELETE SET NULL,
  noi_dung            text NOT NULL,
  ma_giao_dich        text,
  bien_lai_anh_id     text,
  trang_thai          text NOT NULL DEFAULT 'mo'
                        CHECK (trang_thai IN ('mo', 'dang_xu_ly', 'da_xu_ly', 'tu_choi')),
  phan_hoi_admin      text,
  nguoi_tao           uuid NOT NULL
                        REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  xu_ly_boi           uuid
                        REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  tao_luc             timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.org_phi_khieu_nai IS
  'Khiếu nại CK sai mã / đối soát phí nền tảng. Tạo qua API founder; admin xử lý.';

CREATE INDEX IF NOT EXISTS idx_org_phi_khieu_nai_org
  ON public.org_phi_khieu_nai (id_to_chuc, trang_thai, tao_luc DESC);

CREATE INDEX IF NOT EXISTS idx_org_phi_khieu_nai_mo
  ON public.org_phi_khieu_nai (trang_thai, tao_luc DESC)
  WHERE trang_thai IN ('mo', 'dang_xu_ly');

ALTER TABLE public.org_phi_khieu_nai ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_phi_khieu_nai_select_member ON public.org_phi_khieu_nai;
CREATE POLICY org_phi_khieu_nai_select_member ON public.org_phi_khieu_nai
  FOR SELECT
  TO authenticated
  USING (
    public.is_thanh_vien_to_chuc(public.current_profile_id(), id_to_chuc)
  );

GRANT SELECT ON TABLE public.org_phi_khieu_nai TO authenticated;
GRANT ALL ON TABLE public.org_phi_khieu_nai TO service_role;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.org_phi_khieu_nai FROM authenticated;
REVOKE ALL ON TABLE public.org_phi_khieu_nai FROM anon;
