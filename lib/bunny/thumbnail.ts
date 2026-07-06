import "server-only";

import { buildBunnyVideoThumbnailUrl as buildFromPublicEnv } from "@/lib/bunny/embed";
import { getBunnyStreamConfig } from "@/lib/bunny/config";

/** CDN pull zone — public env trước, rồi server env (gallery SSR). */
export function resolveBunnyCdnHostname(): string | null {
  const fromPublic = process.env.NEXT_PUBLIC_BUNNY_CDN_HOSTNAME?.trim();
  if (fromPublic) return fromPublic;

  const fromServer =
    process.env.BUNNY_CDN_HOSTNAME?.trim() ||
    process.env.BUNNY_CND_HOSTNAME?.trim();
  if (fromServer) return fromServer;

  return getBunnyStreamConfig()?.cdnHostname ?? null;
}

/** Thumbnail Bunny Stream — ưu tiên `NEXT_PUBLIC_BUNNY_CDN_HOSTNAME`, fallback env server. */
export function buildBunnyVideoThumbnailUrl(videoId: string): string | null {
  const fromPublic = buildFromPublicEnv(videoId);
  if (fromPublic) return fromPublic;

  const cdnHostname = resolveBunnyCdnHostname();
  if (!cdnHostname || !videoId.trim()) return null;
  return `https://${cdnHostname}/${videoId.trim()}/thumbnail.jpg`;
}

/** MP4 Bunny — gallery `<video preload="metadata">` lấy frame đầu. */
export function buildBunnyVideoMp4Url(
  videoId: string,
  quality: "360p" | "480p" | "720p" = "360p",
): string | null {
  const cdnHostname = resolveBunnyCdnHostname();
  if (!cdnHostname || !videoId.trim()) return null;
  return `https://${cdnHostname}/${videoId.trim()}/play_${quality}.mp4`;
}
