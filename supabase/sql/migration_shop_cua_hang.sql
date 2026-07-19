-- L33 follow-up: hồ sơ cửa hàng + phương thức nhận tiền (P2P) + snapshot trên đơn
-- Idempotent.

CREATE TABLE IF NOT EXISTS public.shop_cua_hang (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_nguoi_dung   uuid NOT NULL UNIQUE
                    REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  ten             text,
  mo_ta           text,
  avatar_id       text,
  cover_id        text,
  chinh_sach      text,
  lien_he         text,
  tao_luc         timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.shop_cua_hang IS
  'Mặt tiền cửa hàng UGC (1–1 user). Tách avatar/banner/policy khỏi hồ sơ MXH.';

CREATE INDEX IF NOT EXISTS idx_shop_cua_hang_owner
  ON public.shop_cua_hang (id_nguoi_dung);

CREATE TABLE IF NOT EXISTS public.shop_phuong_thuc_tt (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cua_hang         uuid NOT NULL
                        REFERENCES public.shop_cua_hang(id) ON DELETE CASCADE,
  ngan_hang           text NOT NULL,
  so_tai_khoan        text NOT NULL,
  ten_chu_tai_khoan   text NOT NULL,
  qr_anh_id           text,
  mac_dinh            boolean NOT NULL DEFAULT false,
  kich_hoat           boolean NOT NULL DEFAULT true,
  thu_tu              integer NOT NULL DEFAULT 0,
  tao_luc             timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.shop_phuong_thuc_tt IS
  'STK / QR nhận tiền P2P của cửa hàng. CINs không cầm tiền.';

CREATE INDEX IF NOT EXISTS idx_shop_pttt_cua_hang
  ON public.shop_phuong_thuc_tt (id_cua_hang, kich_hoat, mac_dinh DESC, thu_tu);

ALTER TABLE public.shop_don_hang
  ADD COLUMN IF NOT EXISTS thanh_toan_snapshot jsonb;

COMMENT ON COLUMN public.shop_don_hang.thanh_toan_snapshot IS
  'Snapshot STK/QR/nội dung CK lúc tạo đơn mua_ngay (tránh đổi TK giữa chừng).';

ALTER TABLE public.shop_cua_hang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_phuong_thuc_tt ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shop_cua_hang_owner ON public.shop_cua_hang;
CREATE POLICY shop_cua_hang_owner ON public.shop_cua_hang
  FOR ALL
  USING (id_nguoi_dung = public.current_profile_id())
  WITH CHECK (id_nguoi_dung = public.current_profile_id());

DROP POLICY IF EXISTS shop_cua_hang_doc_cong_khai ON public.shop_cua_hang;
CREATE POLICY shop_cua_hang_doc_cong_khai ON public.shop_cua_hang
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_nguoi_dung u
      WHERE u.id = id_nguoi_dung
        AND u.ban_hang_bat = true
    )
  );

DROP POLICY IF EXISTS shop_pttt_owner ON public.shop_phuong_thuc_tt;
CREATE POLICY shop_pttt_owner ON public.shop_phuong_thuc_tt
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.shop_cua_hang c
      WHERE c.id = id_cua_hang
        AND c.id_nguoi_dung = public.current_profile_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shop_cua_hang c
      WHERE c.id = id_cua_hang
        AND c.id_nguoi_dung = public.current_profile_id()
    )
  );

DROP POLICY IF EXISTS shop_pttt_doc_cong_khai ON public.shop_phuong_thuc_tt;
CREATE POLICY shop_pttt_doc_cong_khai ON public.shop_phuong_thuc_tt
  FOR SELECT
  USING (
    kich_hoat = true
    AND EXISTS (
      SELECT 1
      FROM public.shop_cua_hang c
      JOIN public.user_nguoi_dung u ON u.id = c.id_nguoi_dung
      WHERE c.id = id_cua_hang
        AND u.ban_hang_bat = true
    )
  );
