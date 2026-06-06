-- user_ket_ban — kết bạn 2 chiều (v6). Chạy trên Supabase SQL Editor (idempotent).

CREATE TABLE IF NOT EXISTS public.user_ket_ban (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_nguoi_gui uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  id_nguoi_nhan uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  trang_thai text NOT NULL DEFAULT 'pending'
    CHECK (trang_thai IN ('pending', 'accepted', 'blocked')),
  tao_luc timestamptz NOT NULL DEFAULT now(),
  xu_ly_luc timestamptz,
  CONSTRAINT user_ket_ban_no_self CHECK (id_nguoi_gui <> id_nguoi_nhan),
  CONSTRAINT user_ket_ban_pair_unique UNIQUE (
    LEAST(id_nguoi_gui, id_nguoi_nhan),
    GREATEST(id_nguoi_gui, id_nguoi_nhan)
  )
);

CREATE INDEX IF NOT EXISTS idx_user_ket_ban_nhan_pending
  ON public.user_ket_ban (id_nguoi_nhan, tao_luc DESC)
  WHERE trang_thai = 'pending';

CREATE INDEX IF NOT EXISTS idx_user_ket_ban_gui
  ON public.user_ket_ban (id_nguoi_gui, trang_thai);

COMMENT ON TABLE public.user_ket_ban IS 'Quan hệ kết bạn 2 chiều — 1 record/cặp (LEAST/GREATEST unique)';

ALTER TABLE public.user_ket_ban ENABLE ROW LEVEL SECURITY;
