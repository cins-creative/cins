-- Học phí combo + nhóm đơn (Phase 3–4).
-- Idempotent. Phần A (A18) · B (combo) · C (nhóm đơn + A19) · RPC.

-- =============================================================================
-- Phần A — ALTER org_goi_hoc_phi (A18)
-- =============================================================================
ALTER TABLE public.org_goi_hoc_phi
  ADD COLUMN IF NOT EXISTS so_buoi int4,
  ADD COLUMN IF NOT EXISTS phut_moi_buoi int4,
  ADD COLUMN IF NOT EXISTS ma_goi_meta text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_org_goi_hoc_phi_meta
  ON public.org_goi_hoc_phi (id_khoa_hoc, ma_goi_meta)
  WHERE ma_goi_meta IS NOT NULL;

-- =============================================================================
-- Phần B — org_combo_hoc_phi + org_combo_thanh_phan
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.org_combo_hoc_phi (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_to_chuc       uuid NOT NULL REFERENCES public.org_to_chuc(id) ON DELETE CASCADE,
  ten              text NOT NULL,
  mo_ta            text,
  loai_giam        text NOT NULL CHECK (loai_giam IN ('phan_tram', 'so_tien')),
  gia_tri_giam     numeric(14, 0) NOT NULL CHECK (gia_tri_giam >= 0),
  giam_toi_da_vnd  numeric(14, 0),
  ap_dung_tu       date,
  ap_dung_den      date,
  hien_trang_khoa  boolean NOT NULL DEFAULT true,
  dang_ban         boolean NOT NULL DEFAULT true,
  thu_tu           int4 NOT NULL DEFAULT 0,
  da_xoa           boolean NOT NULL DEFAULT false,
  tao_luc          timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_combo_phan_tram_chk
    CHECK (loai_giam <> 'phan_tram' OR gia_tri_giam <= 100),
  CONSTRAINT org_combo_ngay_chk
    CHECK (ap_dung_den IS NULL OR ap_dung_tu IS NULL OR ap_dung_den >= ap_dung_tu)
);

CREATE INDEX IF NOT EXISTS idx_org_combo_hoc_phi_org
  ON public.org_combo_hoc_phi (id_to_chuc, dang_ban, thu_tu)
  WHERE da_xoa = false;

COMMENT ON TABLE public.org_combo_hoc_phi IS
  'Combo giảm giá khi học ≥2 khóa khác nhau (% hoặc số tiền).';

CREATE TABLE IF NOT EXISTS public.org_combo_thanh_phan (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_combo     uuid NOT NULL REFERENCES public.org_combo_hoc_phi(id) ON DELETE CASCADE,
  id_khoa_hoc  uuid NOT NULL REFERENCES public.org_khoa_hoc(id) ON DELETE CASCADE,
  id_goi       uuid REFERENCES public.org_goi_hoc_phi(id) ON DELETE CASCADE,
  tao_luc      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_org_combo_thanh_phan
    UNIQUE NULLS NOT DISTINCT (id_combo, id_khoa_hoc, id_goi)
);

CREATE INDEX IF NOT EXISTS idx_org_combo_thanh_phan_combo
  ON public.org_combo_thanh_phan (id_combo);
CREATE INDEX IF NOT EXISTS idx_org_combo_thanh_phan_khoa
  ON public.org_combo_thanh_phan (id_khoa_hoc);

COMMENT ON TABLE public.org_combo_thanh_phan IS
  'Thành phần combo: khóa (+ gói cụ thể tùy chọn; NULL = mọi gói khóa).';

