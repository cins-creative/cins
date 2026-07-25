-- L34 Plan 1 — CSĐT vận hành học (kỳ HP, chi nhánh, tiến độ, điểm danh)
-- Idempotent. ALTER A1/A2 trên org_lop_hoc (đã duyệt khi kickoff build).
-- Không đụng LiveKit / meeting_url.

-- ── Chi nhánh ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.org_chi_nhanh (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_to_chuc      uuid NOT NULL
                    REFERENCES public.org_to_chuc(id) ON DELETE CASCADE,
  ten             text NOT NULL,
  dia_chi         text,
  tinh_thanh      text,
  dien_thoai      text,
  email           text,
  dang_hoat_dong  boolean NOT NULL DEFAULT true,
  thu_tu          int4 NOT NULL DEFAULT 0,
  tao_luc         timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.org_chi_nhanh IS
  'Chi nhánh cơ sở đào tạo — lọc lớp / HV / doanh thu.';

CREATE INDEX IF NOT EXISTS idx_org_chi_nhanh_to_chuc
  ON public.org_chi_nhanh (id_to_chuc, dang_hoat_dong, thu_tu);

-- ── Gói học phí ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.org_goi_hoc_phi (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_to_chuc      uuid NOT NULL
                    REFERENCES public.org_to_chuc(id) ON DELETE CASCADE,
  id_khoa_hoc     uuid
                    REFERENCES public.org_khoa_hoc(id) ON DELETE SET NULL,
  ten             text NOT NULL,
  so_ngay         int4 NOT NULL CHECK (so_ngay > 0),
  gia_vnd         numeric(14, 0) NOT NULL DEFAULT 0 CHECK (gia_vnd >= 0),
  mo_ta           text,
  dang_ban        boolean NOT NULL DEFAULT true,
  thu_tu          int4 NOT NULL DEFAULT 0,
  tao_luc         timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.org_goi_hoc_phi IS
  'Catalog gói HP (tháng/khóa). Entitlement = so_ngay lịch. Không gói theo buổi phase này.';

CREATE INDEX IF NOT EXISTS idx_org_goi_hoc_phi_org
  ON public.org_goi_hoc_phi (id_to_chuc, dang_ban, thu_tu);
CREATE INDEX IF NOT EXISTS idx_org_goi_hoc_phi_khoa
  ON public.org_goi_hoc_phi (id_khoa_hoc)
  WHERE id_khoa_hoc IS NOT NULL;

-- ── Đơn học phí ────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.org_kenh_thu_hp_enum AS ENUM (
    'vietqr', 'tien_mat', 'ck_thu_cong'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.org_trang_thai_don_hp_enum AS ENUM (
    'cho_thanh_toan', 'da_nhan_tien', 'huy'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.org_don_hoc_phi (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_to_chuc          uuid NOT NULL
                        REFERENCES public.org_to_chuc(id) ON DELETE CASCADE,
  id_hoc_vien_lop     uuid NOT NULL
                        REFERENCES public.user_hoc_vien_lop(id) ON DELETE CASCADE,
  id_goi              uuid
                        REFERENCES public.org_goi_hoc_phi(id) ON DELETE SET NULL,
  id_chi_nhanh        uuid
                        REFERENCES public.org_chi_nhanh(id) ON DELETE SET NULL,
  id_nguoi_thu        uuid
                        REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  id_tin_nhan         uuid
                        REFERENCES public.chat_tin_nhan(id) ON DELETE SET NULL,
  ma_don              text,
  kenh                public.org_kenh_thu_hp_enum NOT NULL,
  trang_thai          public.org_trang_thai_don_hp_enum NOT NULL
                        DEFAULT 'cho_thanh_toan',
  so_tien_vnd         numeric(14, 0) NOT NULL DEFAULT 0 CHECK (so_tien_vnd >= 0),
  so_ngay_cong        int4 NOT NULL CHECK (so_ngay_cong > 0),
  bien_lai_anh_url    text,
  bien_lai_anh_id     text,
  ghi_chu             text,
  xac_nhan_luc        timestamptz,
  tao_luc             timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.org_don_hoc_phi IS
  'Phiếu thu HP (VietQR / tiền mặt / CK). Xác nhận → kéo dài org_ky_hoc.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_org_don_hoc_phi_ma_don
  ON public.org_don_hoc_phi (ma_don)
  WHERE ma_don IS NOT NULL AND ma_don <> '';

CREATE INDEX IF NOT EXISTS idx_org_don_hoc_phi_hv_lop
  ON public.org_don_hoc_phi (id_hoc_vien_lop, tao_luc DESC);
CREATE INDEX IF NOT EXISTS idx_org_don_hoc_phi_org
  ON public.org_don_hoc_phi (id_to_chuc, trang_thai, tao_luc DESC);

-- ── Kỳ học (khoảng ngày đã trả) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.org_ky_hoc (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_hoc_vien_lop     uuid NOT NULL
                        REFERENCES public.user_hoc_vien_lop(id) ON DELETE CASCADE,
  id_don              uuid
                        REFERENCES public.org_don_hoc_phi(id) ON DELETE SET NULL,
  ngay_dau            date NOT NULL,
  ngay_cuoi           date NOT NULL,
  tao_luc             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_ky_hoc_range_chk CHECK (ngay_cuoi >= ngay_dau)
);

COMMENT ON TABLE public.org_ky_hoc IS
  'Khoảng ngày đã đóng tiền per enrollment. Freeze khi hết ngay_cuoi (00:00). Visibility tin theo khoảng này.';

CREATE INDEX IF NOT EXISTS idx_org_ky_hoc_hv_lop
  ON public.org_ky_hoc (id_hoc_vien_lop, ngay_dau, ngay_cuoi);

-- ── Tiến độ bài ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.org_tien_do_bai (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_hoc_vien_lop     uuid NOT NULL
                        REFERENCES public.user_hoc_vien_lop(id) ON DELETE CASCADE,
  id_bai_tap          uuid NOT NULL
                        REFERENCES public.org_bai_tap(id) ON DELETE CASCADE,
  id_nguoi_gan        uuid
                        REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  cap_nhat_luc        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_org_tien_do_bai_hv UNIQUE (id_hoc_vien_lop)
);

COMMENT ON TABLE public.org_tien_do_bai IS
  'Bài tập hiện tại được mở cho HV (1 dòng / enrollment).';

CREATE INDEX IF NOT EXISTS idx_org_tien_do_bai_bai
  ON public.org_tien_do_bai (id_bai_tap);

-- ── Nộp bài ────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.org_trang_thai_nop_bai_enum AS ENUM (
    'cho_duyet', 'dat', 'lam_lai'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.org_nop_bai (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_hoc_vien_lop     uuid NOT NULL
                        REFERENCES public.user_hoc_vien_lop(id) ON DELETE CASCADE,
  id_bai_tap          uuid NOT NULL
                        REFERENCES public.org_bai_tap(id) ON DELETE CASCADE,
  id_tin_nhan         uuid
                        REFERENCES public.chat_tin_nhan(id) ON DELETE SET NULL,
  id_media            uuid
                        REFERENCES public.content_media(id) ON DELETE SET NULL,
  trang_thai          public.org_trang_thai_nop_bai_enum NOT NULL
                        DEFAULT 'cho_duyet',
  diem                numeric(5, 2),
  ghi_chu             text,
  id_nguoi_duyet      uuid
                        REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  duyet_luc           timestamptz,
  tao_luc             timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.org_nop_bai IS
  'Bài HV nộp (thường gắn tin chat). Duyệt dat/lam_lai; gán tiến độ tách bảng.';

CREATE INDEX IF NOT EXISTS idx_org_nop_bai_hv
  ON public.org_nop_bai (id_hoc_vien_lop, tao_luc DESC);
CREATE INDEX IF NOT EXISTS idx_org_nop_bai_cho
  ON public.org_nop_bai (trang_thai, tao_luc DESC)
  WHERE trang_thai = 'cho_duyet';

-- ── Điểm danh ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.org_diem_danh (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_lop_hoc          uuid NOT NULL
                        REFERENCES public.org_lop_hoc(id) ON DELETE CASCADE,
  id_nguoi_dung       uuid NOT NULL
                        REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  ngay                date NOT NULL,
  co_mat              boolean NOT NULL DEFAULT true,
  ghi_chu             text,
  id_nguoi_diem_danh  uuid
                        REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  tao_luc             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_org_diem_danh_lop_hv_ngay UNIQUE (id_lop_hoc, id_nguoi_dung, ngay)
);

COMMENT ON TABLE public.org_diem_danh IS
  'Điểm danh theo lớp × HV × ngày. Không thay billing.';

CREATE INDEX IF NOT EXISTS idx_org_diem_danh_lop_ngay
  ON public.org_diem_danh (id_lop_hoc, ngay);

-- ── ALTER A1 / A2 trên org_lop_hoc ─────────────────────────
ALTER TABLE public.org_lop_hoc
  ADD COLUMN IF NOT EXISTS id_chat_phong uuid
    REFERENCES public.chat_phong(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.org_lop_hoc.id_chat_phong IS
  'L34 A1 — phòng chat lớp cố định (loai_phong=lop_hoc).';

CREATE UNIQUE INDEX IF NOT EXISTS uq_org_lop_hoc_chat_phong
  ON public.org_lop_hoc (id_chat_phong)
  WHERE id_chat_phong IS NOT NULL;

ALTER TABLE public.org_lop_hoc
  ADD COLUMN IF NOT EXISTS id_chi_nhanh uuid
    REFERENCES public.org_chi_nhanh(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.org_lop_hoc.id_chi_nhanh IS
  'L34 A2 — chi nhánh lớp.';

CREATE INDEX IF NOT EXISTS idx_org_lop_hoc_chi_nhanh
  ON public.org_lop_hoc (id_chi_nhanh)
  WHERE id_chi_nhanh IS NOT NULL;

-- ── RLS tối thiểu (service-role app; member select sau) ────
ALTER TABLE public.org_chi_nhanh ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_goi_hoc_phi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_don_hoc_phi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_ky_hoc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_tien_do_bai ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_nop_bai ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_diem_danh ENABLE ROW LEVEL SECURITY;

-- Staff org đọc/ghi qua service role trong API; policy SELECT cho authenticated member (đọc gói đang bán).
DROP POLICY IF EXISTS org_goi_hoc_phi_doc_dang_ban ON public.org_goi_hoc_phi;
CREATE POLICY org_goi_hoc_phi_doc_dang_ban ON public.org_goi_hoc_phi
  FOR SELECT
  TO authenticated
  USING (dang_ban = true);

DROP POLICY IF EXISTS org_chi_nhanh_doc ON public.org_chi_nhanh;
CREATE POLICY org_chi_nhanh_doc ON public.org_chi_nhanh
  FOR SELECT
  TO authenticated
  USING (dang_hoat_dong = true);
