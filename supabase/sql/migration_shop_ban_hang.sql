-- =====================================================================
-- migration_shop_ban_hang.sql — L33 Shop UGC / preorder (không payment)
-- Idempotent. CINs ospzzzxcomrmhqrnkoiw.
-- =====================================================================

-- ── User opt-in ──────────────────────────────────────────────────
ALTER TABLE public.user_nguoi_dung
  ADD COLUMN IF NOT EXISTS ban_hang_bat boolean NOT NULL DEFAULT false;

ALTER TABLE public.user_nguoi_dung
  ADD COLUMN IF NOT EXISTS ban_hang_dieu_khoan_luc timestamptz;

COMMENT ON COLUMN public.user_nguoi_dung.ban_hang_bat IS
  'L33: bật module bán hàng (mặc định false).';
COMMENT ON COLUMN public.user_nguoi_dung.ban_hang_dieu_khoan_luc IS
  'L33: thời điểm chấp nhận điều khoản bán hàng (CINs không trung gian tiền).';

-- ── Enums ────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.shop_loai_don_enum AS ENUM (
    'mua_ngay',
    'dat_truoc_nhan_su_kien'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.shop_trang_thai_don_enum AS ENUM (
    'nhap',
    'cho_xac_nhan',
    'da_nhan_tien',
    'da_giao_tai_su_kien',
    'huy'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.shop_trang_thai_quay_enum AS ENUM (
    'cho_xu_ly',
    'da_duyet',
    'tu_choi'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Catalog ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shop_san_pham (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_nguoi_dung uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  ten           text NOT NULL,
  mo_ta         text,
  anh_id        text,
  dang_ban      boolean NOT NULL DEFAULT true,
  da_xoa        boolean NOT NULL DEFAULT false,
  tao_luc       timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_san_pham_owner
  ON public.shop_san_pham (id_nguoi_dung, tao_luc DESC)
  WHERE da_xoa = false;

COMMENT ON TABLE public.shop_san_pham IS
  'L33: sản phẩm catalog của seller (user đã bật bán hàng).';

CREATE TABLE IF NOT EXISTS public.shop_bien_the (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_san_pham   uuid NOT NULL REFERENCES public.shop_san_pham(id) ON DELETE CASCADE,
  nhan          text NOT NULL DEFAULT 'Mặc định',
  sku           text,
  so_luong_ton  integer NOT NULL DEFAULT 0,
  anh_id        text,
  da_xoa        boolean NOT NULL DEFAULT false,
  tao_luc       timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_bien_the_sp
  ON public.shop_bien_the (id_san_pham)
  WHERE da_xoa = false;

COMMENT ON TABLE public.shop_bien_the IS
  'L33: biến thể / SKU + tồn kho. Cho phép âm sau khi seller xác nhận đơn.';

-- ── Bảng giá ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shop_bang_gia (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_nguoi_dung uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  ten           text NOT NULL,
  tien_te       text NOT NULL DEFAULT 'VND',
  ghi_chu       text,
  da_xoa        boolean NOT NULL DEFAULT false,
  tao_luc       timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_bang_gia_owner
  ON public.shop_bang_gia (id_nguoi_dung, tao_luc DESC)
  WHERE da_xoa = false;

CREATE TABLE IF NOT EXISTS public.shop_bang_gia_dong (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_bang_gia   uuid NOT NULL REFERENCES public.shop_bang_gia(id) ON DELETE CASCADE,
  id_bien_the   uuid NOT NULL REFERENCES public.shop_bien_the(id) ON DELETE CASCADE,
  gia           numeric(18, 2) NOT NULL CHECK (gia >= 0),
  UNIQUE (id_bang_gia, id_bien_the)
);

CREATE INDEX IF NOT EXISTS idx_shop_bang_gia_dong_bt
  ON public.shop_bang_gia_dong (id_bien_the);

-- ── Post kiosk ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shop_post_hang (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cot_moc    uuid NOT NULL REFERENCES public.content_cot_moc(id) ON DELETE CASCADE,
  id_bien_the   uuid NOT NULL REFERENCES public.shop_bien_the(id) ON DELETE CASCADE,
  id_bang_gia   uuid REFERENCES public.shop_bang_gia(id) ON DELETE SET NULL,
  gia_hien_thi  numeric(18, 2) NOT NULL CHECK (gia_hien_thi >= 0),
  tien_te       text NOT NULL DEFAULT 'VND',
  thu_tu        integer NOT NULL DEFAULT 0,
  tao_luc       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_cot_moc, id_bien_the)
);

CREATE INDEX IF NOT EXISTS idx_shop_post_hang_moc
  ON public.shop_post_hang (id_cot_moc, thu_tu);

-- ── Giỏ (theo post) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shop_gio (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_nguoi_mua    uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  id_cot_moc      uuid NOT NULL REFERENCES public.content_cot_moc(id) ON DELETE CASCADE,
  tao_luc         timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_nguoi_mua, id_cot_moc)
);

CREATE TABLE IF NOT EXISTS public.shop_gio_dong (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_gio        uuid NOT NULL REFERENCES public.shop_gio(id) ON DELETE CASCADE,
  id_bien_the   uuid NOT NULL REFERENCES public.shop_bien_the(id) ON DELETE CASCADE,
  so_luong      integer NOT NULL CHECK (so_luong > 0),
  UNIQUE (id_gio, id_bien_the)
);

-- ── Đơn hàng ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shop_don_hang (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_nguoi_mua    uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  id_nguoi_ban    uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  id_cot_moc      uuid REFERENCES public.content_cot_moc(id) ON DELETE SET NULL,
  id_su_kien      uuid REFERENCES public.org_su_kien(id) ON DELETE SET NULL,
  loai_don        public.shop_loai_don_enum NOT NULL DEFAULT 'mua_ngay',
  trang_thai      public.shop_trang_thai_don_enum NOT NULL DEFAULT 'cho_xac_nhan',
  tien_te         text NOT NULL DEFAULT 'VND',
  tong_tien       numeric(18, 2) NOT NULL DEFAULT 0,
  ghi_chu         text,
  dieu_khoan_snapshot text,
  da_tru_kho      boolean NOT NULL DEFAULT false,
  xac_nhan_luc    timestamptz,
  huy_luc         timestamptz,
  tao_luc         timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_don_seller
  ON public.shop_don_hang (id_nguoi_ban, tao_luc DESC);
CREATE INDEX IF NOT EXISTS idx_shop_don_buyer
  ON public.shop_don_hang (id_nguoi_mua, tao_luc DESC);
CREATE INDEX IF NOT EXISTS idx_shop_don_moc
  ON public.shop_don_hang (id_cot_moc)
  WHERE id_cot_moc IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.shop_don_hang_dong (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_don_hang   uuid NOT NULL REFERENCES public.shop_don_hang(id) ON DELETE CASCADE,
  id_bien_the   uuid REFERENCES public.shop_bien_the(id) ON DELETE SET NULL,
  ten_snapshot  text NOT NULL,
  nhan_snapshot text,
  so_luong      integer NOT NULL CHECK (so_luong > 0),
  gia_don_vi    numeric(18, 2) NOT NULL CHECK (gia_don_vi >= 0)
);

CREATE INDEX IF NOT EXISTS idx_shop_don_dong
  ON public.shop_don_hang_dong (id_don_hang);

-- ── Quầy sự kiện ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shop_quay_su_kien (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_su_kien      uuid NOT NULL REFERENCES public.org_su_kien(id) ON DELETE CASCADE,
  id_nguoi_dung   uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  id_cot_moc      uuid REFERENCES public.content_cot_moc(id) ON DELETE SET NULL,
  bang_chung      jsonb NOT NULL DEFAULT '[]'::jsonb,
  trang_thai      public.shop_trang_thai_quay_enum NOT NULL DEFAULT 'cho_xu_ly',
  ly_do_tu_choi   text,
  duyet_boi       uuid REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  duyet_luc       timestamptz,
  tao_luc         timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_su_kien, id_nguoi_dung, id_cot_moc)
);

CREATE INDEX IF NOT EXISTS idx_shop_quay_sk
  ON public.shop_quay_su_kien (id_su_kien, trang_thai, tao_luc DESC);
CREATE INDEX IF NOT EXISTS idx_shop_quay_user
  ON public.shop_quay_su_kien (id_nguoi_dung, tao_luc DESC);

COMMENT ON TABLE public.shop_quay_su_kien IS
  'L33: xin làm quầy tại sự kiện + bằng chứng; owner org duyệt.';

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE public.shop_san_pham ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_bien_the ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_bang_gia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_bang_gia_dong ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_post_hang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_gio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_gio_dong ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_don_hang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_don_hang_dong ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_quay_su_kien ENABLE ROW LEVEL SECURITY;

-- Catalog: owner full; public đọc sản phẩm đang bán (không xóa)
DROP POLICY IF EXISTS shop_san_pham_owner ON public.shop_san_pham;
CREATE POLICY shop_san_pham_owner ON public.shop_san_pham
  FOR ALL
  USING (id_nguoi_dung = public.current_profile_id())
  WITH CHECK (id_nguoi_dung = public.current_profile_id());

DROP POLICY IF EXISTS shop_san_pham_doc_cong_khai ON public.shop_san_pham;
CREATE POLICY shop_san_pham_doc_cong_khai ON public.shop_san_pham
  FOR SELECT
  USING (da_xoa = false AND dang_ban = true);

DROP POLICY IF EXISTS shop_bien_the_owner ON public.shop_bien_the;
CREATE POLICY shop_bien_the_owner ON public.shop_bien_the
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.shop_san_pham sp
      WHERE sp.id = id_san_pham
        AND sp.id_nguoi_dung = public.current_profile_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shop_san_pham sp
      WHERE sp.id = id_san_pham
        AND sp.id_nguoi_dung = public.current_profile_id()
    )
  );

DROP POLICY IF EXISTS shop_bien_the_doc_cong_khai ON public.shop_bien_the;
CREATE POLICY shop_bien_the_doc_cong_khai ON public.shop_bien_the
  FOR SELECT
  USING (
    da_xoa = false
    AND EXISTS (
      SELECT 1 FROM public.shop_san_pham sp
      WHERE sp.id = id_san_pham
        AND sp.da_xoa = false
        AND sp.dang_ban = true
    )
  );

DROP POLICY IF EXISTS shop_bang_gia_owner ON public.shop_bang_gia;
CREATE POLICY shop_bang_gia_owner ON public.shop_bang_gia
  FOR ALL
  USING (id_nguoi_dung = public.current_profile_id())
  WITH CHECK (id_nguoi_dung = public.current_profile_id());

DROP POLICY IF EXISTS shop_bang_gia_doc ON public.shop_bang_gia;
CREATE POLICY shop_bang_gia_doc ON public.shop_bang_gia
  FOR SELECT
  USING (da_xoa = false);

DROP POLICY IF EXISTS shop_bang_gia_dong_owner ON public.shop_bang_gia_dong;
CREATE POLICY shop_bang_gia_dong_owner ON public.shop_bang_gia_dong
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.shop_bang_gia bg
      WHERE bg.id = id_bang_gia
        AND bg.id_nguoi_dung = public.current_profile_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shop_bang_gia bg
      WHERE bg.id = id_bang_gia
        AND bg.id_nguoi_dung = public.current_profile_id()
    )
  );

