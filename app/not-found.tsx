import Link from "next/link";

/**
 * Trang 404 rõ ràng — tránh màn hình trắng khi slug sai hoặc `notFound()`.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-zinc-100 px-6 py-16 text-center text-zinc-900">
      <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
        404
      </p>
      <h1 className="max-w-md text-2xl font-bold leading-snug">
        Không tìm thấy trang hoặc bài viết
      </h1>
      <p className="max-w-md text-zinc-600">
        Đường dẫn không đúng, bài chưa xuất bản, hoặc chưa cấu hình Supabase. Thử{" "}
        <Link href="/bai-viet" className="font-semibold text-blue-700 underline">
          danh sách bài viết
        </Link>{" "}
        hoặc{" "}
        <Link href="/" className="font-semibold text-blue-700 underline">
          về trang chủ
        </Link>
        .
      </p>
    </div>
  );
}
