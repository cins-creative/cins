-- org_tuyen_dung — liên kết tin tuyển dụng với "vị trí công việc" chuẩn trong hệ thống
-- (trang nghề = article_bai_viet, loai_bai_viet='nghe'). Idempotent.
-- Chạy sau migration_org_tuyen_dung.sql / _v2_distribution.sql.

ALTER TABLE public.org_tuyen_dung
  ADD COLUMN IF NOT EXISTS id_nghe uuid
    REFERENCES public.article_bai_viet(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.org_tuyen_dung.id_nghe IS
  'FK tới article_bai_viet (loai_bai_viet=nghe) — vị trí công việc chuẩn trong hệ thống. '
  'NULL = vị trí tự do (tiêu đề nhập tay, không gắn trang nghề).';

CREATE INDEX IF NOT EXISTS idx_tuyen_dung_nghe
  ON public.org_tuyen_dung (id_nghe)
  WHERE da_xoa = false;

-- Reload PostgREST schema cache để nhận quan hệ FK mới (embed nghe:id_nghe).
NOTIFY pgrst, 'reload schema';
