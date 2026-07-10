function absolutePostUrl(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

/** Web Share API hoặc sao chép link — dùng từ sheet hành động mobile. */
export async function sharePostUrl(
  path: string,
  title?: string | null,
): Promise<boolean> {
  const url = absolutePostUrl(path);
  if (!url) return false;

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: title?.trim() || "Bài viết trên CINs",
        url,
      });
      return true;
    } catch {
      /* Người dùng huỷ — thử copy bên dưới. */
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    window.prompt("Sao chép URL bài viết:", url);
    return true;
  }
}
