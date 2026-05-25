const MAX_BYTES = 8 * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 60_000;

/** Tải ảnh lên Cloudflare qua `/api/article-inline-image`. */
export async function uploadNganhInlineImage(
  file: File,
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const token = process.env.NEXT_PUBLIC_ARTICLE_INLINE_IMAGE_UPLOAD_TOKEN?.trim();
  if (!token) {
    return {
      ok: false,
      message:
        "Thiếu NEXT_PUBLIC_ARTICLE_INLINE_IMAGE_UPLOAD_TOKEN — không tải được ảnh.",
    };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, message: "Ảnh quá lớn (tối đa 8 MB)." };
  }

  const fd = new FormData();
  fd.append("file", file, file.name || "banner.jpg");

  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    UPLOAD_TIMEOUT_MS,
  );

  try {
    const res = await fetch("/api/article-inline-image", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
      signal: controller.signal,
    });

    const data = (await res.json().catch(() => ({}))) as {
      url?: string;
      error?: string;
    };

    if (!res.ok || !data.url) {
      return {
        ok: false,
        message: data.error ?? `Tải ảnh thất bại (${res.status})`,
      };
    }

    return { ok: true, url: data.url };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return {
        ok: false,
        message: "Tải ảnh quá lâu — kiểm tra mạng hoặc cấu hình Cloudflare.",
      };
    }
    const raw = err instanceof Error ? err.message : "";
    if (raw === "Failed to fetch") {
      return {
        ok: false,
        message:
          "Không kết nối được dev server — reload trang hoặc chạy lại npm run dev.",
      };
    }
    return {
      ok: false,
      message: raw || "Không kết nối được máy chủ upload.",
    };
  } finally {
    window.clearTimeout(timeout);
  }
}
