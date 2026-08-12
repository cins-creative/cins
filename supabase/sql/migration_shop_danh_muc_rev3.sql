-- =====================================================================
-- migration_shop_danh_muc_rev3.sql
-- Plan: docs/PLAN_shop_danh_muc_rev3.md (chốt §7 2026-08-12)
-- Idempotent. Không ALTER bảng cũ.
-- CINs ospzzzxcomrmhqrnkoiw.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Lá gộp: charm + keychain + coaster → charm-keychain
-- ---------------------------------------------------------------------
INSERT INTO public.shop_danh_muc (slug, ten, nganh_hang, mo_ta, thu_tu, trang_thai)
VALUES (
  'charm-keychain',
  'Charm, keychain & coaster',
  'merch',
  'Charm, móc khóa, coaster — cùng nhóm phụ kiện đeo/rời. Chất liệu → facet chat-lieu.',
  20,
  'hien'
)
ON CONFLICT (slug) DO UPDATE SET
  ten = EXCLUDED.ten,
  mo_ta = EXCLUDED.mo_ta,
  thu_tu = EXCLUDED.thu_tu,
  nganh_hang = EXCLUDED.nganh_hang,
  trang_thai = 'hien',
  cap_nhat_luc = now();

UPDATE public.shop_nhom n
SET
  id_danh_muc = d_new.id,
  cap_nhat_luc = now()
FROM public.shop_danh_muc d_old
JOIN public.shop_danh_muc d_new ON d_new.slug = 'charm-keychain'
WHERE n.id_danh_muc = d_old.id
  AND d_old.slug IN ('charm-coaster', 'keychain')
  AND n.da_xoa = false;

UPDATE public.shop_danh_muc_alias a
SET id_danh_muc = d_new.id
FROM public.shop_danh_muc d_old
JOIN public.shop_danh_muc d_new ON d_new.slug = 'charm-keychain'
WHERE a.id_danh_muc = d_old.id
  AND d_old.slug IN ('charm-coaster', 'keychain');

INSERT INTO public.shop_danh_muc_alias (id_danh_muc, tu_khoa)
SELECT d.id, a.tu_khoa
FROM public.shop_danh_muc d
JOIN (VALUES
  ('charm-keychain', 'charm'),
  ('charm-keychain', 'coaster'),
  ('charm-keychain', 'keychain'),
  ('charm-keychain', 'moc khoa'),
  ('charm-keychain', 'charm keychain')
) AS a(slug, tu_khoa) ON d.slug = a.slug
ON CONFLICT (tu_khoa) DO UPDATE SET
  id_danh_muc = EXCLUDED.id_danh_muc;

UPDATE public.shop_danh_muc
SET
  trang_thai = 'an',
  mo_ta = 'Đã gộp vào charm-keychain (Rev 3). Giữ slug để URL cũ redirect.',
  cap_nhat_luc = now()
WHERE slug IN ('charm-coaster', 'keychain');

UPDATE public.shop_danh_muc
SET
  ten = 'Phụ kiện trưng bày',
  mo_ta = 'Vật đựng/đỡ để trưng bày món khác (hộp shaker, khung, kệ). Bản thân món được trưng bày → danh mục của nó.',
  cap_nhat_luc = now()
WHERE slug = 'trung-bay';

-- ---------------------------------------------------------------------
-- 2. Năm cấp cha + gán id_cha cho lá
-- ---------------------------------------------------------------------
INSERT INTO public.shop_danh_muc (slug, ten, nganh_hang, mo_ta, thu_tu, trang_thai)
VALUES
  ('giay-in-an', 'Giấy & in ấn', 'merch',
   'Cấp cha — không gắn loại hàng. Gom artprint, sticker, card, fanbook, văn phòng phẩm.', 1, 'hien'),
  ('charm-phu-kien', 'Charm & phụ kiện đeo', 'merch',
   'Cấp cha — không gắn loại hàng. Gom charm/keychain, pin, omamori.', 2, 'hien'),
  ('trung-bay-nhom', 'Trưng bày', 'merch',
   'Cấp cha — không gắn loại hàng. Gom standee và phụ kiện trưng bày.', 3, 'hien'),
  ('bup-be-mo-hinh', 'Búp bê & mô hình', 'merch',
   'Cấp cha — không gắn loại hàng. Gom plush và figure.', 4, 'hien'),
  ('mac-mang-theo', 'Mặc & mang theo', 'merch',
   'Cấp cha — không gắn loại hàng. Gom áo/nón và túi.', 5, 'hien')
ON CONFLICT (slug) DO UPDATE SET
  ten = EXCLUDED.ten,
  mo_ta = EXCLUDED.mo_ta,
  thu_tu = EXCLUDED.thu_tu,
  nganh_hang = EXCLUDED.nganh_hang,
  trang_thai = 'hien',
  cap_nhat_luc = now();

UPDATE public.shop_danh_muc d
SET id_cha = p.id, cap_nhat_luc = now()
FROM public.shop_danh_muc p
WHERE p.slug = 'giay-in-an'
  AND d.slug IN ('artprint', 'sticker', 'card', 'fanbook', 'van-phong-pham');

