-- =====================================================================
-- migration_csdt_org_hub.sql
-- Hub chat CSĐT: 1 phòng `1_org` + `loai_context=csdt_hub` / org
-- Phòng lớp nest qua `id_phong_cha` (runtime ensure + backfill).
-- Idempotent — chạy lại an toàn. Không ALTER cột/enum cũ.
-- =====================================================================

CREATE UNIQUE INDEX IF NOT EXISTS chat_phong_csdt_hub_org_uidx
  ON public.chat_phong (id_org_dai_dien)
  WHERE loai_phong = '1_org'
    AND loai_context = 'csdt_hub'
    AND id_org_dai_dien IS NOT NULL;

COMMENT ON INDEX public.chat_phong_csdt_hub_org_uidx IS
  'Một hub chat CSĐT (csdt_hub) mỗi tổ chức; tách tư vấn org_student.';
