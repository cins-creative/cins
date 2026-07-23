-- Hướng dẫn trung tâm trợ giúp — bảng cins_huong_dan.
-- Mỗi dòng = 1 phiên (session) thuộc 1 nhóm đối tượng (nhom_slug).
-- Public đọc phiên đã xuất bản; ghi chỉ qua service role (admin / super_admin).
-- Idempotent. Chạy: node scripts/run-cins-huong-dan-migration.mjs

CREATE TABLE IF NOT EXISTS public.cins_huong_dan (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nhom_slug       text NOT NULL,
  nhom_ten        text NOT NULL,
  nhom_thu_tu     integer NOT NULL DEFAULT 0,
  slug            text NOT NULL,
  tieu_de         text NOT NULL,
  video_url       text,
  noi_dung_html   text NOT NULL DEFAULT '',
  thu_tu          integer NOT NULL DEFAULT 0,
  da_xuat_ban     boolean NOT NULL DEFAULT false,
  da_xoa          boolean NOT NULL DEFAULT false,
  id_nguoi_sua    uuid REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  tao_luc         timestamptz NOT NULL DEFAULT now(),
  sua_luc         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cins_huong_dan_nhom_slug_chk CHECK (nhom_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT cins_huong_dan_slug_chk CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT cins_huong_dan_nhom_phien_uq UNIQUE (nhom_slug, slug)
);

COMMENT ON TABLE public.cins_huong_dan IS
  'Hướng dẫn Help Center: nhóm đối tượng (nhom_*) + phiên (slug/tieu_de/video/TipTap).';

COMMENT ON COLUMN public.cins_huong_dan.nhom_slug IS
  'Slug nhóm sidebar — vd. nguoi-dung, chu-shop, co-so-dao-tao, truong-dai-hoc.';
COMMENT ON COLUMN public.cins_huong_dan.video_url IS
  'URL YouTube (watch / youtu.be / embed / shorts); null = không có video.';
COMMENT ON COLUMN public.cins_huong_dan.noi_dung_html IS
  'Nội dung TipTap (HTML) — admin tạo, render public qua article-rich-content.';

CREATE INDEX IF NOT EXISTS idx_cins_huong_dan_nhom_thu_tu
  ON public.cins_huong_dan (nhom_thu_tu ASC, nhom_slug ASC);

CREATE INDEX IF NOT EXISTS idx_cins_huong_dan_phien_thu_tu
  ON public.cins_huong_dan (nhom_slug, thu_tu ASC, tao_luc ASC);

CREATE INDEX IF NOT EXISTS idx_cins_huong_dan_public
  ON public.cins_huong_dan (nhom_slug, thu_tu)
  WHERE da_xoa = false AND da_xuat_ban = true;

ALTER TABLE public.cins_huong_dan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cins_huong_dan_select_public ON public.cins_huong_dan;
CREATE POLICY cins_huong_dan_select_public
  ON public.cins_huong_dan
  FOR SELECT
  TO anon, authenticated
  USING (da_xoa = false AND da_xuat_ban = true);

-- Seed nhóm mặc định (1 phiên nháp / nhóm) — ON CONFLICT bỏ qua nếu đã có.
INSERT INTO public.cins_huong_dan (
  nhom_slug, nhom_ten, nhom_thu_tu, slug, tieu_de, video_url, noi_dung_html, thu_tu, da_xuat_ban
) VALUES
  (
    'nguoi-dung',
    'Người dùng',
    10,
    'gioi-thieu',
    'Giới thiệu hướng dẫn',
    NULL,
    '<p>Nội dung hướng dẫn cho người dùng — admin sẽ cập nhật tại /admin/huong-dan.</p>',
    10,
    false
  ),
  (
    'chu-shop',
    'Chủ shop bán hàng',
    20,
    'gioi-thieu',
    'Giới thiệu hướng dẫn shop',
    NULL,
    '<p>Nội dung hướng dẫn cho chủ shop — admin sẽ cập nhật tại /admin/huong-dan.</p>',
    10,
    false
  ),
  (
    'co-so-dao-tao',
    'Cơ sở đào tạo',
    30,
    'gioi-thieu',
    'Giới thiệu hướng dẫn cơ sở',
    NULL,
    '<p>Nội dung hướng dẫn cho cơ sở đào tạo — admin sẽ cập nhật tại /admin/huong-dan.</p>',
    10,
    false
  ),
  (
    'truong-dai-hoc',
    'Trường đại học',
    40,
    'gioi-thieu',
    'Giới thiệu hướng dẫn trường',
    NULL,
    '<p>Nội dung hướng dẫn cho trường đại học — admin sẽ cập nhật tại /admin/huong-dan.</p>',
    10,
    false
  )
ON CONFLICT (nhom_slug, slug) DO NOTHING;
