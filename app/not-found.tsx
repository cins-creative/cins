'use client';

import Link from 'next/link';

/**
 * Trang 404 dùng chung cho đường dẫn sai hoặc nội dung không còn tồn tại.
 */
export default function NotFound() {
  return (
    <main
      className="relative isolate flex min-h-screen items-center overflow-hidden bg-[var(--bg-page)] px-5 py-14 [font-family:var(--font-sans)] sm:px-8 sm:py-20"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-[18%] h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-[18%] left-1/2 h-px w-[min(90vw,64rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-[var(--border)] to-transparent"
      />

      <section className="relative mx-auto w-full max-w-2xl">
        <div className="relative py-10 pl-7 sm:py-14 sm:pl-12">
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-px bg-[var(--border-strong)]"
          />
          <span
            aria-hidden="true"
            className="absolute left-0 top-10 h-14 w-[3px] -translate-x-px bg-[var(--cins-blue)] sm:top-14"
          />

          <p className="mb-5 text-sm font-medium tracking-[0.01em] text-[var(--cins-blue)]">
            Không tìm thấy trang
          </p>
          <h1
            className="max-w-xl text-4xl font-medium leading-[1.15] tracking-[-0.045em] text-[var(--fg-1)] sm:text-5xl lg:text-[3.4rem]"
            style={{
              fontFamily:
                'var(--font-be-vietnam), "Be Vietnam Pro", system-ui, sans-serif',
            }}
          >
            Đường dẫn này không còn tồn tại.
          </h1>
          <p className="mt-6 max-w-lg text-[15px] leading-7 text-[var(--fg-3)] sm:text-base">
            Có thể trang đã được chuyển sang một địa chỉ khác hoặc đường dẫn
            chưa chính xác.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-2">
            <Link
              href="/"
              className="group inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[var(--cins-blue)] transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--cins-blue)]"
            >
              Về trang chủ
              <span
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="min-h-11 appearance-none border-0 bg-transparent p-0 text-sm font-medium text-[var(--fg-3)] transition hover:text-[var(--fg-1)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--cins-blue)]"
            >
              Quay lại trang trước
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
