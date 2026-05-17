import type { ArticleMeta } from "@/lib/articles/types";
import { getYoutubeId } from "@/lib/youtube";

export function getVideoUrlFromArticleMeta(meta: ArticleMeta): string | null {
  if (meta == null || typeof meta !== "object") return null;
  const v = (meta as Record<string, unknown>).video_url;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t || null;
}

export type ParsedLeadVideo =
  | { kind: "iframe"; src: string }
  | { kind: "video"; src: string };

/** Chuẩn hoá link YouTube / Vimeo / file media / URL embed https → hiển thị trong lead. */
export function parseLeadVideoUrl(raw: string): ParsedLeadVideo | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.toLowerCase();
  const hrefHttps = url.href.replace(/^http:\/\//i, "https://");

  if (
    host === "youtu.be" ||
    host.endsWith("youtube.com") ||
    host === "youtube-nocookie.com" ||
    host.endsWith("youtube-nocookie.com")
  ) {
    const id = getYoutubeId(trimmed);
    if (id && /^[\w-]{6,64}$/.test(id)) {
      return {
        kind: "iframe",
        src: `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`,
      };
    }
    return null;
  }

  if (host.endsWith("vimeo.com") && !host.startsWith("player.")) {
    const seg = url.pathname.split("/").filter(Boolean)[0];
    if (seg && /^\d+$/.test(seg)) {
      return {
        kind: "iframe",
        src: `https://player.vimeo.com/video/${seg}`,
      };
    }
  }

  if (host.endsWith("player.vimeo.com")) {
    const m = url.pathname.match(/\/video\/(\d+)/);
    if (m?.[1]) {
      return { kind: "iframe", src: `https://player.vimeo.com/video/${m[1]}` };
    }
  }

  const pathLower = url.pathname.toLowerCase();
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(pathLower)) {
    return { kind: "video", src: hrefHttps };
  }

  return { kind: "iframe", src: hrefHttps };
}
