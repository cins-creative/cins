/*
  CINs — public.linh_vuc (sidebar /nghe-nghiep)

  Schema app đang map (listLinhVucForHub + normalizeLinhVucRow):
  - id (uuid), slug (text), ten (text), ten_eng (text) → ten_en trong code
  - nhom (text) → nhóm accordion
  - mo_ta, cover_id, thu_tu (thứ tự trong nhóm), trang_thai (chỉ hiện bản active)

  Nếu bạn ĐÃ CÓ bảng + dữ liệu: chạy file riêng
  supabase/sql/linh-vuc-grant-anon-read.sql (chỉ RLS + GRANT) — hoặc phần 2 bên dưới.
*/

-- ─── 1) Bảng (greenfield — khớp schema CINs hiện tại) ───────────────────

CREATE TABLE IF NOT EXISTS public.linh_vuc (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug text NOT NULL,
  ten text NOT NULL,
  ten_eng text NULL,
  mo_ta text NULL,
  cover_id text NULL,
  thu_tu integer NOT NULL DEFAULT 0,
  trang_thai text NOT NULL DEFAULT 'active',
  nhom text NULL,
  CONSTRAINT linh_vuc_slug_key UNIQUE (slug)
);

COMMENT ON TABLE public.linh_vuc IS 'Lĩnh vực hub nghề — sidebar nhóm theo nhom, hiển thị ten.';
COMMENT ON COLUMN public.linh_vuc.slug IS 'Tham số URL ?linh_vuc=<slug>';
COMMENT ON COLUMN public.linh_vuc.ten_eng IS 'Tên tiếng Anh — map sang ten_en trong TypeScript';
COMMENT ON COLUMN public.linh_vuc.thu_tu IS 'Thứ tự trong cùng nhóm (nhỏ trước)';
COMMENT ON COLUMN public.linh_vuc.trang_thai IS 'Hub chỉ đọc các dòng active';

CREATE INDEX IF NOT EXISTS idx_linh_vuc_nhom ON public.linh_vuc (nhom);
CREATE INDEX IF NOT EXISTS idx_linh_vuc_thu_tu ON public.linh_vuc (thu_tu);

-- ─── 2) RLS + đọc công khai — đồng bộ với linh-vuc-grant-anon-read.sql ─

ALTER TABLE public.linh_vuc ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Linh vực (bảng linh_vuc): đọc công khai (anon + authenticated)"
  ON public.linh_vuc;

DROP POLICY IF EXISTS "linh_vuc_public_select"
  ON public.linh_vuc;

CREATE POLICY "linh_vuc_public_select"
  ON public.linh_vuc
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.linh_vuc TO anon, authenticated, service_role;

-- ─── 3) Dữ liệu mẫu (chỉ khi bảng đang rỗng) ───────────────────────────

INSERT INTO public.linh_vuc (slug, ten, ten_eng, nhom, thu_tu, trang_thai)
VALUES
  ('game', 'Game', 'Game', 'Sản xuất game & realtime', 0, 'active'),
  ('hoat-hinh', 'Hoạt hình', 'Animation', 'Phim & hoạt hình', 0, 'active'),
  ('thiet-ke-do-hoa', 'Thiết kế đồ họa', 'Graphic design', 'Thiết kế & truyền thông', 0, 'active')
ON CONFLICT (slug) DO NOTHING;

-- ─── 4) (Tuỳ chọn) Đồng bộ id từ lv_linh_vuc — giữ uuid cho linh_vuc_id bài viết
-- INSERT INTO public.linh_vuc (id, slug, ten, ten_eng, nhom, thu_tu, trang_thai)
-- SELECT lv.id, lv.slug,
--   COALESCE(NULLIF(trim(lv.ten_vi), ''), lv.slug)::text,
--   NULLIF(trim(lv.ten_en), ''),
--   NULLIF(trim(lv.nhom_vi), ''),
--   0, 'active'
-- FROM public.lv_linh_vuc lv
-- WHERE lv.slug IS NOT NULL AND trim(lv.slug) <> ''
-- ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, ten = EXCLUDED.ten, ten_eng = EXCLUDED.ten_eng, nhom = EXCLUDED.nhom;
