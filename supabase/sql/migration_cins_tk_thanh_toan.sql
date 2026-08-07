-- P1 — Tài khoản thanh toán CINs (PLAN_thanh_toan_tai_cau_truc.md §5 P1)
-- Bảng mới: cins_tk_thanh_toan · cins_dich_vu · cins_tk_nguoi_phu_trach
-- KHÔNG ALTER bảng live (org_phi_* / shop_phi_* giữ nguyên — P2 mới nối id_hoa_don).
-- Target: CINS production ospzzzxcomrmhqrnkoiw.
-- Chạy: npm run migrate:cins-tk-thanh-toan
-- Idempotent.

-- ═══════════════════════════════════════════════════════════════
-- 1. cins_tk_thanh_toan — 1 : 1 với user owner (chủ thể nợ)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.cins_tk_thanh_toan (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_nguoi_dung         uuid NOT NULL
                          REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  ten_phap_nhan         text,
  mst                   text,
  dia_chi               text,
  email_hoa_don         text,
  han_muc_vnd           bigint NOT NULL DEFAULT 0
                          CHECK (han_muc_vnd >= 0),
  trang_thai            text NOT NULL DEFAULT 'hoat_dong'
                          CHECK (trang_thai IN ('hoat_dong', 'canh_bao', 'han_che', 'khoa')),
  ly_do_khoa_tu_dong    text,
  ly_do_khoa_thu_cong   text,
  no_da_xoa_vnd         bigint NOT NULL DEFAULT 0
                          CHECK (no_da_xoa_vnd >= 0),
  tao_luc               timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_cins_tk_thanh_toan_user UNIQUE (id_nguoi_dung)
);

COMMENT ON TABLE public.cins_tk_thanh_toan IS
  'Tài khoản thanh toán nền tảng CINs — 1:1 user owner. Gom nợ csdt_phi + shop_phi + ads.';

COMMENT ON COLUMN public.cins_tk_thanh_toan.ly_do_khoa_tu_dong IS
  'Lý do khoá từ gate tự động — tách khỏi khoá tay (sửa B2).';

COMMENT ON COLUMN public.cins_tk_thanh_toan.ly_do_khoa_thu_cong IS
  'Lý do khoá thủ công admin — không bị gate ghi đè.';

CREATE INDEX IF NOT EXISTS idx_cins_tk_thanh_toan_trang_thai
  ON public.cins_tk_thanh_toan (trang_thai);

-- ═══════════════════════════════════════════════════════════════
-- 2. cins_tk_nguoi_phu_trach — người xem/trả hộ (kế toán)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.cins_tk_nguoi_phu_trach (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_tk           uuid NOT NULL
                    REFERENCES public.cins_tk_thanh_toan(id) ON DELETE CASCADE,
  id_nguoi_dung   uuid NOT NULL
                    REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  vai_tro         text NOT NULL DEFAULT 'quan_ly'
                    CHECK (vai_tro IN ('quan_ly')),
  tao_luc         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_cins_tk_nguoi_phu_trach UNIQUE (id_tk, id_nguoi_dung)
);

COMMENT ON TABLE public.cins_tk_nguoi_phu_trach IS
  'Người phụ trách xem/trả hộ ngoài owner. Owner đã thấy qua cins_tk_thanh_toan.id_nguoi_dung.';

CREATE INDEX IF NOT EXISTS idx_cins_tk_nguoi_phu_trach_user
  ON public.cins_tk_nguoi_phu_trach (id_nguoi_dung);

-- ═══════════════════════════════════════════════════════════════
-- 3. cins_dich_vu — dòng dịch vụ (csdt_phi / shop_phi / ads)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.cins_dich_vu (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_tk                   uuid NOT NULL
                            REFERENCES public.cins_tk_thanh_toan(id) ON DELETE CASCADE,
  loai                    text NOT NULL
                            CHECK (loai IN ('csdt_phi', 'shop_phi', 'ads')),
  tham_chieu_id           uuid NOT NULL,
  ty_le                   numeric(5, 4)
                            CHECK (ty_le IS NULL OR (ty_le >= 0 AND ty_le <= 1)),
  nguong_chot_vnd         bigint
                            CHECK (nguong_chot_vnd IS NULL OR nguong_chot_vnd >= 0),
  toi_thieu_xuat_ky_vnd   bigint
                            CHECK (toi_thieu_xuat_ky_vnd IS NULL OR toi_thieu_xuat_ky_vnd >= 0),
  so_ngay_han_tra         int
                            CHECK (so_ngay_han_tra IS NULL OR so_ngay_han_tra >= 0),
  da_dung_chay_thu        boolean NOT NULL DEFAULT false,
  trang_thai              text NOT NULL DEFAULT 'hoat_dong'
                            CHECK (trang_thai IN ('hoat_dong', 'tam_dung', 'dong')),
  hd_ten_phap_nhan        text,
  hd_mst                  text,
  hd_dia_chi              text,
  hd_email                text,
  tao_luc                 timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_cins_dich_vu_loai_tham_chieu UNIQUE (loai, tham_chieu_id)
);

COMMENT ON TABLE public.cins_dich_vu IS
  'Dòng dịch vụ gắn tài khoản thanh toán. Bên mua HĐ (hd_*) riêng từng dòng; null → rơi về tk mặc định.';

