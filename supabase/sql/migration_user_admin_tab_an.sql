-- Tab admin ẩn theo user (chỉ thấy / không thấy).
-- Mặc định không có dòng = thấy mọi tab mà vai trò đã cho phép.
-- super_admin luôn thấy hết — app bỏ qua bảng này.
-- Chạy trên Supabase SQL Editor (idempotent).

CREATE TABLE IF NOT EXISTS public.user_admin_tab_an (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_nguoi_dung  uuid NOT NULL UNIQUE REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  tab_an         text[] NOT NULL DEFAULT '{}',
  cap_boi        uuid REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  tao_luc        timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_admin_tab_an IS
  'Deny-list tab sidebar /admin. tab_an = key href (vd. bai-viet, nguoi-dung). Không có dòng = thấy hết tab role cho phép.';

CREATE INDEX IF NOT EXISTS idx_user_admin_tab_an_id_nguoi_dung
  ON public.user_admin_tab_an (id_nguoi_dung);

ALTER TABLE public.user_admin_tab_an ENABLE ROW LEVEL SECURITY;
-- Không policy: chỉ service role (admin panel) truy cập.
