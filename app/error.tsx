"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Error boundary — tránh màn hình trắng khi RSC/query throw
 * (khác `notFound()` → `not-found.tsx`).
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-zinc-100 px-6 py-16 text-center text-zinc-900">
      <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
        Lỗi
      </p>
      <h1 className="max-w-md text-2xl font-bold leading-snug">
        Không tải được trang
      </h1>
      <p className="max-w-md text-zinc-600">
        Thử lại sau vài giây, hoặc{" "}
        <Link href="/" className="font-semibold text-blue-700 underline">
          về trang chủ
        </Link>
        .
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
      >
        Thử lại
      </button>
    </div>
  );
}