-- =============================================================================
-- Phần C — org_nhom_don_hoc_phi + ALTER org_don_hoc_phi (A19)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.org_nhom_don_hoc_phi (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_to_chuc       uuid NOT NULL REFERENCES public.org_to_chuc(id) ON DELETE CASCADE,
  id_nguoi_dung    uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  id_combo         uuid REFERENCES public.org_combo_hoc_phi(id) ON DELETE SET NULL,
  ma_nhom          text,
  ten_combo_luu    text,
  loai_giam_luu    text,
  gia_tri_giam_luu numeric(14, 0),
  gia_goc_vnd      numeric(14, 0) NOT NULL DEFAULT 0 CHECK (gia_goc_vnd >= 0),
  giam_vnd         numeric(14, 0) NOT NULL DEFAULT 0 CHECK (giam_vnd >= 0),
  tong_vnd         numeric(14, 0) NOT NULL DEFAULT 0 CHECK (tong_vnd >= 0),
  tao_luc          timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_nhom_don_tong_chk CHECK (tong_vnd = gia_goc_vnd - giam_vnd)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_org_nhom_don_ma
  ON public.org_nhom_don_hoc_phi (ma_nhom)
  WHERE ma_nhom IS NOT NULL AND ma_nhom <> '';
CREATE INDEX IF NOT EXISTS idx_org_nhom_don_org
  ON public.org_nhom_don_hoc_phi (id_to_chuc, tao_luc DESC);

COMMENT ON TABLE public.org_nhom_don_hoc_phi IS
  'Nhóm đơn học phí (combo): snapshot giảm giá + 1 mã QR chung.';

ALTER TABLE public.org_don_hoc_phi
  ADD COLUMN IF NOT EXISTS id_nhom uuid
    REFERENCES public.org_nhom_don_hoc_phi(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS gia_goc_vnd numeric(14, 0),
  ADD COLUMN IF NOT EXISTS giam_vnd numeric(14, 0) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'org_don_hoc_phi_giam_vnd_chk'
       AND conrelid = 'public.org_don_hoc_phi'::regclass
  ) THEN
    ALTER TABLE public.org_don_hoc_phi
      ADD CONSTRAINT org_don_hoc_phi_giam_vnd_chk CHECK (giam_vnd >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_org_don_hoc_phi_nhom
  ON public.org_don_hoc_phi (id_nhom) WHERE id_nhom IS NOT NULL;

UPDATE public.org_don_hoc_phi
   SET gia_goc_vnd = so_tien_vnd
 WHERE gia_goc_vnd IS NULL;

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE public.org_combo_hoc_phi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_combo_thanh_phan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_nhom_don_hoc_phi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_combo_doc_dang_ban ON public.org_combo_hoc_phi;
CREATE POLICY org_combo_doc_dang_ban ON public.org_combo_hoc_phi
  FOR SELECT TO authenticated
  USING (dang_ban = true AND da_xoa = false AND hien_trang_khoa = true);

DROP POLICY IF EXISTS org_combo_tp_doc ON public.org_combo_thanh_phan;
CREATE POLICY org_combo_tp_doc ON public.org_combo_thanh_phan
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.org_combo_hoc_phi c
    WHERE c.id = id_combo
      AND c.dang_ban = true AND c.da_xoa = false AND c.hien_trang_khoa = true
  ));

DROP POLICY IF EXISTS org_nhom_don_doc_chu_don ON public.org_nhom_don_hoc_phi;
CREATE POLICY org_nhom_don_doc_chu_don ON public.org_nhom_don_hoc_phi
  FOR SELECT TO authenticated
  USING (id_nguoi_dung = (select auth.uid()));