DROP POLICY IF EXISTS shop_bang_gia_dong_doc ON public.shop_bang_gia_dong;
CREATE POLICY shop_bang_gia_dong_doc ON public.shop_bang_gia_dong
  FOR SELECT USING (true);

-- Post hang: đọc công khai; ghi = chủ cột mốc
DROP POLICY IF EXISTS shop_post_hang_doc ON public.shop_post_hang;
CREATE POLICY shop_post_hang_doc ON public.shop_post_hang
  FOR SELECT USING (true);

DROP POLICY IF EXISTS shop_post_hang_owner ON public.shop_post_hang;
CREATE POLICY shop_post_hang_owner ON public.shop_post_hang
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.content_cot_moc cm
      WHERE cm.id = id_cot_moc
        AND cm.id_nguoi_dung = public.current_profile_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.content_cot_moc cm
      WHERE cm.id = id_cot_moc
        AND cm.id_nguoi_dung = public.current_profile_id()
    )
  );

-- Giỏ: chỉ buyer
DROP POLICY IF EXISTS shop_gio_owner ON public.shop_gio;
CREATE POLICY shop_gio_owner ON public.shop_gio
  FOR ALL
  USING (id_nguoi_mua = public.current_profile_id())
  WITH CHECK (id_nguoi_mua = public.current_profile_id());

