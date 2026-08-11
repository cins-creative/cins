-- Lead form «CINs dựng shop hộ» — bảng riêng, không đụng shop_cua_hang.
-- Insert chỉ qua service role (API /api/mo-shop). Không policy RLS = deny client.
-- Idempotent. Chạy: npm run migrate:shop-dang-ky-mo
-- Project: CINS ospzzzxcomrmhqrnkoiw

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'shop_dang_ky_mo_kenh_enum' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.shop_dang_ky_mo_kenh_enum AS ENUM (
      'zalo',
      'messenger',
      'instagram',
      'discord',
      'email'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'shop_dang_ky_mo_trang_thai_enum' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.shop_dang_ky_mo_trang_thai_enum AS ENUM (
      'moi',
      'dang_lien_he',
      'dang_dung',
      'cho_duyet',
      'da_public',
      'tu_choi',
      'tam_dung'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'shop_dang_ky_mo_hinh_thuc_enum' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.shop_dang_ky_mo_hinh_thuc_enum AS ENUM (
      'co_san',
      'preorder',
      'ca_hai'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.shop_dang_ky_mo (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ten_shop          text NOT NULL,
  ten_lien_he       text,
  loai_hang         text[] NOT NULL DEFAULT '{}',
  hinh_thuc_ban     public.shop_dang_ky_mo_hinh_thuc_enum,
  resource_links    text[] NOT NULL DEFAULT '{}',
  ghi_chu           text,
  kenh_lien_he      public.shop_dang_ky_mo_kenh_enum NOT NULL,
  lien_he_gia_tri   text NOT NULL,
  email             text NOT NULL,
  ngan_hang         text,
  so_tai_khoan      text,
  ten_chu_tk        text,
  da_co_tai_khoan   boolean NOT NULL DEFAULT false,
  link_profile_cins text,
  nguoi_gioi_thieu  text,
  dong_y_dieu_khoan boolean NOT NULL DEFAULT false,
  dong_y_dung_anh   boolean NOT NULL DEFAULT false,
  dong_y_luc        timestamptz,
  trang_thai        public.shop_dang_ky_mo_trang_thai_enum NOT NULL DEFAULT 'moi',
  ghi_chu_noi_bo    text,
  id_nguoi_dung     uuid REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  id_cua_hang       uuid REFERENCES public.shop_cua_hang(id) ON DELETE SET NULL,
  nguon             text,
  ip_hash           text,
  user_agent        text,
  tao_luc           timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shop_dang_ky_mo_dong_y_chk CHECK (
    dong_y_dieu_khoan = true AND dong_y_dung_anh = true AND dong_y_luc IS NOT NULL
  )
);

COMMENT ON TABLE public.shop_dang_ky_mo IS
  'Lead đăng ký CINs dựng shop hộ (concierge). Không ghi thẳng vào shop_cua_hang. Chỉ service role.';

CREATE INDEX IF NOT EXISTS idx_shop_dang_ky_mo_trang_thai
  ON public.shop_dang_ky_mo (trang_thai, tao_luc DESC);

CREATE INDEX IF NOT EXISTS idx_shop_dang_ky_mo_email
  ON public.shop_dang_ky_mo (email);

CREATE INDEX IF NOT EXISTS idx_shop_dang_ky_mo_tao_luc
  ON public.shop_dang_ky_mo (tao_luc DESC);

ALTER TABLE public.shop_dang_ky_mo ENABLE ROW LEVEL SECURITY;

-- Không policy: chỉ service role (API + admin sau này) truy cập.