COMMENT ON COLUMN public.cins_dich_vu.tham_chieu_id IS
  'orgId (csdt_phi) · sellerId (shop_phi) · adsId (ads).';

COMMENT ON COLUMN public.cins_dich_vu.ty_le IS
  'Snapshot tham số lúc tạo/override; mặc định lấy từ /admin/tai-chinh khi tạo.';

CREATE INDEX IF NOT EXISTS idx_cins_dich_vu_tk
  ON public.cins_dich_vu (id_tk, loai);

CREATE INDEX IF NOT EXISTS idx_cins_dich_vu_tham_chieu
  ON public.cins_dich_vu (tham_chieu_id);

-- ═══════════════════════════════════════════════════════════════
-- 4. Helpers RLS (sau khi có bảng)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.can_doc_cins_tk(p_tk uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cins_tk_thanh_toan t
    WHERE t.id = p_tk
      AND t.id_nguoi_dung = public.current_profile_id()
  )
  OR EXISTS (
    SELECT 1
    FROM public.cins_tk_nguoi_phu_trach p
    WHERE p.id_tk = p_tk
      AND p.id_nguoi_dung = public.current_profile_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_sua_cins_tk(p_tk uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cins_tk_thanh_toan t
    WHERE t.id = p_tk
      AND t.id_nguoi_dung = public.current_profile_id()
  )
  OR EXISTS (
    SELECT 1
    FROM public.cins_tk_nguoi_phu_trach p
    WHERE p.id_tk = p_tk
      AND p.id_nguoi_dung = public.current_profile_id()
      AND p.vai_tro = 'quan_ly'
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_doc_cins_tk(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_sua_cins_tk(uuid) TO authenticated;

-- ═══════════════════════════════════════════════════════════════
-- 5. RLS policies
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.cins_tk_thanh_toan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cins_tk_thanh_toan_select ON public.cins_tk_thanh_toan;
CREATE POLICY cins_tk_thanh_toan_select ON public.cins_tk_thanh_toan
  FOR SELECT
  TO authenticated
  USING (public.can_doc_cins_tk(id));

DROP POLICY IF EXISTS cins_tk_thanh_toan_update ON public.cins_tk_thanh_toan;
CREATE POLICY cins_tk_thanh_toan_update ON public.cins_tk_thanh_toan
  FOR UPDATE
  TO authenticated
  USING (public.can_sua_cins_tk(id))
  WITH CHECK (public.can_sua_cins_tk(id));

GRANT SELECT, UPDATE ON TABLE public.cins_tk_thanh_toan TO authenticated;
GRANT ALL ON TABLE public.cins_tk_thanh_toan TO service_role;
REVOKE INSERT, DELETE ON TABLE public.cins_tk_thanh_toan FROM authenticated;
REVOKE ALL ON TABLE public.cins_tk_thanh_toan FROM anon;

ALTER TABLE public.cins_tk_nguoi_phu_trach ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cins_tk_nguoi_phu_trach_select ON public.cins_tk_nguoi_phu_trach;
CREATE POLICY cins_tk_nguoi_phu_trach_select ON public.cins_tk_nguoi_phu_trach
  FOR SELECT
  TO authenticated
  USING (public.can_doc_cins_tk(id_tk));

DROP POLICY IF EXISTS cins_tk_nguoi_phu_trach_insert ON public.cins_tk_nguoi_phu_trach;
CREATE POLICY cins_tk_nguoi_phu_trach_insert ON public.cins_tk_nguoi_phu_trach
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_sua_cins_tk(id_tk));

DROP POLICY IF EXISTS cins_tk_nguoi_phu_trach_delete ON public.cins_tk_nguoi_phu_trach;
CREATE POLICY cins_tk_nguoi_phu_trach_delete ON public.cins_tk_nguoi_phu_trach
  FOR DELETE
  TO authenticated
  USING (public.can_sua_cins_tk(id_tk));

GRANT SELECT, INSERT, DELETE ON TABLE public.cins_tk_nguoi_phu_trach TO authenticated;
GRANT ALL ON TABLE public.cins_tk_nguoi_phu_trach TO service_role;
REVOKE UPDATE ON TABLE public.cins_tk_nguoi_phu_trach FROM authenticated;
REVOKE ALL ON TABLE public.cins_tk_nguoi_phu_trach FROM anon;

ALTER TABLE public.cins_dich_vu ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cins_dich_vu_select ON public.cins_dich_vu;
CREATE POLICY cins_dich_vu_select ON public.cins_dich_vu
  FOR SELECT
  TO authenticated
  USING (public.can_doc_cins_tk(id_tk));

DROP POLICY IF EXISTS cins_dich_vu_update ON public.cins_dich_vu;
CREATE POLICY cins_dich_vu_update ON public.cins_dich_vu
  FOR UPDATE
  TO authenticated
  USING (public.can_sua_cins_tk(id_tk))
  WITH CHECK (public.can_sua_cins_tk(id_tk));

GRANT SELECT, UPDATE ON TABLE public.cins_dich_vu TO authenticated;
GRANT ALL ON TABLE public.cins_dich_vu TO service_role;
REVOKE INSERT, DELETE ON TABLE public.cins_dich_vu FROM authenticated;
REVOKE ALL ON TABLE public.cins_dich_vu FROM anon;
