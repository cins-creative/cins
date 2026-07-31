-- =====================================================================
-- migration_shop_ship_ghn.sql — L33 Shop: ship GHN + phí nền tảng + tranh chấp
-- IDEMPOTENT HISTORICAL AUDIT — đã chạy production 2026-07-30.
-- ĐVVC/kho/log + cột ship trên đơn đã REVERSE bởi
--   migration_shop_ship_reverse.sql (2026-07-31) — không chạy lại file này
--   để tái tạo carrier tables trên DB đã reverse trừ khi biết rõ ý đồ.
-- =====================================================================

-- ── Enums mới ────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.shop_hinh_thuc_giao_enum AS ENUM (
    'truc_tiep',
    'online',
    'tai_su_kien'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.shop_van_chuyen_trang_thai_enum AS ENUM (
    'chua_tao',
    'cho_lay',
    'da_lay',
    'dang_giao',
    'da_giao',
    'tra_hang',
    'huy_vd'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.shop_trang_thai_hoat_dong_enum AS ENUM (
    'hoat_dong',
    'canh_bao',
    'han_che',
    'khoa'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.shop_trang_thai_khieu_nai_enum AS ENUM (
    'mo',
    'cho_phan_hoi',
    'dang_xu_ly',
    'da_phan_xu',
    'dong'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.shop_ly_do_khieu_nai_enum AS ENUM (
    'chua_giao',
    'huy_khong_hoan',
    'hang_sai',
    'hang_loi',
    'khac'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.shop_trang_thai_phi_enum AS ENUM (
    'chua_chot',
    'chua_tra',
    'da_tra',
    'qua_han',
    'mien'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── A10 + A11: shop_don_hang ─────────────────────────────────────
ALTER TABLE public.shop_don_hang
  ADD COLUMN IF NOT EXISTS hinh_thuc_giao public.shop_hinh_thuc_giao_enum,
  ADD COLUMN IF NOT EXISTS dvvc text,
  ADD COLUMN IF NOT EXISTS ma_van_don text,
  ADD COLUMN IF NOT EXISTS phi_ship numeric(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS can_nang integer,
  ADD COLUMN IF NOT EXISTS van_chuyen_trang_thai public.shop_van_chuyen_trang_thai_enum,
  ADD COLUMN IF NOT EXISTS mua_phuong_xa text,
  ADD COLUMN IF NOT EXISTS mua_phuong_xa_code text,
  ADD COLUMN IF NOT EXISTS mua_tinh_thanh text,
  ADD COLUMN IF NOT EXISTS van_chuyen_dong_y_luc timestamptz,
  ADD COLUMN IF NOT EXISTS van_chuyen_dong_y_van_ban text,
  ADD COLUMN IF NOT EXISTS van_chuyen_dong_y_phien_ban text;

COMMENT ON COLUMN public.shop_don_hang.hinh_thuc_giao IS
  'L33 ship: truc_tiep | online | tai_su_kien — trục riêng, không nhồi vào loai_don.';
COMMENT ON COLUMN public.shop_don_hang.phi_ship IS
  'L33 ship: phí vận chuyển người mua trả (VND). Tổng CK = tong_tien + phi_ship.';
COMMENT ON COLUMN public.shop_don_hang.ma_van_don IS
  'L33 ship: mã vận đơn GHN (order_code).';
COMMENT ON COLUMN public.shop_don_hang.mua_phuong_xa IS
  'L33 ship: snapshot phường/xã lúc đặt đơn (tên trần).';
COMMENT ON COLUMN public.shop_don_hang.mua_phuong_xa_code IS
  'L33 ship: snapshot mã GSO phường/xã lúc đặt đơn.';
COMMENT ON COLUMN public.shop_don_hang.van_chuyen_dong_y_luc IS
  'L33 ship: thời điểm buyer đồng ý chia sẻ DLCN cho ĐVVC (NĐ 13/2023).';

CREATE INDEX IF NOT EXISTS idx_shop_don_ma_van_don
  ON public.shop_don_hang (ma_van_don)
  WHERE ma_van_don IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shop_don_hinh_thuc_giao
  ON public.shop_don_hang (id_nguoi_ban, hinh_thuc_giao)
  WHERE hinh_thuc_giao IS NOT NULL;

-- ── A12: shop_cua_hang gate ──────────────────────────────────────
ALTER TABLE public.shop_cua_hang
  ADD COLUMN IF NOT EXISTS trang_thai_hoat_dong public.shop_trang_thai_hoat_dong_enum
    NOT NULL DEFAULT 'hoat_dong',
  ADD COLUMN IF NOT EXISTS ly_do_khoa text,
  ADD COLUMN IF NOT EXISTS so_tranh_chap_mo integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.shop_cua_hang.trang_thai_hoat_dong IS
  'L33: cổng gate gộp (nợ phí + tranh chấp). Tách biệt tam_dong (seller tự nghỉ).';
COMMENT ON COLUMN public.shop_cua_hang.so_tranh_chap_mo IS
  'L33: cache số khiếu nại chưa đóng — đồng bộ bằng trigger; dùng dẫn xuất nhãn cảnh báo.';

-- ── A13: cân nặng + mã GSO địa chỉ nhận ──────────────────────────
ALTER TABLE public.shop_bien_the
  ADD COLUMN IF NOT EXISTS can_nang integer;

COMMENT ON COLUMN public.shop_bien_the.can_nang IS
  'L33 ship: trọng lượng gram (seller nhập). Dùng tính phí GHN.';

ALTER TABLE public.shop_dia_chi_nhan
  ADD COLUMN IF NOT EXISTS phuong_xa_code text;

COMMENT ON COLUMN public.shop_dia_chi_nhan.phuong_xa_code IS
  'L33 ship: mã GSO phường/xã (lib/vn/phuong-xa-2025).';

-- ── Bảng mới: kho lấy hàng ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shop_dia_chi_lay (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_nguoi_dung  uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  nhan           text,
  ho_ten         text NOT NULL,
  so_dien_thoai  text NOT NULL,
  dia_chi        text NOT NULL,
  phuong_xa      text,
  phuong_xa_code text,
  tinh_thanh     text,
  la_mac_dinh    boolean NOT NULL DEFAULT false,
  da_xoa         boolean NOT NULL DEFAULT false,
  tao_luc        timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_dia_chi_lay_owner
  ON public.shop_dia_chi_lay (id_nguoi_dung, tao_luc DESC)
  WHERE da_xoa = false;

CREATE UNIQUE INDEX IF NOT EXISTS shop_dia_chi_lay_mac_dinh_uidx
  ON public.shop_dia_chi_lay (id_nguoi_dung)
  WHERE la_mac_dinh = true AND da_xoa = false;

COMMENT ON TABLE public.shop_dia_chi_lay IS
  'L33 ship: kho lấy hàng của seller (nhiều kho / shop).';

-- ── Bảng mới: kết nối ĐVVC ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shop_van_chuyen_ket_noi (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_nguoi_dung  uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  dvvc           text NOT NULL DEFAULT 'ghn',
  token_enc      text NOT NULL,
  ghn_shop_id    text,
  cau_hinh       jsonb NOT NULL DEFAULT '{}'::jsonb,
  kich_hoat      boolean NOT NULL DEFAULT true,
  kiem_tra_luc   timestamptz,
  tao_luc        timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_nguoi_dung, dvvc)
);

COMMENT ON TABLE public.shop_van_chuyen_ket_noi IS
  'L33 ship: token ĐVVC của seller (token_enc AES — không trả plaintext ra client).';
COMMENT ON COLUMN public.shop_van_chuyen_ket_noi.token_enc IS
  'AES-256-GCM ciphertext (iv:authTag:ciphertext). Chỉ giải mã server-side trước khi gọi GHN.';

-- ── Bảng mới: log tracking ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shop_van_don_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_don_hang   uuid NOT NULL REFERENCES public.shop_don_hang(id) ON DELETE CASCADE,
  trang_thai    text NOT NULL,
  mo_ta         text,
  thoi_diem     timestamptz NOT NULL DEFAULT now(),
  raw           jsonb,
  tao_luc       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_van_don_log_don
  ON public.shop_van_don_log (id_don_hang, thoi_diem DESC);

-- ── Bảng mới: khiếu nại ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shop_khieu_nai (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_don_hang          uuid NOT NULL REFERENCES public.shop_don_hang(id) ON DELETE CASCADE,
  id_nguoi_mua         uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  id_nguoi_ban         uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  ly_do                public.shop_ly_do_khieu_nai_enum NOT NULL,
  mo_ta                text,
  trang_thai           public.shop_trang_thai_khieu_nai_enum NOT NULL DEFAULT 'mo',
  phan_quyet           text,
  phan_quyet_nghieng_ve text,
  phan_quyet_boi       uuid REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  phan_quyet_luc       timestamptz,
  han_phan_hoi         timestamptz,
  tao_luc              timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_khieu_nai_seller
  ON public.shop_khieu_nai (id_nguoi_ban, trang_thai, tao_luc DESC);
CREATE INDEX IF NOT EXISTS idx_shop_khieu_nai_buyer
  ON public.shop_khieu_nai (id_nguoi_mua, tao_luc DESC);
CREATE INDEX IF NOT EXISTS idx_shop_khieu_nai_don
  ON public.shop_khieu_nai (id_don_hang, tao_luc DESC);

CREATE TABLE IF NOT EXISTS public.shop_khieu_nai_bang_chung (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_khieu_nai   uuid NOT NULL REFERENCES public.shop_khieu_nai(id) ON DELETE CASCADE,
  id_nguoi_gui   uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  loai           text NOT NULL DEFAULT 'anh',
  anh_id         text,
  anh_url        text,
  ghi_chu        text,
  tao_luc        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_khieu_nai_bc
  ON public.shop_khieu_nai_bang_chung (id_khieu_nai, tao_luc);

-- ── Bảng mới: phí nền tảng (2 tầng) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.shop_phi_ky (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_nguoi_ban      uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  ky                date NOT NULL,
  gmv_ghi_nhan      numeric(18, 2) NOT NULL DEFAULT 0,
  ty_le             numeric(5, 4) NOT NULL DEFAULT 0.0500,
  phi_phai_tra      numeric(18, 2) NOT NULL DEFAULT 0,
  trang_thai        public.shop_trang_thai_phi_enum NOT NULL DEFAULT 'chua_chot',
  han_tra           date,
  bien_lai_anh_id   text,
  bien_lai_anh_url  text,
  xac_nhan_boi      uuid REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  xac_nhan_luc      timestamptz,
  tao_luc           timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_nguoi_ban, ky)
);

CREATE INDEX IF NOT EXISTS idx_shop_phi_ky_seller
  ON public.shop_phi_ky (id_nguoi_ban, ky DESC);

CREATE TABLE IF NOT EXISTS public.shop_phi_dong (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_don_hang     uuid NOT NULL REFERENCES public.shop_don_hang(id) ON DELETE CASCADE,
  id_nguoi_ban    uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  id_ky           uuid REFERENCES public.shop_phi_ky(id) ON DELETE SET NULL,
  gmv             numeric(18, 2) NOT NULL,
  ty_le           numeric(5, 4) NOT NULL DEFAULT 0.0500,
  phi             numeric(18, 2) NOT NULL,
  loai_tru        boolean NOT NULL DEFAULT false,
  ly_do_loai_tru  text,
  tao_luc         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_don_hang)
);

CREATE INDEX IF NOT EXISTS idx_shop_phi_dong_ky
  ON public.shop_phi_dong (id_ky)
  WHERE id_ky IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shop_phi_dong_seller
  ON public.shop_phi_dong (id_nguoi_ban, tao_luc DESC);

COMMENT ON TABLE public.shop_phi_dong IS
  'L33 phí: phí quy cho từng đơn. loai_tru=true khi đơn bị hoàn/thua tranh chấp → kỳ tự giảm GMV.';
COMMENT ON TABLE public.shop_phi_ky IS
  'L33 phí: kỳ tháng (ngày đầu tháng). Roll-up từ shop_phi_dong.';

-- ── Trigger cache so_tranh_chap_mo ────────────────────────────────
CREATE OR REPLACE FUNCTION public.shop_sync_so_tranh_chap_mo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller uuid;
  v_count integer;
BEGIN
  v_seller := COALESCE(NEW.id_nguoi_ban, OLD.id_nguoi_ban);
  IF v_seller IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT count(*)::integer INTO v_count
  FROM public.shop_khieu_nai kn
  WHERE kn.id_nguoi_ban = v_seller
    AND kn.trang_thai IN ('mo', 'cho_phan_hoi', 'dang_xu_ly', 'da_phan_xu');

  UPDATE public.shop_cua_hang
  SET so_tranh_chap_mo = v_count,
      cap_nhat_luc = now()
  WHERE id_nguoi_dung = v_seller
    AND da_xoa = false;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_shop_khieu_nai_so_tranh_chap ON public.shop_khieu_nai;
CREATE TRIGGER trg_shop_khieu_nai_so_tranh_chap
  AFTER INSERT OR UPDATE OF trang_thai OR DELETE
  ON public.shop_khieu_nai
  FOR EACH ROW
  EXECUTE FUNCTION public.shop_sync_so_tranh_chap_mo();

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE public.shop_dia_chi_lay ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_van_chuyen_ket_noi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_van_don_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_khieu_nai ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_khieu_nai_bang_chung ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_phi_ky ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_phi_dong ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shop_dia_chi_lay_owner ON public.shop_dia_chi_lay;
CREATE POLICY shop_dia_chi_lay_owner ON public.shop_dia_chi_lay
  FOR ALL
  USING (id_nguoi_dung = public.current_profile_id())
  WITH CHECK (id_nguoi_dung = public.current_profile_id());

DROP POLICY IF EXISTS shop_van_chuyen_ket_noi_owner ON public.shop_van_chuyen_ket_noi;
CREATE POLICY shop_van_chuyen_ket_noi_owner ON public.shop_van_chuyen_ket_noi
  FOR ALL
  USING (id_nguoi_dung = public.current_profile_id())
  WITH CHECK (id_nguoi_dung = public.current_profile_id());

DROP POLICY IF EXISTS shop_van_don_log_doi_tac ON public.shop_van_don_log;
CREATE POLICY shop_van_don_log_doi_tac ON public.shop_van_don_log
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

DROP POLICY IF EXISTS shop_khieu_nai_doi_tac ON public.shop_khieu_nai;
CREATE POLICY shop_khieu_nai_doi_tac ON public.shop_khieu_nai
  FOR SELECT
  USING (
    id_nguoi_mua = public.current_profile_id()
    OR id_nguoi_ban = public.current_profile_id()
  );

DROP POLICY IF EXISTS shop_khieu_nai_buyer_insert ON public.shop_khieu_nai;
CREATE POLICY shop_khieu_nai_buyer_insert ON public.shop_khieu_nai
  FOR INSERT
  WITH CHECK (id_nguoi_mua = public.current_profile_id());

DROP POLICY IF EXISTS shop_khieu_nai_doi_tac_update ON public.shop_khieu_nai;
CREATE POLICY shop_khieu_nai_doi_tac_update ON public.shop_khieu_nai
  FOR UPDATE
  USING (
    id_nguoi_mua = public.current_profile_id()
    OR id_nguoi_ban = public.current_profile_id()
  )
  WITH CHECK (
    id_nguoi_mua = public.current_profile_id()
    OR id_nguoi_ban = public.current_profile_id()
  );

DROP POLICY IF EXISTS shop_khieu_nai_bc_doi_tac ON public.shop_khieu_nai_bang_chung;
CREATE POLICY shop_khieu_nai_bc_doi_tac ON public.shop_khieu_nai_bang_chung
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shop_khieu_nai kn
      WHERE kn.id = id_khieu_nai
        AND (
          kn.id_nguoi_mua = public.current_profile_id()
          OR kn.id_nguoi_ban = public.current_profile_id()
        )
    )
  );

DROP POLICY IF EXISTS shop_khieu_nai_bc_insert ON public.shop_khieu_nai_bang_chung;
CREATE POLICY shop_khieu_nai_bc_insert ON public.shop_khieu_nai_bang_chung
  FOR INSERT
  WITH CHECK (
    id_nguoi_gui = public.current_profile_id()
    AND EXISTS (
      SELECT 1 FROM public.shop_khieu_nai kn
      WHERE kn.id = id_khieu_nai
        AND (
          kn.id_nguoi_mua = public.current_profile_id()
          OR kn.id_nguoi_ban = public.current_profile_id()
        )
    )
  );

DROP POLICY IF EXISTS shop_phi_ky_seller ON public.shop_phi_ky;
CREATE POLICY shop_phi_ky_seller ON public.shop_phi_ky
  FOR SELECT
  USING (id_nguoi_ban = public.current_profile_id());

DROP POLICY IF EXISTS shop_phi_dong_seller ON public.shop_phi_dong;
CREATE POLICY shop_phi_dong_seller ON public.shop_phi_dong
  FOR SELECT
  USING (id_nguoi_ban = public.current_profile_id());
