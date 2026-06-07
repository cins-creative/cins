import "server-only";

import { buildBunnyVideoThumbnailUrl as buildFromPublicEnv } from "@/lib/bunny/embed";
import { getBunnyStreamConfig } from "@/lib/bunny/config";

/** Thumbnail Bunny Stream — ưu tiên `NEXT_PUBLIC_BUNNY_CDN_HOSTNAME`, fallback env server. */
export function buildBunnyVideoThumbnailUrl(videoId: string): string | null {
  const fromPublic = buildFromPublicEnv(videoId);
  if (fromPublic) return fromPublic;

  const config = getBunnyStreamConfig();
  if (!config?.cdnHostname || !videoId.trim()) return null;
  return `https://${config.cdnHostname}/${videoId.trim()}/thumbnail.jpg`;
}
