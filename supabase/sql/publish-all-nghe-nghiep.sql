/*
  Đặt tất cả nghề đang là draft → published (bảng nn_nghe_nghiep).
  Chạy trong Supabase → SQL Editor.
  Nếu giá trị draft trong DB khác ('Draft', 'nhap', …), sửa điều kiện WHERE.
*/

-- Xem trước số dòng sẽ đổi (optional)
-- SELECT id, slug, trang_thai FROM public.nn_nghe_nghiep WHERE trang_thai = 'draft';

UPDATE public.nn_nghe_nghiep
SET trang_thai = 'published'
WHERE trang_thai = 'draft';

-- Nếu muốn publish MỌI dòng bất kể trạng thái cũ (cẩn thận):
-- UPDATE public.nn_nghe_nghiep SET trang_thai = 'published';
