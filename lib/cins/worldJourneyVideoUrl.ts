/**
 * URL clip Reels trên trang chủ.
 *
 * Next App Router refetch cả RSC `/` khi **searchParams** đổi (`?play=`).
 * Client chỉ ghi clip vào **hash** (`/?view=video#play=feat-…`); `?play=` vẫn
 * đọc được cho deep-link / SSR.
 */

const HASH_PREFIX = "play=";

export function readVideoPlayId(search: string, hash = ""): string | null {
  const raw = hash.replace(/^#/, "").trim();
  if (raw.startsWith(HASH_PREFIX)) {
    const id = raw.slice(HASH_PREFIX.length).trim();
    if (id) {
      try {
        return decodeURIComponent(id) || null;
      } catch {
        return id;
      }
    }
  }
  if (raw && !raw.includes("=")) {
    try {
      return decodeURIComponent(raw) || null;
    } catch {
      return raw;
    }
  }
  return new URLSearchParams(search).get("play")?.trim() || null;
}

export function readVideoPlayIdFromWindow(): string | null {
  if (typeof window === "undefined") return null;
  return readVideoPlayId(window.location.search, window.location.hash);
}

/** `/?view=video` ± hash clip — không thêm/xóa `?play=` (tránh RSC trang chủ). */
export function videoPlayHref(playId: string | null): string {
  const url = new URL(window.location.href);
  url.searchParams.set("view", "video");
  const id = playId?.trim() ?? "";
  url.hash = id ? `${HASH_PREFIX}${id}` : "";
  return `${url.pathname}${url.search}${url.hash}`;
}

export function pushVideoPlayUrl(playId: string) {
  if (typeof window === "undefined") return;
  window.history.pushState(
    { ...(window.history.state ?? {}), wjView: "video", play: playId },
    "",
    videoPlayHref(playId),
  );
}

export function replaceVideoPlayUrl(playId: string) {
  if (typeof window === "undefined") return;
  window.history.replaceState(
    { ...(window.history.state ?? {}), wjView: "video", play: playId },
    "",
    videoPlayHref(playId),
  );
}
