-- =====================================================================
-- migration_shop_combo_voucher.sql — Shop combo + voucher (+ ví buyer)
-- Idempotent. CINs ospzzzxcomrmhqrnkoiw.
-- Plan: docs/PLAN_shop_combo_voucher.md
-- =====================================================================

-- ── Enums ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.shop_loai_giam_enum AS ENUM ('phan_tram', 'so_tien');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.shop_voucher_design_enum AS ENUM ('mac_dinh', 'rieng');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.shop_combo_pham_vi_enum AS ENUM ('loai_hang', 'san_pham', 'bien_the');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── shop_combo ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shop_combo (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_nguoi_dung   uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  ten             text NOT NULL,
  mo_ta           text,
  loai_giam       public.shop_loai_giam_enum NOT NULL,
  gia_tri         numeric(18, 2) NOT NULL CHECK (gia_tri > 0),
  giam_toi_da     numeric(18, 2) CHECK (giam_toi_da IS NULL OR giam_toi_da > 0),
  ap_dung_lap     boolean NOT NULL DEFAULT false,
  bat_dau         timestamptz,
  ket_thuc        timestamptz,
  kich_hoat       boolean NOT NULL DEFAULT true,
  thu_tu          integer NOT NULL DEFAULT 0,
  da_xoa          boolean NOT NULL DEFAULT false,
  tao_luc         timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shop_combo_ten_len CHECK (
    char_length(btrim(ten)) > 0 AND char_length(ten) <= 80
  ),
  CONSTRAINT shop_combo_mo_ta_len CHECK (
    mo_ta IS NULL OR char_length(mo_ta) <= 280
  ),
  CONSTRAINT shop_combo_phan_tram_chk CHECK (
    loai_giam <> 'phan_tram' OR gia_tri <= 100
  ),
  CONSTRAINT shop_combo_thoi_gian_chk CHECK (
    ket_thuc IS NULL OR bat_dau IS NULL OR ket_thuc > bat_dau
  )
);

CREATE INDEX IF NOT EXISTS idx_shop_combo_owner
  ON public.shop_combo (id_nguoi_dung, thu_tu, tao_luc DESC)
  WHERE da_xoa = false;

CREATE INDEX IF NOT EXISTS idx_shop_combo_kich_hoat
  ON public.shop_combo (id_nguoi_dung, kich_hoat)
  WHERE da_xoa = false AND kich_hoat = true;

COMMENT ON TABLE public.shop_combo IS
  'Combo & discount: mua đủ tổ hợp → giảm % hoặc số tiền cố định.';

