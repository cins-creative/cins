-- Cộng đồng ↔ Journey tác phẩm — mirror feed với card Journey.
-- Chạy trên Supabase SQL Editor (idempotent).

ALTER TABLE public.content_thao_luan
  ADD COLUMN IF NOT EXISTS id_tac_pham uuid
    REFERENCES public.content_tac_pham(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_thao_luan_tac_pham
  ON public.content_thao_luan (id_tac_pham)
  WHERE id_tac_pham IS NOT NULL;

COMMENT ON COLUMN public.content_thao_luan.id_tac_pham IS
  'Tác phẩm Journey gốc khi đăng song song từ compose cộng đồng.';
