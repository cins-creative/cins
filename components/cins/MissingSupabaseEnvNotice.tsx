/**
 * Server-only: hiển thị khi thiếu env Supabase (dev vs Cloudflare khác hướng dẫn).
 */
export function MissingSupabaseEnvNotice() {
  const isProd = process.env.NODE_ENV === "production";

  return (
    <>
      <strong>Chưa cấu hình Supabase.</strong>{" "}
      {isProd ? (
        <>
          Trên Cloudflare Worker <strong>cins</strong> mở{" "}
          <strong>Settings → Variables and Secrets</strong>: thêm{" "}
          <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm dark:bg-zinc-700">
            NEXT_PUBLIC_SUPABASE_URL
          </code>{" "}
          và{" "}
          <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm dark:bg-zinc-700">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>{" "}
          (Supabase Dashboard → Settings → API), rồi deploy lại. File{" "}
          <code className="text-sm">.env.local</code> không được đưa lên Worker.
        </>
      ) : (
        <>
          Thêm{" "}
          <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm dark:bg-zinc-700">
            NEXT_PUBLIC_SUPABASE_URL
          </code>{" "}
          và{" "}
          <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm dark:bg-zinc-700">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>{" "}
          trong <code className="text-sm">.env.local</code> rồi chạy lại dev
          server.
        </>
      )}
    </>
  );
}
