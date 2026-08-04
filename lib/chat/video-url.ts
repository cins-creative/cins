/** Client-safe — key ↔ URL công khai cho video chat trên R2. */

const KEY_RE = /^chat-video\/[0-9a-f]{2}\/[0-9a-f]{16,64}\.mp4$/i;
const DIRECT_VIDEO_EXT_RE = /\.(mp4|m4v|webm|mov)$/i;

export function isChatVideoKey(value: string | null | undefined): boolean {
  return typeof value === "string" && KEY_RE.test(value.trim());
}

/**
 * Base URL công khai của bucket video chat (custom domain gắn vào R2).
 * Ví dụ: `https://chat-video.cins.vn`. Không có → trả null (ẩn player).
 */
function chatVideoBaseUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_CHAT_VIDEO_BASE_URL?.trim();
  return base ? base.replace(/\/+$/, "") : null;
}

export function buildChatVideoUrl(key: string): string | null {
  const trimmed = key.trim();
  if (!isChatVideoKey(trimmed)) return null;
  const base = chatVideoBaseUrl();
  return base ? `${base}/${trimmed}` : null;
}

/** Trích R2 key từ URL công khai chat-video (nếu khớp base). */
export function chatVideoKeyFromPublicUrl(
  url: string | null | undefined,
): string | null {
  const raw = url?.trim();
  if (!raw) return null;
  const base = chatVideoBaseUrl();
  if (!base) return null;
  try {
    const u = new URL(raw);
    const b = new URL(base);
    if (u.origin !== b.origin) return null;
    const key = u.pathname.replace(/^\/+/, "");
    return isChatVideoKey(key) ? key : null;
  } catch {
    return null;
  }
}

/** URL file video trực tiếp (R2 chat-video hoặc đuôi mp4/webm/mov). */
export function isDirectVideoFileUrl(url: string | null | undefined): boolean {
  const raw = url?.trim();
  if (!raw) return false;
  if (chatVideoKeyFromPublicUrl(raw)) return true;
  try {
    return DIRECT_VIDEO_EXT_RE.test(new URL(raw).pathname);
  } catch {
    return false;
  }
}