DROP POLICY IF EXISTS shop_gio_dong_owner ON public.shop_gio_dong;
CREATE POLICY shop_gio_dong_owner ON public.shop_gio_dong
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.shop_gio g
      WHERE g.id = id_gio
        AND g.id_nguoi_mua = public.current_profile_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shop_gio g
      WHERE g.id = id_gio
        AND g.id_nguoi_mua = public.current_profile_id()
    )
  );

-- Đơn: buyer + seller
DROP POLICY IF EXISTS shop_don_hang_doi_tac ON public.shop_don_hang;
CREATE POLICY shop_don_hang_doi_tac ON public.shop_don_hang
  FOR SELECT
  USING (
    id_nguoi_mua = public.current_profile_id()
    OR id_nguoi_ban = public.current_profile_id()
  );

DROP POLICY IF EXISTS shop_don_hang_buyer_insert ON public.shop_don_hang;
CREATE POLICY shop_don_hang_buyer_insert ON public.shop_don_hang
  FOR INSERT
  WITH CHECK (id_nguoi_mua = public.current_profile_id());

DROP POLICY IF EXISTS shop_don_hang_update ON public.shop_don_hang;
CREATE POLICY shop_don_hang_update ON public.shop_don_hang
  FOR UPDATE
  USING (
    id_nguoi_mua = public.current_profile_id()
    OR id_nguoi_ban = public.current_profile_id()
  )
  WITH CHECK (
    id_nguoi_mua = public.current_profile_id()
    OR id_nguoi_ban = public.current_profile_id()
  );