-- ── shop_combo_dieu_kien (đa phạm vi) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shop_combo_dieu_kien (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_combo      uuid NOT NULL REFERENCES public.shop_combo(id) ON DELETE CASCADE,
  pham_vi       public.shop_combo_pham_vi_enum NOT NULL,
  id_nhom       uuid REFERENCES public.shop_nhom(id) ON DELETE CASCADE,
  id_san_pham   uuid REFERENCES public.shop_san_pham(id) ON DELETE CASCADE,
  id_bien_the   uuid REFERENCES public.shop_bien_the(id) ON DELETE CASCADE,
  so_luong      integer NOT NULL CHECK (so_luong > 0),
  CONSTRAINT shop_combo_dieu_kien_scope_chk CHECK (
    (pham_vi = 'loai_hang' AND id_nhom IS NOT NULL AND id_san_pham IS NULL AND id_bien_the IS NULL)
    OR (pham_vi = 'san_pham' AND id_san_pham IS NOT NULL AND id_nhom IS NULL AND id_bien_the IS NULL)
    OR (pham_vi = 'bien_the' AND id_bien_the IS NOT NULL AND id_nhom IS NULL AND id_san_pham IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS shop_combo_dk_nhom_uk
  ON public.shop_combo_dieu_kien (id_combo, id_nhom)
  WHERE id_nhom IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS shop_combo_dk_sp_uk
  ON public.shop_combo_dieu_kien (id_combo, id_san_pham)
  WHERE id_san_pham IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS shop_combo_dk_bt_uk
  ON public.shop_combo_dieu_kien (id_combo, id_bien_the)
  WHERE id_bien_the IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shop_combo_dieu_kien_combo
  ON public.shop_combo_dieu_kien (id_combo);

COMMENT ON TABLE public.shop_combo_dieu_kien IS
  'Điều kiện combo: loại hàng / mặt hàng / biến thể (đúng 1 FK theo pham_vi).';

-- ── shop_voucher ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shop_voucher (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_nguoi_dung       uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  ma                  text NOT NULL,
  ten                 text NOT NULL,
  mo_ta               text,
  loai_giam           public.shop_loai_giam_enum NOT NULL,
  gia_tri             numeric(18, 2) NOT NULL CHECK (gia_tri > 0),
  giam_toi_da         numeric(18, 2) CHECK (giam_toi_da IS NULL OR giam_toi_da > 0),
  don_toi_thieu       numeric(18, 2) NOT NULL DEFAULT 0 CHECK (don_toi_thieu >= 0),
  so_luong_tong       integer CHECK (so_luong_tong IS NULL OR so_luong_tong > 0),
  so_luong_da_dung    integer NOT NULL DEFAULT 0 CHECK (so_luong_da_dung >= 0),
  gioi_han_moi_nguoi  integer NOT NULL DEFAULT 1 CHECK (gioi_han_moi_nguoi >= 0),
  bat_dau             timestamptz,
  ket_thuc            timestamptz,
  kich_hoat           boolean NOT NULL DEFAULT true,
  cong_khai           boolean NOT NULL DEFAULT true,
  design_kieu         public.shop_voucher_design_enum NOT NULL DEFAULT 'mac_dinh',
  design_anh_id       text,
  design_mau_nen      text,
  design_mau_chu      text,
  design_nhan         text,
  da_xoa              boolean NOT NULL DEFAULT false,
  tao_luc             timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shop_voucher_ma_len CHECK (
    char_length(ma) >= 3 AND char_length(ma) <= 20
    AND ma ~ '^[A-Z0-9]+$'
  ),
  CONSTRAINT shop_voucher_ten_len CHECK (
    char_length(btrim(ten)) > 0 AND char_length(ten) <= 80
  ),
  CONSTRAINT shop_voucher_mo_ta_len CHECK (
    mo_ta IS NULL OR char_length(mo_ta) <= 280
  ),
  CONSTRAINT shop_voucher_phan_tram_chk CHECK (
    loai_giam <> 'phan_tram' OR gia_tri <= 100
  ),
  CONSTRAINT shop_voucher_thoi_gian_chk CHECK (
    ket_thuc IS NULL OR bat_dau IS NULL OR ket_thuc > bat_dau
  ),
  CONSTRAINT shop_voucher_design_mau_nen_chk CHECK (
    design_mau_nen IS NULL OR design_mau_nen ~ '^#[0-9A-Fa-f]{6}$'
  ),
  CONSTRAINT shop_voucher_design_mau_chu_chk CHECK (
    design_mau_chu IS NULL OR design_mau_chu ~ '^#[0-9A-Fa-f]{6}$'
  ),
  CONSTRAINT shop_voucher_design_nhan_len CHECK (
    design_nhan IS NULL OR char_length(design_nhan) <= 24
  ),
  CONSTRAINT shop_voucher_da_dung_chk CHECK (
    so_luong_tong IS NULL OR so_luong_da_dung <= so_luong_tong
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS shop_voucher_ma_uk
  ON public.shop_voucher (id_nguoi_dung, ma)
  WHERE da_xoa = false;

CREATE INDEX IF NOT EXISTS idx_shop_voucher_owner
  ON public.shop_voucher (id_nguoi_dung, tao_luc DESC)
  WHERE da_xoa = false;

CREATE INDEX IF NOT EXISTS idx_shop_voucher_cong_khai
  ON public.shop_voucher (cong_khai, kich_hoat, ket_thuc)
  WHERE da_xoa = false AND cong_khai = true AND kich_hoat = true;

COMMENT ON TABLE public.shop_voucher IS
  'Mã giảm giá shop: buyer nhập lúc thanh toán; design mac_dinh | rieng.';

COMMENT ON COLUMN public.shop_voucher.don_toi_thieu IS
  'So với tong_hang (tiền hàng trước giảm combo/voucher).';

COMMENT ON COLUMN public.shop_voucher.gioi_han_moi_nguoi IS
  '0 = không giới hạn mỗi buyer; mặc định 1.';

-- ── shop_voucher_su_dung ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shop_voucher_su_dung (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_voucher      uuid NOT NULL REFERENCES public.shop_voucher(id) ON DELETE RESTRICT,
  id_nguoi_dung   uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  id_don_hang     uuid NOT NULL REFERENCES public.shop_don_hang(id) ON DELETE CASCADE,
  tien_giam       numeric(18, 2) NOT NULL CHECK (tien_giam >= 0),
  tao_luc         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shop_voucher_su_dung_don_uk UNIQUE (id_don_hang)
);

CREATE INDEX IF NOT EXISTS idx_shop_voucher_su_dung_buyer
  ON public.shop_voucher_su_dung (id_voucher, id_nguoi_dung);

COMMENT ON TABLE public.shop_voucher_su_dung IS
  'Lượt dùng voucher gắn đơn — 1 đơn ≤ 1 voucher.';

-- ── shop_voucher_luu (ví) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shop_voucher_luu (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_voucher      uuid NOT NULL REFERENCES public.shop_voucher(id) ON DELETE CASCADE,
  id_nguoi_dung   uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  tao_luc         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shop_voucher_luu_uk UNIQUE (id_voucher, id_nguoi_dung)
);

CREATE INDEX IF NOT EXISTS idx_shop_voucher_luu_buyer
  ON public.shop_voucher_luu (id_nguoi_dung, tao_luc DESC);

COMMENT ON TABLE public.shop_voucher_luu IS
  'Ví voucher buyer — lưu ≠ giữ chỗ; hiệu lực tính runtime từ shop_voucher.';

-- ── RPC atomic dùng voucher ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.shop_dung_voucher(
  p_id_voucher uuid,
  p_id_nguoi_dung uuid,
  p_id_don_hang uuid,
  p_tien_giam numeric
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gioi_han integer;
  v_da_dung integer;
  v_updated integer;
BEGIN
  IF p_id_voucher IS NULL
     OR p_id_nguoi_dung IS NULL
     OR p_id_don_hang IS NULL
     OR p_tien_giam IS NULL
     OR p_tien_giam < 0 THEN
    RAISE EXCEPTION 'VOUCHER_INVALID_ARGS';
  END IF;

  SELECT gioi_han_moi_nguoi INTO v_gioi_han
  FROM public.shop_voucher
  WHERE id = p_id_voucher
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VOUCHER_KHONG_TON_TAI';
  END IF;

  IF v_gioi_han > 0 THEN
    SELECT count(*)::integer INTO v_da_dung
    FROM public.shop_voucher_su_dung
    WHERE id_voucher = p_id_voucher
      AND id_nguoi_dung = p_id_nguoi_dung;
    IF v_da_dung >= v_gioi_han THEN
      RAISE EXCEPTION 'VOUCHER_DA_DUNG';
    END IF;
  END IF;

  UPDATE public.shop_voucher
  SET
    so_luong_da_dung = so_luong_da_dung + 1,
    cap_nhat_luc = now()
  WHERE id = p_id_voucher
    AND kich_hoat = true
    AND da_xoa = false
    AND (so_luong_tong IS NULL OR so_luong_da_dung < so_luong_tong)
    AND (bat_dau IS NULL OR bat_dau <= now())
    AND (ket_thuc IS NULL OR ket_thuc > now());

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'VOUCHER_HET_LUOT';
  END IF;

  INSERT INTO public.shop_voucher_su_dung (
    id_voucher, id_nguoi_dung, id_don_hang, tien_giam
  ) VALUES (
    p_id_voucher, p_id_nguoi_dung, p_id_don_hang, p_tien_giam
  );

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.shop_hoan_voucher(
  p_id_don_hang uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_voucher uuid;
BEGIN
  IF p_id_don_hang IS NULL THEN
    RETURN false;
  END IF;

  DELETE FROM public.shop_voucher_su_dung
  WHERE id_don_hang = p_id_don_hang
  RETURNING id_voucher INTO v_id_voucher;

  IF v_id_voucher IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.shop_voucher
  SET
    so_luong_da_dung = GREATEST(0, so_luong_da_dung - 1),
    cap_nhat_luc = now()
  WHERE id = v_id_voucher;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.shop_dung_voucher(uuid, uuid, uuid, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.shop_hoan_voucher(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shop_dung_voucher(uuid, uuid, uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.shop_hoan_voucher(uuid) TO service_role;

COMMENT ON FUNCTION public.shop_dung_voucher(uuid, uuid, uuid, numeric) IS
  'Atomic: tăng so_luong_da_dung + ghi shop_voucher_su_dung. Raise VOUCHER_* khi fail.';
COMMENT ON FUNCTION public.shop_hoan_voucher(uuid) IS
  'Hoàn lượt voucher khi hủy đơn.';

-- ── RLS ───────────────────────────────────────────────────────────────
ALTER TABLE public.shop_combo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_combo_dieu_kien ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_voucher ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_voucher_su_dung ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_voucher_luu ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shop_combo_owner ON public.shop_combo;
CREATE POLICY shop_combo_owner ON public.shop_combo
  FOR ALL
  USING (id_nguoi_dung = public.current_profile_id())
  WITH CHECK (id_nguoi_dung = public.current_profile_id());

DROP POLICY IF EXISTS shop_combo_doc_kich_hoat ON public.shop_combo;
CREATE POLICY shop_combo_doc_kich_hoat ON public.shop_combo
  FOR SELECT
  USING (da_xoa = false AND kich_hoat = true);

DROP POLICY IF EXISTS shop_combo_dieu_kien_owner ON public.shop_combo_dieu_kien;
CREATE POLICY shop_combo_dieu_kien_owner ON public.shop_combo_dieu_kien
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.shop_combo c
      WHERE c.id = id_combo
        AND c.id_nguoi_dung = public.current_profile_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shop_combo c
      WHERE c.id = id_combo
        AND c.id_nguoi_dung = public.current_profile_id()
    )
  );

DROP POLICY IF EXISTS shop_combo_dieu_kien_doc ON public.shop_combo_dieu_kien;
CREATE POLICY shop_combo_dieu_kien_doc ON public.shop_combo_dieu_kien
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shop_combo c
      WHERE c.id = id_combo
        AND c.da_xoa = false
        AND c.kich_hoat = true
    )
  );

DROP POLICY IF EXISTS shop_voucher_owner ON public.shop_voucher;
CREATE POLICY shop_voucher_owner ON public.shop_voucher
  FOR ALL
  USING (id_nguoi_dung = public.current_profile_id())
  WITH CHECK (id_nguoi_dung = public.current_profile_id());

DROP POLICY IF EXISTS shop_voucher_doc_cong_khai ON public.shop_voucher;
CREATE POLICY shop_voucher_doc_cong_khai ON public.shop_voucher
  FOR SELECT
  USING (da_xoa = false AND kich_hoat = true AND cong_khai = true);

DROP POLICY IF EXISTS shop_voucher_su_dung_buyer ON public.shop_voucher_su_dung;
CREATE POLICY shop_voucher_su_dung_buyer ON public.shop_voucher_su_dung
  FOR SELECT
  USING (id_nguoi_dung = public.current_profile_id());

DROP POLICY IF EXISTS shop_voucher_su_dung_seller ON public.shop_voucher_su_dung;
CREATE POLICY shop_voucher_su_dung_seller ON public.shop_voucher_su_dung
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shop_voucher v
      WHERE v.id = id_voucher
        AND v.id_nguoi_dung = public.current_profile_id()
    )
  );

DROP POLICY IF EXISTS shop_voucher_luu_owner ON public.shop_voucher_luu;
CREATE POLICY shop_voucher_luu_owner ON public.shop_voucher_luu
  FOR ALL
  USING (id_nguoi_dung = public.current_profile_id())
  WITH CHECK (id_nguoi_dung = public.current_profile_id());