UPDATE public.shop_danh_muc d
SET id_cha = p.id, cap_nhat_luc = now()
FROM public.shop_danh_muc p
WHERE p.slug = 'charm-phu-kien'
  AND d.slug IN ('charm-keychain', 'pin-badge', 'omamori');

UPDATE public.shop_danh_muc d
SET id_cha = p.id, cap_nhat_luc = now()
FROM public.shop_danh_muc p
WHERE p.slug = 'trung-bay-nhom'
  AND d.slug IN ('standee', 'trung-bay');

UPDATE public.shop_danh_muc d
SET id_cha = p.id, cap_nhat_luc = now()
FROM public.shop_danh_muc p
WHERE p.slug = 'bup-be-mo-hinh'
  AND d.slug IN ('plush', 'figure');

UPDATE public.shop_danh_muc d
SET id_cha = p.id, cap_nhat_luc = now()
FROM public.shop_danh_muc p
WHERE p.slug = 'mac-mang-theo'
  AND d.slug IN ('apparel', 'tui');

-- combo + khac: không gán cha (cắt ngang / fallback)

-- ---------------------------------------------------------------------
-- 3. Alias tự học — ứng viên (D1)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shop_danh_muc_alias_ung_vien (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tu_khoa         text NOT NULL,
  id_danh_muc     uuid NOT NULL REFERENCES public.shop_danh_muc(id) ON DELETE CASCADE,
  id_nguoi_dung   uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  id_nhom         uuid NOT NULL REFERENCES public.shop_nhom(id) ON DELETE CASCADE,
  tao_luc         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shop_danh_muc_alias_ung_vien_tu_khoa_len CHECK (
    char_length(btrim(tu_khoa)) >= 3 AND char_length(tu_khoa) <= 80
  ),
  CONSTRAINT uq_shop_danh_muc_alias_ung_vien UNIQUE (tu_khoa, id_danh_muc, id_nguoi_dung)
);

CREATE INDEX IF NOT EXISTS idx_shop_danh_muc_alias_ung_vien_cho
  ON public.shop_danh_muc_alias_ung_vien (tu_khoa, id_danh_muc);

COMMENT ON TABLE public.shop_danh_muc_alias_ung_vien IS
  'Seller bỏ gợi ý và chọn tay — ứng viên alias. Promote thủ công khi ≥3 shop.';

-- ---------------------------------------------------------------------
-- 4. Báo thiếu danh mục (D2)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shop_danh_muc_yeu_cau (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_nguoi_dung           uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  id_nhom                 uuid NOT NULL REFERENCES public.shop_nhom(id) ON DELETE CASCADE,
  tu_khoa_chuan           text NOT NULL,
  mo_ta                   text NOT NULL,
  id_danh_muc_gan_nhat    uuid REFERENCES public.shop_danh_muc(id) ON DELETE SET NULL,
  cum                     text NOT NULL,
  trang_thai              text NOT NULL DEFAULT 'moi'
                          CHECK (trang_thai IN ('moi', 'gop_alias', 'da_tao', 'tu_choi')),
  id_danh_muc_ket_qua     uuid REFERENCES public.shop_danh_muc(id) ON DELETE SET NULL,
  ly_do_tu_choi           text,
  tao_luc                 timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shop_danh_muc_yeu_cau_mo_ta_len CHECK (
    char_length(btrim(mo_ta)) >= 20 AND char_length(mo_ta) <= 500
  ),
  CONSTRAINT shop_danh_muc_yeu_cau_tu_khoa_len CHECK (
    char_length(btrim(tu_khoa_chuan)) > 0 AND char_length(tu_khoa_chuan) <= 80
  )
);

CREATE INDEX IF NOT EXISTS idx_shop_danh_muc_yeu_cau_tt
  ON public.shop_danh_muc_yeu_cau (trang_thai, tao_luc DESC);

CREATE INDEX IF NOT EXISTS idx_shop_danh_muc_yeu_cau_shop_ngay
  ON public.shop_danh_muc_yeu_cau (id_nguoi_dung, tao_luc DESC);

COMMENT ON TABLE public.shop_danh_muc_yeu_cau IS
  'Seller báo thiếu danh mục. Không tạo row shop_danh_muc. Không lên hub.';

-- ---------------------------------------------------------------------
-- 5. RLS — đọc/ghi chỉ qua service-role API
-- ---------------------------------------------------------------------
ALTER TABLE public.shop_danh_muc_alias_ung_vien ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_danh_muc_yeu_cau ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shop_danh_muc_alias_ung_vien_doc ON public.shop_danh_muc_alias_ung_vien;
CREATE POLICY shop_danh_muc_alias_ung_vien_doc ON public.shop_danh_muc_alias_ung_vien
  FOR SELECT
  USING (id_nguoi_dung = public.current_profile_id());

DROP POLICY IF EXISTS shop_danh_muc_yeu_cau_doc ON public.shop_danh_muc_yeu_cau;
CREATE POLICY shop_danh_muc_yeu_cau_doc ON public.shop_danh_muc_yeu_cau
  FOR SELECT
  USING (id_nguoi_dung = public.current_profile_id());
