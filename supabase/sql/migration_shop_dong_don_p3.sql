-- P3a: Đóng đơn shop — khảo sát buyer + tự đóng + tham số admin.
-- ALTER shop_don_hang + cins_cau_hinh_tai_chinh (idempotent).

-- A. shop_don_hang
ALTER TABLE public.shop_don_hang
  ADD COLUMN IF NOT EXISTS khao_sat_luc timestamptz,
  ADD COLUMN IF NOT EXISTS khao_sat_tra_loi text,
  ADD COLUMN IF NOT EXISTS so_lan_hoan_chua_nhan int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hoan_khao_sat_den date,
  ADD COLUMN IF NOT EXISTS dong_tu_dong_luc timestamptz,
  ADD COLUMN IF NOT EXISTS dong_boi text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'shop_don_hang_khao_sat_tra_loi_chk'
  ) THEN
    ALTER TABLE public.shop_don_hang
      ADD CONSTRAINT shop_don_hang_khao_sat_tra_loi_chk
      CHECK (
        khao_sat_tra_loi IS NULL
        OR khao_sat_tra_loi IN ('da_nhan', 'chua_nhan')
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'shop_don_hang_dong_boi_chk'
  ) THEN
    ALTER TABLE public.shop_don_hang
      ADD CONSTRAINT shop_don_hang_dong_boi_chk
      CHECK (
        dong_boi IS NULL
        OR dong_boi IN ('buyer', 'seller', 'he_thong')
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'shop_don_hang_so_lan_hoan_chk'
  ) THEN
    ALTER TABLE public.shop_don_hang
      ADD CONSTRAINT shop_don_hang_so_lan_hoan_chk
      CHECK (so_lan_hoan_chua_nhan >= 0);
  END IF;
END $$;

COMMENT ON COLUMN public.shop_don_hang.khao_sat_luc IS
  'P3a: lần khảo sát «đã nhận hàng?» gần nhất.';
COMMENT ON COLUMN public.shop_don_hang.khao_sat_tra_loi IS
  'P3a: da_nhan | chua_nhan.';
COMMENT ON COLUMN public.shop_don_hang.so_lan_hoan_chua_nhan IS
  'P3a: số lần buyer bấm chưa nhận (tối đa shop_so_lan_cho_hoan).';
COMMENT ON COLUMN public.shop_don_hang.hoan_khao_sat_den IS
  'P3a: ngày hẹn hỏi lại sau «chưa nhận».';
COMMENT ON COLUMN public.shop_don_hang.dong_tu_dong_luc IS
  'P3a: lúc hệ thống tự đóng đơn.';
COMMENT ON COLUMN public.shop_don_hang.dong_boi IS
  'P3a: buyer | seller | he_thong.';

CREATE INDEX IF NOT EXISTS idx_shop_don_dong_don_tick
  ON public.shop_don_hang (trang_thai, xac_nhan_luc)
  WHERE trang_thai IN (
    'da_nhan_tien',
    'cho_lay_hang',
    'dang_giao',
    'da_giao_tai_su_kien'
  );

-- B. cins_cau_hinh_tai_chinh — ngày khảo sát / tự đóng / hoãn
ALTER TABLE public.cins_cau_hinh_tai_chinh
  ADD COLUMN IF NOT EXISTS shop_ngay_khao_sat_su_kien int
    CHECK (shop_ngay_khao_sat_su_kien IS NULL OR shop_ngay_khao_sat_su_kien >= 0),
  ADD COLUMN IF NOT EXISTS shop_ngay_khao_sat_truc_tiep int
    CHECK (shop_ngay_khao_sat_truc_tiep IS NULL OR shop_ngay_khao_sat_truc_tiep >= 0),
  ADD COLUMN IF NOT EXISTS shop_ngay_khao_sat_online int
    CHECK (shop_ngay_khao_sat_online IS NULL OR shop_ngay_khao_sat_online >= 0),
  ADD COLUMN IF NOT EXISTS shop_ngay_tu_dong_su_kien int
    CHECK (shop_ngay_tu_dong_su_kien IS NULL OR shop_ngay_tu_dong_su_kien >= 0),
  ADD COLUMN IF NOT EXISTS shop_ngay_tu_dong_truc_tiep int
    CHECK (shop_ngay_tu_dong_truc_tiep IS NULL OR shop_ngay_tu_dong_truc_tiep >= 0),
  ADD COLUMN IF NOT EXISTS shop_ngay_tu_dong_online int
    CHECK (shop_ngay_tu_dong_online IS NULL OR shop_ngay_tu_dong_online >= 0),
  ADD COLUMN IF NOT EXISTS shop_ngay_tu_dong_online_khong_ma int
    CHECK (
      shop_ngay_tu_dong_online_khong_ma IS NULL
      OR shop_ngay_tu_dong_online_khong_ma >= 0
    ),
  ADD COLUMN IF NOT EXISTS shop_so_lan_cho_hoan int
    CHECK (shop_so_lan_cho_hoan IS NULL OR shop_so_lan_cho_hoan >= 0),
  ADD COLUMN IF NOT EXISTS shop_ngay_hoan_chua_nhan int
    CHECK (shop_ngay_hoan_chua_nhan IS NULL OR shop_ngay_hoan_chua_nhan >= 0);

COMMENT ON COLUMN public.cins_cau_hinh_tai_chinh.shop_ngay_tu_dong_su_kien IS
  'P3a: ngày tự đóng đơn tai_su_kien (mặc định 3).';
COMMENT ON COLUMN public.cins_cau_hinh_tai_chinh.shop_so_lan_cho_hoan IS
  'P3a: tối đa lần buyer «chưa nhận» trước khi mở khiếu nại (mặc định 2).';
