-- Bảng góp ý / phản hồi người dùng (feedback) cho toàn site CINs.
-- Ai cũng gửi được (kể cả khách chưa đăng nhập) — insert qua service role trong API.
-- Admin panel đọc/xử lý qua service role. Chạy trên Supabase SQL Editor (idempotent).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'gop_y_trang_thai_enum' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.gop_y_trang_thai_enum AS ENUM (
      'moi',
      'dang_xu_ly',
      'da_xu_ly',
      'bo_qua'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.gop_y (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_nguoi_dung  uuid REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  ho_ten         text,
  email          text,
  noi_dung       text NOT NULL,
  -- "Trang bạn góp ý": URL trang hiện tại lúc user mở popup.
  trang_url      text,
  user_agent     text,
  trang_thai     public.gop_y_trang_thai_enum NOT NULL DEFAULT 'moi',
  ghi_chu        text,
  nguoi_xu_ly    uuid REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  xu_ly_luc      timestamptz,
  tao_luc        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.gop_y IS
  'Góp ý / phản hồi người dùng toàn site. id_nguoi_dung null = khách ẩn danh.';

CREATE INDEX IF NOT EXISTS idx_gop_y_trang_thai ON public.gop_y (trang_thai);
CREATE INDEX IF NOT EXISTS idx_gop_y_tao_luc ON public.gop_y (tao_luc DESC);

ALTER TABLE public.gop_y ENABLE ROW LEVEL SECURITY;

-- Không policy: chỉ service role (API + admin panel) truy cập.
