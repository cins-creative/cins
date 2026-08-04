-- Phase 6: tiến độ giáo trình trong chat lớp
-- - org_tien_do_bai_mo: lịch sử mở từng bài / HV
-- - org_nop_bai: Lưu bài → Journey
-- - org_khoa_hoc.dong_bo_tien_do: cả lớp cùng tiến độ
-- Idempotent.

-- 1) Toggle đồng bộ tiến độ trên khóa
ALTER TABLE public.org_khoa_hoc
  ADD COLUMN IF NOT EXISTS dong_bo_tien_do boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.org_khoa_hoc.dong_bo_tien_do IS
  'true = mọi HV trong lớp cùng tiến độ (mở bài fan-out + copy khi join); false = từng người';

-- 2) Lịch sử mở bài (1 dòng / enrollment × bài)
CREATE TABLE IF NOT EXISTS public.org_tien_do_bai_mo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_hoc_vien_lop uuid NOT NULL
    REFERENCES public.user_hoc_vien_lop(id) ON DELETE CASCADE,
  id_bai_tap uuid NOT NULL
    REFERENCES public.org_bai_tap(id) ON DELETE CASCADE,
  id_nguoi_gan uuid
    REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  mo_luc timestamptz NOT NULL DEFAULT now(),
  id_tin_nhan uuid
    REFERENCES public.chat_tin_nhan(id) ON DELETE SET NULL,
  CONSTRAINT uq_org_tien_do_bai_mo_hv_bai UNIQUE (id_hoc_vien_lop, id_bai_tap)
);

CREATE INDEX IF NOT EXISTS idx_org_tien_do_bai_mo_hv_mo
  ON public.org_tien_do_bai_mo (id_hoc_vien_lop, mo_luc DESC);

CREATE INDEX IF NOT EXISTS idx_org_tien_do_bai_mo_bai
  ON public.org_tien_do_bai_mo (id_bai_tap);

COMMENT ON TABLE public.org_tien_do_bai_mo IS
  'Lịch sử GV mở bài cho HV; org_tien_do_bai giữ con trỏ bài hiện tại (nộp)';

-- 3) ALTER org_nop_bai — Lưu bài + liên kết Journey
ALTER TABLE public.org_nop_bai
  ADD COLUMN IF NOT EXISTS luu_luc timestamptz NULL;

ALTER TABLE public.org_nop_bai
  ADD COLUMN IF NOT EXISTS id_nguoi_luu uuid NULL
    REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL;

ALTER TABLE public.org_nop_bai
  ADD COLUMN IF NOT EXISTS id_cot_moc uuid NULL
    REFERENCES public.content_cot_moc(id) ON DELETE SET NULL;

ALTER TABLE public.org_nop_bai
  ADD COLUMN IF NOT EXISTS dang_journey_luc timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_org_nop_bai_cho_journey
  ON public.org_nop_bai (id_hoc_vien_lop)
  WHERE luu_luc IS NOT NULL AND id_cot_moc IS NULL;

COMMENT ON COLUMN public.org_nop_bai.luu_luc IS
  'GV Lưu bài — đủ chất lượng portfolio; trực giao với trang_thai duyệt';
COMMENT ON COLUMN public.org_nop_bai.id_cot_moc IS
  'Journey đã tạo từ bài nộp này (1 nop → tối đa 1 cot_moc)';
