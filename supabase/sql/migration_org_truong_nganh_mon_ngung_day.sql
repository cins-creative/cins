-- L31 bổ sung: ngưng dạy môn chuyên ngành (giữ junction + lịch sử gắn đồ án).
-- Idempotent — chạy trên CINs (ospzzzxcomrmhqrnkoiw).

ALTER TABLE public.org_truong_nganh_mon
  ADD COLUMN IF NOT EXISTS ngung_day boolean NOT NULL DEFAULT false;

ALTER TABLE public.org_truong_nganh_mon
  ADD COLUMN IF NOT EXISTS ngung_day_luc timestamptz NULL;

COMMENT ON COLUMN public.org_truong_nganh_mon.ngung_day IS
  'true = trường không còn mở môn cho gắn đồ án mới; giữ hàng + lịch sử bài đã gắn.';

COMMENT ON COLUMN public.org_truong_nganh_mon.ngung_day_luc IS
  'Thời điểm đánh dấu ngưng dạy gần nhất (null khi đang dạy).';

CREATE INDEX IF NOT EXISTS org_truong_nganh_mon_nganh_dang_day_idx
  ON public.org_truong_nganh_mon (id_truong_nganh, thu_tu)
  WHERE ngung_day = false;
