-- =====================================================================
-- migration_shop_danh_muc.sql
-- Taxonomy nền tảng: danh mục canonical + facet (Fandom · Chất liệu…)
-- Plan: docs/PLAN_shop_danh_muc_san_pham.md (Rev 2, đã chốt §11)
-- Idempotent — chạy lại an toàn. CINs ospzzzxcomrmhqrnkoiw.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. shop_danh_muc
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shop_danh_muc (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL,
  ten           text NOT NULL,
  id_cha        uuid REFERENCES public.shop_danh_muc(id) ON DELETE SET NULL,
  nganh_hang    text NOT NULL DEFAULT 'merch',
  mo_ta         text,
  thu_tu        integer NOT NULL DEFAULT 0,
  icon          text,
  trang_thai    text NOT NULL DEFAULT 'hien'
                CHECK (trang_thai IN ('hien', 'an')),
  tao_luc       timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shop_danh_muc_slug_len CHECK (
    char_length(btrim(slug)) > 0 AND char_length(slug) <= 64
  ),
  CONSTRAINT shop_danh_muc_ten_len CHECK (
    char_length(btrim(ten)) > 0 AND char_length(ten) <= 80
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_shop_danh_muc_slug
  ON public.shop_danh_muc (slug);

CREATE INDEX IF NOT EXISTS idx_shop_danh_muc_nganh_thu_tu
  ON public.shop_danh_muc (nganh_hang, thu_tu)
  WHERE trang_thai = 'hien';

CREATE INDEX IF NOT EXISTS idx_shop_danh_muc_id_cha
  ON public.shop_danh_muc (id_cha)
  WHERE id_cha IS NOT NULL;

COMMENT ON TABLE public.shop_danh_muc IS
  'Danh mục sản phẩm canonical do CINs sở hữu — discovery xuyên shop. Seller không tạo.';
COMMENT ON COLUMN public.shop_danh_muc.id_cha IS
  'Cấp cha (Phase 2). Phase 1: node lá id_cha=null. Slug lá không mang tên cấp cha.';
COMMENT ON COLUMN public.shop_danh_muc.mo_ta IS
  'Ranh giới danh mục — chuẩn cho seller & admin khi map.';
COMMENT ON COLUMN public.shop_danh_muc.trang_thai IS
  'hien | an — không hard delete (giữ mapping + URL).';

-- ---------------------------------------------------------------------
-- 2. shop_danh_muc_alias
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shop_danh_muc_alias (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_danh_muc   uuid NOT NULL REFERENCES public.shop_danh_muc(id) ON DELETE CASCADE,
  tu_khoa       text NOT NULL,
  tao_luc       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shop_danh_muc_alias_tu_khoa_len CHECK (
    char_length(btrim(tu_khoa)) > 0 AND char_length(tu_khoa) <= 80
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_shop_danh_muc_alias_tu_khoa
  ON public.shop_danh_muc_alias (tu_khoa);

CREATE INDEX IF NOT EXISTS idx_shop_danh_muc_alias_danh_muc
  ON public.shop_danh_muc_alias (id_danh_muc);

COMMENT ON TABLE public.shop_danh_muc_alias IS
  'Từ đồng nghĩa (đã normalize) → gợi ý map shop_nhom → shop_danh_muc.';

-- ---------------------------------------------------------------------
-- 3. shop_thuoc_tinh (định nghĩa facet)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shop_thuoc_tinh (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                 text NOT NULL,
  ten                  text NOT NULL,
  nganh_hang           text,
  kieu                 text NOT NULL DEFAULT 'chon_nhieu'
                       CHECK (kieu IN ('chon_nhieu', 'chon_mot')),
  seller_de_xuat_duoc  boolean NOT NULL DEFAULT false,
  hien_o_hub           boolean NOT NULL DEFAULT true,
  thu_tu               integer NOT NULL DEFAULT 0,
  trang_thai           text NOT NULL DEFAULT 'hien'
                       CHECK (trang_thai IN ('hien', 'an')),
  tao_luc              timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shop_thuoc_tinh_slug_len CHECK (
    char_length(btrim(slug)) > 0 AND char_length(slug) <= 64
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_shop_thuoc_tinh_slug
  ON public.shop_thuoc_tinh (slug);

COMMENT ON TABLE public.shop_thuoc_tinh IS
  'Định nghĩa facet lọc phụ (Fandom · Chất liệu · Thương hiệu…). CINs sở hữu.';
COMMENT ON COLUMN public.shop_thuoc_tinh.nganh_hang IS
  'null = mọi ngành; merch = chỉ ngành merch.';
COMMENT ON COLUMN public.shop_thuoc_tinh.seller_de_xuat_duoc IS
  'true = seller được đề xuất giá trị mới (long tail, vd. Fandom).';

-- ---------------------------------------------------------------------
-- 4. shop_thuoc_tinh_gia_tri
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shop_thuoc_tinh_gia_tri (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_thuoc_tinh      uuid NOT NULL REFERENCES public.shop_thuoc_tinh(id) ON DELETE CASCADE,
  slug               text NOT NULL,
  ten                text NOT NULL,
  nhom               text,
  loai               text,
  trang_thai         text NOT NULL DEFAULT 'hien'
                     CHECK (trang_thai IN ('de_xuat', 'hien', 'an')),
  so_shop_dung       integer NOT NULL DEFAULT 0,
  id_gop_vao         uuid REFERENCES public.shop_thuoc_tinh_gia_tri(id) ON DELETE SET NULL,
  id_nguoi_de_xuat   uuid REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  thu_tu             integer NOT NULL DEFAULT 0,
  tao_luc            timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shop_thuoc_tinh_gia_tri_slug_len CHECK (
    char_length(btrim(slug)) > 0 AND char_length(slug) <= 64
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_shop_thuoc_tinh_gia_tri_facet_slug
  ON public.shop_thuoc_tinh_gia_tri (id_thuoc_tinh, slug);

CREATE INDEX IF NOT EXISTS idx_shop_thuoc_tinh_gia_tri_facet_tt
  ON public.shop_thuoc_tinh_gia_tri (id_thuoc_tinh, trang_thai, thu_tu);

CREATE INDEX IF NOT EXISTS idx_shop_thuoc_tinh_gia_tri_de_xuat
  ON public.shop_thuoc_tinh_gia_tri (trang_thai, so_shop_dung)
  WHERE trang_thai = 'de_xuat';

COMMENT ON TABLE public.shop_thuoc_tinh_gia_tri IS
  'Giá trị facet (Genshin · Acrylic…). de_xuat → hien → an; gộp qua id_gop_vao.';
COMMENT ON COLUMN public.shop_thuoc_tinh_gia_tri.nhom IS
  'Nhóm chip UI (HoYoverse…) — không phải cấp cây.';
COMMENT ON COLUMN public.shop_thuoc_tinh_gia_tri.so_shop_dung IS
  'Cache số shop đang gắn — auto-promote + sort.';

-- ---------------------------------------------------------------------
-- 5. shop_thuoc_tinh_alias (unique theo facet)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shop_thuoc_tinh_alias (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_thuoc_tinh   uuid NOT NULL REFERENCES public.shop_thuoc_tinh(id) ON DELETE CASCADE,
  id_gia_tri      uuid NOT NULL REFERENCES public.shop_thuoc_tinh_gia_tri(id) ON DELETE CASCADE,
  tu_khoa         text NOT NULL,
  tao_luc         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shop_thuoc_tinh_alias_tu_khoa_len CHECK (
    char_length(btrim(tu_khoa)) > 0 AND char_length(tu_khoa) <= 80
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_shop_thuoc_tinh_alias_facet_tu_khoa
  ON public.shop_thuoc_tinh_alias (id_thuoc_tinh, tu_khoa);

CREATE INDEX IF NOT EXISTS idx_shop_thuoc_tinh_alias_gia_tri
  ON public.shop_thuoc_tinh_alias (id_gia_tri);

COMMENT ON TABLE public.shop_thuoc_tinh_alias IS
  'Alias giá trị facet — UNIQUE theo facet (ba≠Blue Archive vs khác).';

-- ---------------------------------------------------------------------
-- 6. Junction shop_nhom_thuoc_tinh
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shop_nhom_thuoc_tinh (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_nhom       uuid NOT NULL REFERENCES public.shop_nhom(id) ON DELETE CASCADE,
  id_gia_tri    uuid NOT NULL REFERENCES public.shop_thuoc_tinh_gia_tri(id) ON DELETE CASCADE,
  tao_luc       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_nhom, id_gia_tri)
);

CREATE INDEX IF NOT EXISTS idx_shop_nhom_thuoc_tinh_gia_tri
  ON public.shop_nhom_thuoc_tinh (id_gia_tri);

CREATE INDEX IF NOT EXISTS idx_shop_nhom_thuoc_tinh_nhom
  ON public.shop_nhom_thuoc_tinh (id_nhom);

COMMENT ON TABLE public.shop_nhom_thuoc_tinh IS
  'Gắn giá trị facet lên loại hàng (shop_nhom). Một loại nhiều giá trị / nhiều facet.';

-- ---------------------------------------------------------------------
-- 7. ALTER shop_nhom (đã duyệt §11.7 / DEV_RULES §1)
-- ---------------------------------------------------------------------
ALTER TABLE public.shop_nhom
  ADD COLUMN IF NOT EXISTS id_danh_muc uuid
    REFERENCES public.shop_danh_muc(id) ON DELETE SET NULL;

ALTER TABLE public.shop_nhom
  ADD COLUMN IF NOT EXISTS danh_muc_xac_nhan boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_shop_nhom_id_danh_muc
  ON public.shop_nhom (id_danh_muc)
  WHERE da_xoa = false AND id_danh_muc IS NOT NULL;

COMMENT ON COLUMN public.shop_nhom.id_danh_muc IS
  'FK danh mục canonical CINs — nullable; chưa map vẫn bán được.';
COMMENT ON COLUMN public.shop_nhom.danh_muc_xac_nhan IS
  'true = seller/admin đã confirm; false = hệ thống đoán hoặc chưa map.';

-- ---------------------------------------------------------------------
-- 8. RLS
-- Ghi taxonomy / facet định nghĩa: chỉ service-role (không policy INSERT/UPDATE/DELETE cho authenticated).
-- Seller đề xuất giá trị / map danh mục: qua API service-role sau khi auth.
-- ---------------------------------------------------------------------
ALTER TABLE public.shop_danh_muc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_danh_muc_alias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_thuoc_tinh ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_thuoc_tinh_gia_tri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_thuoc_tinh_alias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_nhom_thuoc_tinh ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shop_danh_muc_doc ON public.shop_danh_muc;
CREATE POLICY shop_danh_muc_doc ON public.shop_danh_muc
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS shop_danh_muc_alias_doc ON public.shop_danh_muc_alias;
CREATE POLICY shop_danh_muc_alias_doc ON public.shop_danh_muc_alias
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS shop_thuoc_tinh_doc ON public.shop_thuoc_tinh;
CREATE POLICY shop_thuoc_tinh_doc ON public.shop_thuoc_tinh
  FOR SELECT
  USING (true);

-- Giá trị facet: public đọc hien; seller đọc de_xuat của mình; an chỉ service-role
DROP POLICY IF EXISTS shop_thuoc_tinh_gia_tri_doc_hien ON public.shop_thuoc_tinh_gia_tri;
CREATE POLICY shop_thuoc_tinh_gia_tri_doc_hien ON public.shop_thuoc_tinh_gia_tri
  FOR SELECT
  USING (
    trang_thai = 'hien'
    OR (
      trang_thai = 'de_xuat'
      AND id_nguoi_de_xuat IS NOT NULL
      AND id_nguoi_de_xuat = public.current_profile_id()
    )
  );

DROP POLICY IF EXISTS shop_thuoc_tinh_alias_doc ON public.shop_thuoc_tinh_alias;
CREATE POLICY shop_thuoc_tinh_alias_doc ON public.shop_thuoc_tinh_alias
  FOR SELECT
  USING (true);

-- Junction: đọc công khai; ghi chỉ chủ loại hàng
DROP POLICY IF EXISTS shop_nhom_thuoc_tinh_doc ON public.shop_nhom_thuoc_tinh;
CREATE POLICY shop_nhom_thuoc_tinh_doc ON public.shop_nhom_thuoc_tinh
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS shop_nhom_thuoc_tinh_owner ON public.shop_nhom_thuoc_tinh;
CREATE POLICY shop_nhom_thuoc_tinh_owner ON public.shop_nhom_thuoc_tinh
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.shop_nhom n
      WHERE n.id = id_nhom
        AND n.id_nguoi_dung = public.current_profile_id()
        AND n.da_xoa = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.shop_nhom n
      WHERE n.id = id_nhom
        AND n.id_nguoi_dung = public.current_profile_id()
        AND n.da_xoa = false
    )
  );

-- ---------------------------------------------------------------------
-- 9. Seed — danh mục merch (16 lá + khac)
-- ---------------------------------------------------------------------
INSERT INTO public.shop_danh_muc (slug, ten, nganh_hang, mo_ta, thu_tu, trang_thai)
VALUES
  ('standee', 'Standee & mô hình giấy', 'merch',
   'Standee / mô hình giấy hoặc mica. Chất liệu không đổi danh mục → facet chat-lieu.', 10, 'hien'),
  ('charm-coaster', 'Charm & coaster rời', 'merch',
   'Charm / coaster không khoen treo. Có khoen → keychain.', 20, 'hien'),
  ('keychain', 'Keychain & móc khóa', 'merch',
   'Có vòng/khoen treo. Phân biệt charm-coaster bằng khoen, không bằng chất liệu.', 30, 'hien'),
  ('pin-badge', 'Pin & badge cài áo', 'merch',
   'Huy hiệu / enamel pin. Không gộp sticker.', 40, 'hien'),
  ('card', 'Card & photocard', 'merch',
   'Card / photocard. Bộ nhiều tấm vẫn ở đây, không phải combo.', 50, 'hien'),
  ('artprint', 'Artprint & poster', 'merch',
   'In khổ lớn không khung. Có khung → trung-bay.', 60, 'hien'),
  ('sticker', 'Sticker & washi tape', 'merch',
   'Sticker sheet, washi, decal.', 70, 'hien'),
  ('tui', 'Túi (tote, canvas, đeo chéo)', 'merch',
   'Tote / canvas / đeo chéo. Ví nhỏ Phase 1 vẫn đây.', 80, 'hien'),
  ('apparel', 'Áo, nón & phụ kiện mặc', 'merch',
   'Áo thun, hoodie, bucket. Tách nhỏ khi mở ngành quan-ao.', 90, 'hien'),
  ('van-phong-pham', 'Sổ, bút & văn phòng phẩm', 'merch',
   'Notebook, bookmark. Bookmark giấy có thể lẫn artprint.', 100, 'hien'),
  ('omamori', 'Bùa omamori', 'merch',
   'Omamori vải hoặc acrylic đều ở đây. Chất liệu → facet chat-lieu.', 110, 'hien'),
  ('trung-bay', 'Hộp shaker & phụ kiện trưng bày', 'merch',
   'Hộp shaker, khung ảnh, kệ mica. Cấp cha tương lai: trung-bay-nhom.', 120, 'hien'),
  ('plush', 'Plush & doll', 'merch',
   'Gấu bông, doll, quần áo doll.', 130, 'hien'),
  ('figure', 'Figure & mô hình', 'merch',
   'Nendo / resin / garage kit. Mô hình giấy → standee.', 140, 'hien'),
  ('fanbook', 'Fanbook & doujinshi', 'merch',
   'Artbook, zine, doujin.', 150, 'hien'),
  ('combo', 'Combo & giftset', 'merch',
   'Set trộn nhiều danh mục. Cùng loại → về danh mục gốc. Không gán cấp cha.', 160, 'hien'),
  ('khac', 'Khác', 'merch',
   'Fallback khi chưa map. UI ẩn khỏi chip filter.', 9999, 'hien')
ON CONFLICT (slug) DO UPDATE SET
  ten = EXCLUDED.ten,
  mo_ta = EXCLUDED.mo_ta,
  thu_tu = EXCLUDED.thu_tu,
  nganh_hang = EXCLUDED.nganh_hang,
  trang_thai = EXCLUDED.trang_thai,
  cap_nhat_luc = now();

-- Alias danh mục (seed tối thiểu — script backfill mở rộng sau)
INSERT INTO public.shop_danh_muc_alias (id_danh_muc, tu_khoa)
SELECT d.id, a.tu_khoa
FROM public.shop_danh_muc d
JOIN (VALUES
  ('standee', 'standee'),
  ('standee', 'mo hinh giay'),
  ('charm-coaster', 'charm'),
  ('charm-coaster', 'coaster'),
  ('keychain', 'keychain'),
  ('keychain', 'moc khoa'),
  ('pin-badge', 'pin'),
  ('pin-badge', 'badge'),
  ('pin-badge', 'huy hieu'),
  ('card', 'card'),
  ('card', 'photocard'),
  ('card', 'card nhua'),
  ('card', 'card bo goc'),
  ('artprint', 'artprint'),
  ('artprint', 'art print'),
  ('artprint', 'poster'),
  ('sticker', 'sticker'),
  ('sticker', 'washi'),
  ('tui', 'tui'),
  ('tui', 'tote'),
  ('tui', 'tui canvas'),
  ('tui', 'tui deo cheo'),
  ('apparel', 'ao thun'),
  ('apparel', 'hoodie'),
  ('van-phong-pham', 'so'),
  ('van-phong-pham', 'notebook'),
  ('van-phong-pham', 'bookmark'),
  ('omamori', 'omamori'),
  ('omamori', 'bua omamori'),
  ('trung-bay', 'hop shaker'),
  ('trung-bay', 'shaker'),
  ('plush', 'plush'),
  ('plush', 'gau bong'),
  ('figure', 'figure'),
  ('fanbook', 'fanbook'),
  ('fanbook', 'doujin'),
  ('combo', 'combo'),
  ('combo', 'giftset'),
  ('khac', 'khac')
) AS a(slug, tu_khoa) ON d.slug = a.slug
ON CONFLICT (tu_khoa) DO UPDATE SET
  id_danh_muc = EXCLUDED.id_danh_muc;

-- ---------------------------------------------------------------------
-- 10. Seed facets
-- ---------------------------------------------------------------------
INSERT INTO public.shop_thuoc_tinh (
  slug, ten, nganh_hang, kieu, seller_de_xuat_duoc, hien_o_hub, thu_tu, trang_thai
)
VALUES
  ('fandom', 'Fandom', 'merch', 'chon_nhieu', true, true, 10, 'hien'),
  ('chat-lieu', 'Chất liệu', NULL, 'chon_nhieu', false, true, 20, 'hien'),
  ('thuong-hieu', 'Thương hiệu', NULL, 'chon_mot', false, true, 30, 'an')
ON CONFLICT (slug) DO UPDATE SET
  ten = EXCLUDED.ten,
  nganh_hang = EXCLUDED.nganh_hang,
  kieu = EXCLUDED.kieu,
  seller_de_xuat_duoc = EXCLUDED.seller_de_xuat_duoc,
  hien_o_hub = EXCLUDED.hien_o_hub,
  thu_tu = EXCLUDED.thu_tu,
  trang_thai = EXCLUDED.trang_thai,
  cap_nhat_luc = now();

-- Fandom values
INSERT INTO public.shop_thuoc_tinh_gia_tri (
  id_thuoc_tinh, slug, ten, nhom, loai, trang_thai, thu_tu
)
SELECT t.id, v.slug, v.ten, v.nhom, v.loai, 'hien', v.thu_tu
FROM public.shop_thuoc_tinh t
CROSS JOIN (VALUES
  ('genshin-impact', 'Genshin Impact', 'HoYoverse', 'game', 10),
  ('honkai-star-rail', 'Honkai: Star Rail', 'HoYoverse', 'game', 20),
  ('zenless-zone-zero', 'Zenless Zone Zero', 'HoYoverse', 'game', 30),
  ('honkai-impact-3', 'Honkai Impact 3rd', 'HoYoverse', 'game', 40),
  ('blue-archive', 'Blue Archive', 'Nexon', 'game', 50),
  ('arknights', 'Arknights', 'Hypergryph', 'game', 60),
  ('identity-v', 'Identity V', 'NetEase', 'game', 70),
  ('wuthering-waves', 'Wuthering Waves', 'Kuro Games', 'game', 80),
  ('jujutsu-kaisen', 'Jujutsu Kaisen', NULL, 'anime', 90),
  ('chainsaw-man', 'Chainsaw Man', NULL, 'anime', 100),
  ('ghibli', 'Studio Ghibli', 'Ghibli', 'anime', 110),
  ('vtuber', 'Vtuber', NULL, 'vtuber', 120),
  ('original', 'Original / OC', NULL, 'original', 130),
  ('khac', 'Fandom khác', NULL, 'khac', 9999)
) AS v(slug, ten, nhom, loai, thu_tu)
WHERE t.slug = 'fandom'
ON CONFLICT (id_thuoc_tinh, slug) DO UPDATE SET
  ten = EXCLUDED.ten,
  nhom = EXCLUDED.nhom,
  loai = EXCLUDED.loai,
  thu_tu = EXCLUDED.thu_tu,
  trang_thai = 'hien',
  cap_nhat_luc = now();

-- Chất liệu values
INSERT INTO public.shop_thuoc_tinh_gia_tri (
  id_thuoc_tinh, slug, ten, nhom, loai, trang_thai, thu_tu
)
SELECT t.id, v.slug, v.ten, NULL, NULL, 'hien', v.thu_tu
FROM public.shop_thuoc_tinh t
CROSS JOIN (VALUES
  ('acrylic', 'Acrylic', 10),
  ('mica', 'Mica', 20),
  ('giay', 'Giấy & in', 30),
  ('vai', 'Vải & canvas', 40),
  ('kim-loai', 'Kim loại', 50),
  ('pvc', 'PVC & nhựa mềm', 60),
  ('nhua-cung', 'Nhựa cứng', 70),
  ('go', 'Gỗ', 80),
  ('bong', 'Bông & nhồi', 90)
) AS v(slug, ten, thu_tu)
WHERE t.slug = 'chat-lieu'
ON CONFLICT (id_thuoc_tinh, slug) DO UPDATE SET
  ten = EXCLUDED.ten,
  thu_tu = EXCLUDED.thu_tu,
  trang_thai = 'hien',
  cap_nhat_luc = now();

-- Alias Fandom
INSERT INTO public.shop_thuoc_tinh_alias (id_thuoc_tinh, id_gia_tri, tu_khoa)
SELECT t.id, g.id, a.tu_khoa
FROM public.shop_thuoc_tinh t
JOIN public.shop_thuoc_tinh_gia_tri g ON g.id_thuoc_tinh = t.id
JOIN (VALUES
  ('genshin-impact', 'genshin'),
  ('genshin-impact', 'gi'),
  ('genshin-impact', 'nguyen than'),
  ('honkai-star-rail', 'hsr'),
  ('honkai-star-rail', 'star rail'),
  ('honkai-star-rail', 'honkai sr'),
  ('zenless-zone-zero', 'zzz'),
  ('zenless-zone-zero', 'zenless'),
  ('honkai-impact-3', 'hi3'),
  ('honkai-impact-3', 'honkai impact'),
  ('blue-archive', 'ba'),
  ('blue-archive', 'bluar'),
  ('arknights', 'ak'),
  ('arknights', 'minh nhat phuong chau'),
  ('identity-v', 'idv'),
  ('wuthering-waves', 'wuwa'),
  ('jujutsu-kaisen', 'jjk'),
  ('jujutsu-kaisen', 'chu thuat hoi chien'),
  ('chainsaw-man', 'csm'),
  ('chainsaw-man', 'cua may'),
  ('ghibli', 'mononoke'),
  ('ghibli', 'totoro'),
  ('vtuber', 'hololive'),
  ('vtuber', 'nijisanji'),
  ('original', 'oc'),
  ('original', 'tu ve'),
  ('original', 'original character'),
  ('khac', 'khac')
) AS a(gia_tri_slug, tu_khoa)
  ON g.slug = a.gia_tri_slug
WHERE t.slug = 'fandom'
ON CONFLICT (id_thuoc_tinh, tu_khoa) DO UPDATE SET
  id_gia_tri = EXCLUDED.id_gia_tri;

-- Alias Chất liệu
INSERT INTO public.shop_thuoc_tinh_alias (id_thuoc_tinh, id_gia_tri, tu_khoa)
SELECT t.id, g.id, a.tu_khoa
FROM public.shop_thuoc_tinh t
JOIN public.shop_thuoc_tinh_gia_tri g ON g.id_thuoc_tinh = t.id
JOIN (VALUES
  ('acrylic', 'acrylic'),
  ('acrylic', 'mica trong'),
  ('acrylic', 'ac'),
  ('mica', 'mica'),
  ('giay', 'giay'),
  ('giay', 'art paper'),
  ('giay', 'couche'),
  ('vai', 'vai'),
  ('vai', 'canvas'),
  ('vai', 'cotton'),
  ('vai', 'theu'),
  ('kim-loai', 'kim loai'),
  ('kim-loai', 'inox'),
  ('kim-loai', 'thau'),
  ('kim-loai', 'enamel'),
  ('pvc', 'pvc'),
  ('pvc', 'nhua mem'),
  ('pvc', 'cao su'),
  ('nhua-cung', 'nhua cung'),
  ('nhua-cung', 'pp'),
  ('nhua-cung', 'pet'),
  ('go', 'go'),
  ('go', 'tre'),
  ('bong', 'bong'),
  ('bong', 'plush'),
  ('bong', 'nhoi')
) AS a(gia_tri_slug, tu_khoa)
  ON g.slug = a.gia_tri_slug
WHERE t.slug = 'chat-lieu'
ON CONFLICT (id_thuoc_tinh, tu_khoa) DO UPDATE SET
  id_gia_tri = EXCLUDED.id_gia_tri;
