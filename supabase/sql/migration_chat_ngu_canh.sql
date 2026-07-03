-- =====================================================================
-- migration_chat_ngu_canh.sql
-- Thêm "card ngữ cảnh" cho tin nhắn: khi user nhắn tin cho Org THÔNG QUA một
-- nội dung cụ thể (tin tuyển dụng, sự kiện, tuyển sinh...), chèn 1 tin nhắn
-- đính card snapshot để 2 bên biết đang trao đổi về nội dung nào.
--
-- Nhận diện tin card = `ngu_canh IS NOT NULL` (không đụng enum `loai_tin`).
-- `ngu_canh` lưu snapshot JSON: { loai, id, tieu_de, mo_ta, anh, href, org_ten }.
--
-- An toàn chạy lại nhiều lần (idempotent).
-- =====================================================================

ALTER TABLE public.chat_tin_nhan
  ADD COLUMN IF NOT EXISTS ngu_canh jsonb;

COMMENT ON COLUMN public.chat_tin_nhan.ngu_canh IS
  'Snapshot card ngữ cảnh (tuyen_dung/su_kien/tuyen_sinh...): { loai, id, tieu_de, mo_ta, anh, href, org_ten }. NULL = tin thường.';
