/** Client-safe — key ↔ URL công khai cho video chat trên R2. */

const KEY_RE = /^chat-video\/[0-9a-f]{2}\/[0-9a-f]{16,64}\.mp4$/i;

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
