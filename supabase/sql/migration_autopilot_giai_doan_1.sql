-- Autopilot Giai đoạn 1 — bảng hàng đợi / watchlist / bản thảo / hạn mức.
-- Server-only (service role). Idempotent.
-- Chạy: npm run migrate:autopilot  (= node scripts/run-autopilot-giai-doan-1-migration.mjs)

-- ── Enum-like CHECK dùng text (tránh ALTER enum sau) ───────────────

CREATE TABLE IF NOT EXISTS public.auto_tai_khoan (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL,
  id_nguoi_dung   uuid REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  niche           text[] NOT NULL DEFAULT '{}',
  dang_bat        boolean NOT NULL DEFAULT true,
  han_muc_ngay    integer NOT NULL DEFAULT 3
                    CHECK (han_muc_ngay >= 0 AND han_muc_ngay <= 50),
  ghi_chu         text,
  tao_luc         timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auto_tai_khoan_slug_uniq UNIQUE (slug),
  CONSTRAINT auto_tai_khoan_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9_-]{1,62}$')
);

COMMENT ON TABLE public.auto_tai_khoan IS
  'Autopilot: nick seeding CINs (map slug → user) + niche router + hạn mức/ngày.';

CREATE TABLE IF NOT EXISTS public.auto_nguon (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nen_tang        text NOT NULL
                    CHECK (nen_tang IN ('artstation', 'behance')),
  url_ho_so       text NOT NULL,
  ma_ngoai        text,
  ten_hien_thi    text,
  niche           text,
  dang_bat        boolean NOT NULL DEFAULT true,
  lan_quet_luc    timestamptz,
  ghi_chu         text,
  tao_luc         timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auto_nguon_url_https CHECK (url_ho_so ~ '^https://'),
  CONSTRAINT auto_nguon_url_uniq UNIQUE (nen_tang, url_ho_so)
);

CREATE INDEX IF NOT EXISTS idx_auto_nguon_bat_quet
  ON public.auto_nguon (dang_bat, lan_quet_luc NULLS FIRST);

COMMENT ON TABLE public.auto_nguon IS
  'Autopilot: danh sách theo dõi artist Behance/ArtStation (allowlist).';

CREATE TABLE IF NOT EXISTS public.auto_muc (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_nguon        uuid REFERENCES public.auto_nguon(id) ON DELETE SET NULL,
  url_canonic     text NOT NULL,
  nen_tang        text NOT NULL
                    CHECK (nen_tang IN ('artstation', 'behance', 'khac')),
  tieu_de_goc     text,
  mo_ta_goc       text,
  ten_tac_gia     text,
  anh_bia_url     text,
  meta            jsonb NOT NULL DEFAULT '{}'::jsonb,
  trang_thai      text NOT NULL DEFAULT 'moi'
                    CHECK (trang_thai IN (
                      'moi', 'dang_soan', 'cho_duyet', 'san_sang',
                      'da_dang', 'bo_qua', 'loi'
                    )),
  tao_luc         timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auto_muc_url_https CHECK (url_canonic ~ '^https://'),
  CONSTRAINT auto_muc_url_uniq UNIQUE (url_canonic)
);

CREATE INDEX IF NOT EXISTS idx_auto_muc_trang_thai_tao
  ON public.auto_muc (trang_thai, tao_luc DESC);

COMMENT ON TABLE public.auto_muc IS
  'Autopilot: mục đã thu thập; chống trùng bằng url_canonic.';

CREATE TABLE IF NOT EXISTS public.auto_ban_thao (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_muc          uuid NOT NULL REFERENCES public.auto_muc(id) ON DELETE CASCADE,
  id_tai_khoan    uuid NOT NULL REFERENCES public.auto_tai_khoan(id) ON DELETE RESTRICT,
  tieu_de         text,
  mo_ta           text,
  dong_ghi_nguon  text,
  blocks          jsonb,
  trang_thai      text NOT NULL DEFAULT 'nhap'
                    CHECK (trang_thai IN (
                      'nhap', 'cho_duyet', 'san_sang', 'da_dung', 'huy'
                    )),
  tao_luc         timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auto_ban_thao_trang_thai
  ON public.auto_ban_thao (trang_thai, tao_luc DESC);

CREATE INDEX IF NOT EXISTS idx_auto_ban_thao_muc
  ON public.auto_ban_thao (id_muc);

COMMENT ON TABLE public.auto_ban_thao IS
  'Autopilot: bản thảo AI/curator trước khi gọi API đăng bài nội bộ.';

CREATE TABLE IF NOT EXISTS public.auto_da_dang (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_ban_thao     uuid REFERENCES public.auto_ban_thao(id) ON DELETE SET NULL,
  id_tai_khoan    uuid REFERENCES public.auto_tai_khoan(id) ON DELETE SET NULL,
  id_muc          uuid REFERENCES public.auto_muc(id) ON DELETE SET NULL,
  url_canonic     text,
  id_tac_pham     uuid,
  id_cot_moc      uuid,
  slug_bai        text,
  duong_dan       text,
  thanh_cong      boolean NOT NULL DEFAULT false,
  loi             text,
  phan_hoi        jsonb,
  tao_luc         timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_auto_da_dang_url_ok
  ON public.auto_da_dang (url_canonic)
  WHERE thanh_cong = true AND url_canonic IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_auto_da_dang_tk_tao
  ON public.auto_da_dang (id_tai_khoan, tao_luc DESC);

COMMENT ON TABLE public.auto_da_dang IS
  'Autopilot: nhật ký gọi POST /api/noi-bo/tac-pham/dang (idempotent theo url_canonic khi thành công).';

CREATE TABLE IF NOT EXISTS public.auto_han_muc (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_tai_khoan    uuid NOT NULL REFERENCES public.auto_tai_khoan(id) ON DELETE CASCADE,
  ngay            date NOT NULL,
  so_da_dang      integer NOT NULL DEFAULT 0 CHECK (so_da_dang >= 0),
  han_muc         integer NOT NULL DEFAULT 3 CHECK (han_muc >= 0),
  tao_luc         timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auto_han_muc_tk_ngay_uniq UNIQUE (id_tai_khoan, ngay)
);

COMMENT ON TABLE public.auto_han_muc IS
  'Autopilot: hạn mức đăng/ngày theo nick (ngày = lịch VN, worker tự tính).';

CREATE TABLE IF NOT EXISTS public.auto_viec (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loai            text NOT NULL
                    CHECK (loai IN (
                      'quet_nguon', 'thu_thap_muc', 'soan_bai',
                      'dang_bai', 'dong_bo_nick', 'khac'
                    )),
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  trang_thai      text NOT NULL DEFAULT 'cho'
                    CHECK (trang_thai IN (
                      'cho', 'dang_chay', 'xong', 'loi', 'huy'
                    )),
  lan_thu         integer NOT NULL DEFAULT 0 CHECK (lan_thu >= 0),
  loi             text,
  hen_luc         timestamptz,
  bat_dau_luc     timestamptz,
  xong_luc        timestamptz,
  tao_luc         timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auto_viec_hang_doi
  ON public.auto_viec (trang_thai, hen_luc NULLS FIRST, tao_luc);

COMMENT ON TABLE public.auto_viec IS
  'Autopilot: hàng đợi việc (cron GitHub Actions / CLI).';

-- ── RLS: deny anon/authenticated; service_role full ───────────────

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'auto_tai_khoan',
    'auto_nguon',
    'auto_muc',
    'auto_ban_thao',
    'auto_da_dang',
    'auto_han_muc',
    'auto_viec'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', t);
  END LOOP;
END $$;
