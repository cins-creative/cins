/**
 * Kéo-thả chia sẻ nội dung vào chat (desktop only).
 *
 * Nguồn kéo (post card, ảnh trong post) đặt payload JSON vào DataTransfer với
 * MIME riêng; CinsChatProvider phát hiện MIME này lúc dragenter để mở overlay
 * ở drop mode; thả vào một thread row sẽ gửi tin tương ứng vào phòng đó.
 */

export const CINS_SHARE_MIME = "application/x-cins-share";

export type CinsSharePayload =
  /** Card bài viết — gửi URL bài, chat tự render OG card. */
  | { kind: "post"; url: string; title?: string }
  /** Ảnh Cloudflare có sẵn — gửi bằng id gốc, không reup. */
  | { kind: "image"; imageId: string; url?: string }
  /** URL bất kỳ (ảnh ngoài / video embed) — gửi dạng text. */
  | { kind: "url"; url: string };

/** Gắn payload chia sẻ vào sự kiện dragstart. */
export function setShareDragData(
  dataTransfer: DataTransfer,
  payload: CinsSharePayload,
): void {
  dataTransfer.effectAllowed = "copy";
  dataTransfer.setData(CINS_SHARE_MIME, JSON.stringify(payload));
  const url =
    payload.kind === "image" ? (payload.url ?? "") : payload.url;
  if (url) {
    dataTransfer.setData("text/uri-list", url);
    dataTransfer.setData("text/plain", url);
  }
}

/** DataTransfer đang kéo có phải share payload của CINs không (dùng lúc dragover). */
export function hasShareDragData(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) return false;
  return Array.from(dataTransfer.types).includes(CINS_SHARE_MIME);
}

/** Đọc payload lúc drop. */
export function readShareDragData(
  dataTransfer: DataTransfer | null,
): CinsSharePayload | null {
  if (!dataTransfer) return null;
  const raw = dataTransfer.getData(CINS_SHARE_MIME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CinsSharePayload;
    if (parsed.kind === "post" && parsed.url) return parsed;
    if (parsed.kind === "image" && parsed.imageId) return parsed;
    if (parsed.kind === "url" && parsed.url) return parsed;
    return null;
  } catch {
    return null;
  }
}
