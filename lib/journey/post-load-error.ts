/** Lỗi abort/timeout khi tải bài — không hiện raw `signal is aborted without reason`. */
export function isPostLoadAbortError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = "name" in err ? String(err.name) : "";
  const message = "message" in err ? String(err.message) : "";
  return (
    name === "AbortError" ||
    name === "TimeoutError" ||
    /aborted/i.test(message)
  );
}

export function formatPostLoadError(err: unknown): string {
  if (typeof err === "string") {
    const t = err.trim();
    if (!t) return "Không tải được bài viết.";
    if (/aborted/i.test(t)) return "Tải bài viết quá lâu. Thử lại.";
    return t;
  }
  if (isPostLoadAbortError(err)) {
    return "Tải bài viết quá lâu. Thử lại.";
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  return "Không tải được bài viết.";
}

/** `/owner/p/post-slug` trên overlay history — fallback khi cache trống. */
export function parsePostPermalinkPath(
  pathname: string,
): { ownerSlug: string; postSlug: string } | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 3 || parts[1] !== "p") return null;
  const ownerSlug = decodeURIComponent(parts[0] ?? "");
  const postSlug = decodeURIComponent(parts[2] ?? "");
  if (!ownerSlug || !postSlug || postSlug === "new") return null;
  return { ownerSlug, postSlug };
}
