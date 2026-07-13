-- linh_vuc: cover_id → thumbnail_id + nhóm M:N (catalog + gắn).
-- Idempotent — chạy: node scripts/run-linh-vuc-thumbnail-nhom-migration.mjs
-- Project CINS: ospzzzxcomrmhqrnkoiw
--
-- Giữ cột linh_vuc.nhom (deprecated) để FE hub cũ vẫn gom sidebar.
-- Không đụng article_nhom / article_gan_nhom.

-- ── 1) Rename cover_id → thumbnail_id ────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'linh_vuc'
      AND column_name = 'cover_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'linh_vuc'
      AND column_name = 'thumbnail_id'
  ) THEN
    ALTER TABLE public.linh_vuc RENAME COLUMN cover_id TO thumbnail_id;
  END IF;
END $$;

COMMENT ON COLUMN public.linh_vuc.thumbnail_id IS
  'Cloudflare Images id — thumbnail lĩnh vực (không phải cover banner).';

COMMENT ON COLUMN public.linh_vuc.nhom IS
  'DEPRECATED: nhóm hiển thị cũ (1 giá trị). Dùng linh_vuc_nhom + linh_vuc_gan_nhom (M:N). Giữ tạm cho FE hub.';

-- ── 2) Catalog nhóm lĩnh vực ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.linh_vuc_nhom (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL,
  ten         text NOT NULL,
  ten_eng     text,
  mo_ta       text,
  thu_tu      integer NOT NULL DEFAULT 0,
  trang_thai  text NOT NULL DEFAULT 'active',
  CONSTRAINT linh_vuc_nhom_slug_key UNIQUE (slug)
);

COMMENT ON TABLE public.linh_vuc_nhom IS
  'Catalog nhóm lĩnh vực (Thị giác, Kinh tế, Kỹ thuật, …) — mở rộng được; gắn M:N qua linh_vuc_gan_nhom.';

CREATE INDEX IF NOT EXISTS idx_linh_vuc_nhom_thu_tu
  ON public.linh_vuc_nhom (thu_tu, ten)
  WHERE trang_thai = 'active';

-- ── 3) Gắn M:N lĩnh vực ↔ nhóm ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.linh_vuc_gan_nhom (
  id_linh_vuc uuid NOT NULL REFERENCES public.linh_vuc(id) ON DELETE CASCADE,
  id_nhom     uuid NOT NULL REFERENCES public.linh_vuc_nhom(id) ON DELETE CASCADE,
  la_chinh    boolean NOT NULL DEFAULT false,
  thu_tu      integer NOT NULL DEFAULT 0,
  PRIMARY KEY (id_linh_vuc, id_nhom)
);

COMMENT ON TABLE public.linh_vuc_gan_nhom IS
  'Gắn lĩnh vực ↔ nhóm (M:N). Mỗi lĩnh vực tối đa 1 la_chinh=true (sidebar hub).';

COMMENT ON COLUMN public.linh_vuc_gan_nhom.la_chinh IS
  'Nhóm chính của lĩnh vực — dùng cho accordion sidebar khi FE chưa nhân bản đa nhóm.';

CREATE INDEX IF NOT EXISTS idx_linh_vuc_gan_nhom_nhom
  ON public.linh_vuc_gan_nhom (id_nhom);

CREATE UNIQUE INDEX IF NOT EXISTS uq_linh_vuc_gan_nhom_chinh
  ON public.linh_vuc_gan_nhom (id_linh_vuc)
  WHERE la_chinh = true;

-- ── 4) Backfill 3 nhóm từ linh_vuc.nhom hiện có ──────────────────
INSERT INTO public.linh_vuc_nhom (slug, ten, ten_eng, thu_tu, trang_thai)
VALUES
  ('san-xuat-giai-tri', 'Sản xuất & Giải trí', 'Production & Entertainment', 0, 'active'),
  ('thiet-ke-thi-giac', 'Thiết kế thị giác', 'Visual Design', 1, 'active'),
  (
    'thiet-ke-khong-gian-san-pham',
    'Thiết kế không gian & Sản phẩm',
    'Spatial & Product Design',
    2,
    'active'
  )
ON CONFLICT (slug) DO UPDATE
SET
  ten = EXCLUDED.ten,
  ten_eng = EXCLUDED.ten_eng,
  thu_tu = EXCLUDED.thu_tu,
  trang_thai = EXCLUDED.trang_thai;

INSERT INTO public.linh_vuc_gan_nhom (id_linh_vuc, id_nhom, la_chinh, thu_tu)
SELECT
  lv.id,
  n.id,
  true,
  0
FROM public.linh_vuc lv
JOIN public.linh_vuc_nhom n ON n.ten = lv.nhom
WHERE lv.nhom IS NOT NULL
  AND btrim(lv.nhom) <> ''
ON CONFLICT (id_linh_vuc, id_nhom) DO NOTHING;

-- Đảm bảo mỗi lĩnh vực đã gắn có đúng 1 la_chinh (idempotent khi re-run).
UPDATE public.linh_vuc_gan_nhom g
SET la_chinh = true
WHERE g.la_chinh = false
  AND NOT EXISTS (
    SELECT 1
    FROM public.linh_vuc_gan_nhom x
    WHERE x.id_linh_vuc = g.id_linh_vuc
      AND x.la_chinh = true
  )
  AND g.ctid = (
    SELECT g2.ctid
    FROM public.linh_vuc_gan_nhom g2
    WHERE g2.id_linh_vuc = g.id_linh_vuc
    ORDER BY g2.thu_tu, g2.id_nhom
    LIMIT 1
  );

-- ── 5) RLS + GRANT (catalog public read, mirror linh_vuc SELECT) ─
ALTER TABLE public.linh_vuc_nhom ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linh_vuc_gan_nhom ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS linh_vuc_nhom_public_select ON public.linh_vuc_nhom;
CREATE POLICY linh_vuc_nhom_public_select
  ON public.linh_vuc_nhom
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS linh_vuc_gan_nhom_public_select ON public.linh_vuc_gan_nhom;
CREATE POLICY linh_vuc_gan_nhom_public_select
  ON public.linh_vuc_gan_nhom
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.linh_vuc_nhom TO anon, authenticated, service_role;
GRANT SELECT ON public.linh_vuc_gan_nhom TO anon, authenticated, service_role;
GRANT ALL ON public.linh_vuc_nhom TO service_role;
GRANT ALL ON public.linh_vuc_gan_nhom TO service_role;
