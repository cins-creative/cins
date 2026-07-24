/**
 * Kéo-thả chia sẻ nội dung vào chat (desktop only).
 *
 * Nguồn kéo (post card, ảnh trong post) đặt payload JSON vào DataTransfer với
 * MIME riêng; CinsChatProvider phát hiện MIME này lúc dragenter để mở overlay
 * ở drop mode; thả vào một thread row sẽ gửi tin tương ứng vào phòng đó.
 */

export const CINS_SHARE_MIME = "application/x-cins-share";

/** Scale ghost kéo bài — đủ nhỏ để không che feed / inbox rail. */
export const CINS_SHARE_DRAG_SCALE = 0.38;

/** Cắt chiều cao bài dài trước khi scale (px layout). */
const SHARE_DRAG_MAX_SOURCE_HEIGHT = 520;

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

/**
 * Ghost kéo = snapshot cả bài, scale nhỏ (không dùng full-size card).
 * Phải gắn vào DOM trước `setDragImage`; gỡ sau 1 frame (browser đã chụp).
 */
export function setScaledShareDragImage(
  dataTransfer: DataTransfer,
  source: HTMLElement,
  scale = CINS_SHARE_DRAG_SCALE,
): void {
  const rect = source.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) return;

  const clipH = Math.min(rect.height, SHARE_DRAG_MAX_SOURCE_HEIGHT);
  const outW = Math.round(rect.width * scale);
  const outH = Math.round(clipH * scale);

  const shell = document.createElement("div");
  shell.className = "cins-share-drag-ghost";
  shell.setAttribute("aria-hidden", "true");
  Object.assign(shell.style, {
    position: "fixed",
    top: "-10000px",
    left: "0",
    width: `${outW}px`,
    height: `${outH}px`,
    overflow: "hidden",
    pointerEvents: "none",
    zIndex: "0",
    borderRadius: "12px",
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.22)",
    background: "var(--bg-surface, #fff)",
  });

  const clone = source.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
  Object.assign(clone.style, {
    width: `${rect.width}px`,
    height: "auto",
    maxHeight: `${clipH}px`,
    overflow: "hidden",
    margin: "0",
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    pointerEvents: "none",
  });

  shell.appendChild(clone);
  document.body.appendChild(shell);

  try {
    dataTransfer.setDragImage(shell, Math.round(outW * 0.2), 20);
  } catch {
    /* một số trình duyệt không hỗ trợ setDragImage */
  }

  requestAnimationFrame(() => {
    shell.remove();
  });
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
