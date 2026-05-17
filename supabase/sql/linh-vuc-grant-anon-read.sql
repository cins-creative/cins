/*
  CINs — MỞ QUYỀN ĐỌC bảng public.linh_vuc (Next.js + NEXT_PUBLIC_SUPABASE_ANON_KEY)

  Chạy toàn bộ file này trong Supabase → SQL Editor (một lần, an toàn chạy lại).

  Nếu vẫn không thấy dữ liệu trên site sau khi chạy:
  1) Dashboard → Settings → API: kiểm tra project URL + anon key khớp .env
  2) Dashboard → Table Editor → linh_vuc: bật “Enable Row Level Security” đã bật và có policy SELECT (script bên dưới)
  3) Thử trong SQL Editor: SELECT count(*) FROM public.linh_vuc; (phải > 0)
*/

-- Quyền schema (thường đã có; khai báo lại cho chắc)
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Quyền đọc bảng (anon = khách gọi API từ website)
GRANT SELECT ON TABLE public.linh_vuc TO anon, authenticated;

-- service_role: chỉ server có key — không bắt buộc cho trang public nhưng không gây hại
GRANT SELECT ON TABLE public.linh_vuc TO service_role;

-- Bật RLS (bắt buộc có policy SELECT, nếu không sẽ không đọc được qua PostgREST)
ALTER TABLE public.linh_vuc ENABLE ROW LEVEL SECURITY;

-- Gỡ policy cùng tên nếu chạy lại
DROP POLICY IF EXISTS "Linh vực (bảng linh_vuc): đọc công khai (anon + authenticated)"
  ON public.linh_vuc;

DROP POLICY IF EXISTS "linh_vuc_public_select"
  ON public.linh_vuc;

-- Cho phép đọc mọi dòng (dữ liệu tham chiếu công khai)
CREATE POLICY "linh_vuc_public_select"
  ON public.linh_vuc
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- (Tuỳ chọn) Cho authenticated INSERT/UPDATE nếu sau này có admin — mặc định KHÔNG mở ghi
-- Chỉ bật khi bạn hiểu rủi ro.

/*
  Kiểm tra nhanh sau khi chạy:

  SET ROLE anon;
  SELECT id, slug, ten FROM public.linh_vuc LIMIT 5;
  RESET ROLE;
*/
