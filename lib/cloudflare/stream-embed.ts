/** Client-safe — phân loại & build URL phát Cloudflare Stream (thay Bunny). */

export type StreamVideoEmbed = {
  provider: "stream";
  uid: string;
  url: string;
};

/** Stream UID không phải UUID có gạch — là chuỗi hex 32 ký tự. */
const STREAM_UID_RE = /^[0-9a-f]{32}$/i;

function customerCode(): string | null {
  return process.env.NEXT_PUBLIC_CF_STREAM_CUSTOMER_CODE?.trim() || null;
}

/** Base delivery host: `customer-<code>.cloudflarestream.com` nếu có, else videodelivery.net. */
function deliveryHost(): string {
  const code = customerCode();
  return code
    ? `https://${code}.cloudflarestream.com`
    : "https://videodelivery.net";
}

export function buildStreamIframeUrl(uid: string): string {
  return `https://iframe.cloudflarestream.com/${uid.trim()}`;
}

export function buildStreamHlsUrl(uid: string): string {
  return `${deliveryHost()}/${uid.trim()}/manifest/video.m3u8`;
}

export function buildStreamThumbnailUrl(uid: string): string | null {
  const id = uid.trim();
  if (!id) return null;
  return `${deliveryHost()}/${id}/thumbnails/thumbnail.jpg`;
}

/** MP4 tải xuống — chỉ khả dụng nếu bật "downloads" trên video. Dùng làm fallback frame. */
export function buildStreamMp4Url(uid: string): string | null {
  const id = uid.trim();
  if (!id) return null;
  return `${deliveryHost()}/${id}/downloads/default.mp4`;
}

export function classifyStreamVideoUrl(rawUrl: string): StreamVideoEmbed | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;

  const host = parsed.hostname.toLowerCase();
  const isStreamHost =
    host === "iframe.cloudflarestream.com" ||
    host === "videodelivery.net" ||
    host.endsWith(".cloudflarestream.com");
  if (!isStreamHost) return null;

  // Path dạng /{uid} hoặc /{uid}/... — lấy segment đầu.
  const seg = parsed.pathname.match(/^\/(?:embed\/)?([^/?#]+)/);
  const uid = seg?.[1];
  if (!uid || !STREAM_UID_RE.test(uid)) return null;

  return { provider: "stream", uid, url: buildStreamIframeUrl(uid) };
}

export function isStreamVideoUrl(url: string): boolean {
  return classifyStreamVideoUrl(url) !== null;
}

export function isStreamUid(value: string): boolean {
  return STREAM_UID_RE.test(value.trim());
}