-- =============================================================================
-- RPC — lưu combo + thành phần nguyên tử
-- =============================================================================
CREATE OR REPLACE FUNCTION public.cins_luu_combo_hoc_phi(
  p_org uuid,
  p_combo jsonb,
  p_thanh_phan jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_ten text;
  v_mo_ta text;
  v_loai text;
  v_gia_tri numeric(14, 0);
  v_toi_da numeric(14, 0);
  v_tu date;
  v_den date;
  v_hien boolean;
  v_dang_ban boolean;
  v_thu_tu int4;
  v_tp jsonb;
  v_khoa uuid;
  v_goi uuid;
  v_khoa_count int;
BEGIN
  IF p_org IS NULL THEN
    RAISE EXCEPTION 'Thiếu id_to_chuc';
  END IF;

  v_id := NULLIF(p_combo->>'id', '')::uuid;
  v_ten := trim(COALESCE(p_combo->>'ten', ''));
  IF v_ten = '' THEN
    RAISE EXCEPTION 'Tên combo không được trống';
  END IF;

  v_mo_ta := NULLIF(trim(COALESCE(p_combo->>'mo_ta', '')), '');
  v_loai := COALESCE(p_combo->>'loai_giam', '');
  IF v_loai NOT IN ('phan_tram', 'so_tien') THEN
    RAISE EXCEPTION 'loai_giam không hợp lệ';
  END IF;

  v_gia_tri := COALESCE((p_combo->>'gia_tri_giam')::numeric, 0);
  IF v_gia_tri < 0 THEN
    RAISE EXCEPTION 'gia_tri_giam phải ≥ 0';
  END IF;
  IF v_loai = 'phan_tram' AND (v_gia_tri <= 0 OR v_gia_tri > 100) THEN
    RAISE EXCEPTION 'phan_tram phải trong (0, 100]';
  END IF;

  v_toi_da := NULLIF(p_combo->>'giam_toi_da_vnd', '')::numeric;
  v_tu := NULLIF(p_combo->>'ap_dung_tu', '')::date;
  v_den := NULLIF(p_combo->>'ap_dung_den', '')::date;
  v_hien := COALESCE((p_combo->>'hien_trang_khoa')::boolean, true);
  v_dang_ban := COALESCE((p_combo->>'dang_ban')::boolean, true);
  v_thu_tu := COALESCE((p_combo->>'thu_tu')::int4, 0);

  IF jsonb_typeof(p_thanh_phan) <> 'array' OR jsonb_array_length(p_thanh_phan) < 2 THEN
    RAISE EXCEPTION 'Combo cần ≥ 2 thành phần';
  END IF;

  SELECT count(DISTINCT (tp->>'id_khoa_hoc'))
    INTO v_khoa_count
    FROM jsonb_array_elements(p_thanh_phan) tp
   WHERE NULLIF(tp->>'id_khoa_hoc', '') IS NOT NULL;

  IF v_khoa_count < 2 THEN
    RAISE EXCEPTION 'Combo cần ≥ 2 khóa khác nhau';
  END IF;

  -- Verify mọi khóa thuộc org
  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_thanh_phan) tp
      LEFT JOIN public.org_khoa_hoc k
        ON k.id = NULLIF(tp->>'id_khoa_hoc', '')::uuid
     WHERE k.id IS NULL OR k.id_to_chuc <> p_org
  ) THEN
    RAISE EXCEPTION 'Khóa học không thuộc cơ sở';
  END IF;

  -- Verify gói (nếu có) thuộc đúng khóa + org
  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_thanh_phan) tp
      JOIN public.org_goi_hoc_phi g
        ON g.id = NULLIF(tp->>'id_goi', '')::uuid
     WHERE g.id_to_chuc <> p_org
        OR (
          g.id_khoa_hoc IS NOT NULL
          AND g.id_khoa_hoc <> NULLIF(tp->>'id_khoa_hoc', '')::uuid
          AND NOT EXISTS (
            SELECT 1 FROM public.org_goi_hoc_phi_khoa gk
             WHERE gk.id_goi = g.id
               AND gk.id_khoa_hoc = NULLIF(tp->>'id_khoa_hoc', '')::uuid
          )
        )
  ) THEN
    RAISE EXCEPTION 'Gói không khớp khóa hoặc cơ sở';
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO public.org_combo_hoc_phi (
      id_to_chuc, ten, mo_ta, loai_giam, gia_tri_giam, giam_toi_da_vnd,
      ap_dung_tu, ap_dung_den, hien_trang_khoa, dang_ban, thu_tu
    ) VALUES (
      p_org, v_ten, v_mo_ta, v_loai, v_gia_tri, v_toi_da,
      v_tu, v_den, v_hien, v_dang_ban, v_thu_tu
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.org_combo_hoc_phi
       SET ten = v_ten,
           mo_ta = v_mo_ta,
           loai_giam = v_loai,
           gia_tri_giam = v_gia_tri,
           giam_toi_da_vnd = v_toi_da,
           ap_dung_tu = v_tu,
           ap_dung_den = v_den,
           hien_trang_khoa = v_hien,
           dang_ban = v_dang_ban,
           thu_tu = v_thu_tu,
           cap_nhat_luc = now()
     WHERE id = v_id
       AND id_to_chuc = p_org
       AND da_xoa = false;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Không tìm thấy combo';
    END IF;
    DELETE FROM public.org_combo_thanh_phan WHERE id_combo = v_id;
  END IF;

  FOR v_tp IN SELECT * FROM jsonb_array_elements(p_thanh_phan)
  LOOP
    v_khoa := NULLIF(v_tp->>'id_khoa_hoc', '')::uuid;
    v_goi := NULLIF(v_tp->>'id_goi', '')::uuid;
    INSERT INTO public.org_combo_thanh_phan (id_combo, id_khoa_hoc, id_goi)
    VALUES (v_id, v_khoa, v_goi);
  END LOOP;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cins_luu_combo_hoc_phi(uuid, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cins_luu_combo_hoc_phi(uuid, jsonb, jsonb) TO service_role;
