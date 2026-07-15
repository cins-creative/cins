/**
 * Resolve thumbnail embed phía server — oEmbed (Vimeo/Sketchfab) + OG fallback.
 * Dùng lúc publish / API compose; gallery read-time chỉ dùng sync (YouTube).
 */

import {
  resolveEmbedThumbnailUrlSync,
  type FirstGalleryEmbed,
} from "@/lib/editor/embed-thumbnail";
import type { EmbedProviderId } from "@/lib/editor/embed-providers";
import {
  fetchLinkOgPreview,
  isSafePublicHttpUrl,
} from "@/lib/link/og-preview";

const FETCH_TIMEOUT_MS = 8_000;

function extractVimeoId(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    if (!parsed.hostname.replace(/^www\./, "").includes("vimeo.com")) {
      return null;
    }
    const m = parsed.pathname.match(/\/(\d+)/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

async function fetchJsonWithTimeout(
  url: string,
): Promise<Record<string, unknown> | null> {
  if (!isSafePublicHttpUrl(url)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "CINSEmbedThumb/1.0 (+https://cins.vn)",
      },
    });
    if (!res.ok) return null;
    if (!isSafePublicHttpUrl(res.url || url)) return null;
    const json = (await res.json().catch(() => null)) as unknown;
    if (!json || typeof json !== "object") return null;
    return json as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function oEmbedThumbnail(payload: Record<string, unknown> | null): string | null {
  if (!payload) return null;
  const raw = payload.thumbnail_url;
  if (typeof raw !== "string" || !raw.trim()) return null;
  const thumb = raw.trim();
  return isSafePublicHttpUrl(thumb) ? thumb : null;
}

async function fetchVimeoOEmbedThumbnail(embedUrl: string): Promise<string | null> {
  const id = extractVimeoId(embedUrl);
  if (!id) return null;
  const endpoint = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(
    `https://vimeo.com/${id}`,
  )}`;
  return oEmbedThumbnail(await fetchJsonWithTimeout(endpoint));
}

async function fetchSketchfabOEmbedThumbnail(
  embedUrl: string,
): Promise<string | null> {
  const endpoint = `https://sketchfab.com/oembed?url=${encodeURIComponent(
    embedUrl.trim(),
  )}`;
  return oEmbedThumbnail(await fetchJsonWithTimeout(endpoint));
}

async function fetchOgImage(embedUrl: string): Promise<string | null> {
  const preview = await fetchLinkOgPreview(embedUrl);
  const image = preview?.image?.trim();
  if (!image || !isSafePublicHttpUrl(image)) return null;
  return image;
}

/**
 * URL ảnh thumbnail tốt nhất cho embed (không upload).
 * Thứ tự: sync (YouTube) → oEmbed (Vimeo/Sketchfab) → OG.
 */
export async function fetchEmbedThumbnailUrl(
  provider: EmbedProviderId,
  embedUrl: string,
): Promise<string | null> {
  const url = embedUrl.trim();
  if (!url) return null;

  const sync = resolveEmbedThumbnailUrlSync(provider, url);
  if (sync) return sync;

  if (provider === "vimeo") {
    const fromOEmbed = await fetchVimeoOEmbedThumbnail(url);
    if (fromOEmbed) return fromOEmbed;
  }

  if (provider === "sketchfab") {
    const fromOEmbed = await fetchSketchfabOEmbedThumbnail(url);
    if (fromOEmbed) return fromOEmbed;
  }

  /* Spline / PlayCanvas / Figma / Canva / Rive web / Framer / … */
  if (
    provider === "spline" ||
    provider === "playcanvas" ||
    provider === "figma" ||
    provider === "canva" ||
    provider === "rive" ||
    provider === "lottie" ||
    provider === "soundcloud" ||
    provider === "framer" ||
    provider === "codepen" ||
    provider === "sketchfab" ||
    provider === "vimeo"
  ) {
    return fetchOgImage(url);
  }

  return null;
}

export async function fetchEmbedThumbnailUrlForGalleryEmbed(
  embed: FirstGalleryEmbed,
): Promise<string | null> {
  if (embed.storedThumbnailUrl) return embed.storedThumbnailUrl;
  return fetchEmbedThumbnailUrl(embed.provider, embed.url);
}