DROP POLICY IF EXISTS shop_don_dong_doi_tac ON public.shop_don_hang_dong;
CREATE POLICY shop_don_dong_doi_tac ON public.shop_don_hang_dong
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shop_don_hang d
      WHERE d.id = id_don_hang
        AND (
          d.id_nguoi_mua = public.current_profile_id()
          OR d.id_nguoi_ban = public.current_profile_id()
        )
    )
  );

DROP POLICY IF EXISTS shop_don_dong_insert ON public.shop_don_hang_dong;
CREATE POLICY shop_don_dong_insert ON public.shop_don_hang_dong
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shop_don_hang d
      WHERE d.id = id_don_hang
        AND d.id_nguoi_mua = public.current_profile_id()
    )
  );

-- Quầy: applicant full own rows; public đọc đã duyệt; org admin quản lý qua service role / API
DROP POLICY IF EXISTS shop_quay_applicant ON public.shop_quay_su_kien;
CREATE POLICY shop_quay_applicant ON public.shop_quay_su_kien
  FOR ALL
  USING (id_nguoi_dung = public.current_profile_id())
  WITH CHECK (id_nguoi_dung = public.current_profile_id());

DROP POLICY IF EXISTS shop_quay_doc_duyet ON public.shop_quay_su_kien;
CREATE POLICY shop_quay_doc_duyet ON public.shop_quay_su_kien
  FOR SELECT
  USING (trang_thai = 'da_duyet');

DROP POLICY IF EXISTS shop_quay_admin_org ON public.shop_quay_su_kien;
CREATE POLICY shop_quay_admin_org ON public.shop_quay_su_kien
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.org_su_kien sk
      WHERE sk.id = id_su_kien
        AND public.is_admin_to_chuc(public.current_profile_id(), sk.id_to_chuc)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_su_kien sk
      WHERE sk.id = id_su_kien
        AND public.is_admin_to_chuc(public.current_profile_id(), sk.id_to_chuc)
    )
  );
