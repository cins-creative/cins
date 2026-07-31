-- =====================================================================
-- migration_shop_ship_restore_dvvc.sql — Khôi phục bảng/cột ĐVVC đã DROP
-- Idempotent. CINs ospzzzxcomrmhqrnkoiw.
-- Chạy: npm run migrate:shop-ship-restore-dvvc
--
-- Không đụng shop_phi_* / shop_khieu_nai* (đã giữ sau reverse).
-- Token/kho cũ đã mất khi DROP — shop phải kết nối lại.
-- =====================================================================

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

ALTER TABLE public.shop_don_hang
  ADD COLUMN IF NOT EXISTS dvvc text,
  ADD COLUMN IF NOT EXISTS ma_van_don text,
  ADD COLUMN IF NOT EXISTS phi_ship numeric(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS can_nang integer,
  ADD COLUMN IF NOT EXISTS van_chuyen_trang_thai public.shop_van_chuyen_trang_thai_enum,
  ADD COLUMN IF NOT EXISTS van_chuyen_dong_y_luc timestamptz,
  ADD COLUMN IF NOT EXISTS van_chuyen_dong_y_van_ban text,
  ADD COLUMN IF NOT EXISTS van_chuyen_dong_y_phien_ban text;

COMMENT ON COLUMN public.shop_don_hang.hinh_thuc_giao IS
  'L33 ship: truc_tiep | online | tai_su_kien — online tạm gated runtime.';
COMMENT ON COLUMN public.shop_don_hang.phi_ship IS
  'L33 ship: phí vận chuyển người mua trả (VND).';
COMMENT ON COLUMN public.shop_don_hang.ma_van_don IS
  'L33 ship: mã vận đơn ĐVVC.';
COMMENT ON COLUMN public.shop_don_hang.van_chuyen_dong_y_luc IS
  'L33 ship: thời điểm buyer đồng ý chia sẻ DLCN cho ĐVVC.';

CREATE INDEX IF NOT EXISTS idx_shop_don_ma_van_don
  ON public.shop_don_hang (ma_van_don)
  WHERE ma_van_don IS NOT NULL;

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
  'L33 ship: kho lấy hàng của seller.';

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
  'L33 ship: token ĐVVC của seller (token_enc AES — không trả plaintext).';

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

ALTER TABLE public.shop_dia_chi_lay ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_van_chuyen_ket_noi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_van_don_log ENABLE ROW LEVEL SECURITY;

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
