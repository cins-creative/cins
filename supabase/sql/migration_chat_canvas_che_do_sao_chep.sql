-- =====================================================================
-- migration_chat_canvas_che_do_sao_chep.sql
-- Private / Public copy policy trên board (không đụng trang_thai khóa/ẩn).
-- Idempotent.
-- =====================================================================

ALTER TABLE public.chat_canvas
  ADD COLUMN IF NOT EXISTS che_do_sao_chep text NOT NULL DEFAULT 'private';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chat_canvas_che_do_sao_chep_check'
  ) THEN
    ALTER TABLE public.chat_canvas
      ADD CONSTRAINT chat_canvas_che_do_sao_chep_check
      CHECK (che_do_sao_chep IN ('private', 'public'));
  END IF;
END
$$;

COMMENT ON COLUMN public.chat_canvas.che_do_sao_chep IS
  'private = không cho copy node ra clipboard; public = member được copy (vẫn chỉ member phòng đọc board).';
