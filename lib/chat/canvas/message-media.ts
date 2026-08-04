import "server-only";

import { chatImageDeliveryUrl } from "@/lib/chat/image-url";
import { buildChatVideoUrl, isChatVideoKey } from "@/lib/chat/video-url";

type MediaJoin =
  | {
      cloudflare_id?: string | null;
      loai_media?: string | null;
      width?: number | null;
      height?: number | null;
    }
  | {
      cloudflare_id?: string | null;
      loai_media?: string | null;
      width?: number | null;
      height?: number | null;
    }[]
  | null
  | undefined;

export type CanvasMessageMedia =
  | { kind: "anh"; url: string }
  | { kind: "video"; url: string; width: number | null; height: number | null };

/** Ảnh CF Images hoặc video chat R2 từ join `content_media`. */
export function resolveCanvasMessageMedia(
  contentMedia: MediaJoin,
): CanvasMessageMedia | null {
  const media = Array.isArray(contentMedia) ? contentMedia[0] : contentMedia;
  if (!media || typeof media !== "object") return null;
  const cfId =
    typeof media.cloudflare_id === "string" ? media.cloudflare_id.trim() : "";
  if (!cfId) return null;

  const loai =
    typeof media.loai_media === "string" ? media.loai_media.trim() : "";
  const width =
    typeof (media as { width?: unknown }).width === "number" &&
    Number.isFinite((media as { width: number }).width) &&
    (media as { width: number }).width > 0
      ? (media as { width: number }).width
      : null;
  const height =
    typeof (media as { height?: unknown }).height === "number" &&
    Number.isFinite((media as { height: number }).height) &&
    (media as { height: number }).height > 0
      ? (media as { height: number }).height
      : null;

  if (loai === "video" || isChatVideoKey(cfId)) {
    const url = buildChatVideoUrl(cfId);
    return url ? { kind: "video", url, width, height } : null;
  }

  const imageUrl = chatImageDeliveryUrl(cfId);
  return imageUrl ? { kind: "anh", url: imageUrl } : null;
}
