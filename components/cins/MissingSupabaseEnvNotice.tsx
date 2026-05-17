/**
 * Server-only: hiển thị khi thiếu env Supabase (dev vs Vercel khác hướng dẫn).
 */
export function MissingSupabaseEnvNotice() {
  const onVercel = process.env.VERCEL === "1";

  return (
    <>
      <strong>Chưa cấu hình Supabase.</strong>{" "}
      {onVercel ? (
        <>
          Trên Vercel mở{" "}
          <strong>Project → Settings → Environment Variables</strong>: thêm{" "}
          <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm dark:bg-zinc-700">
            NEXT_PUBLIC_SUPABASE_URL
          </code>{" "}
          và{" "}
          <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm dark:bg-zinc-700">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>{" "}
          (Supabase Dashboard → Settings → API). Gán cho{" "}
          <strong>Production</strong> và <strong>Preview</strong> nếu bạn dùng preview,
          sau đó <strong>Redeploy</strong>. File <code className="text-sm">.env.local</code>{" "}
          không được đưa lên Vercel.
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
          trong <code className="text-sm">.env.local</code> rồi chạy lại dev server.
        </>
      )}
    </>
  );
}
