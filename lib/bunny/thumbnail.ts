import "server-only";

import { getBunnyStreamConfig } from "@/lib/bunny/config";

/** Thumbnail Bunny Stream — `{cdn}/{videoId}/thumbnail.jpg`. */
export function buildBunnyVideoThumbnailUrl(videoId: string): string | null {
  const config = getBunnyStreamConfig();
  if (!config?.cdnHostname || !videoId.trim()) return null;
  return `https://${config.cdnHostname}/${videoId.trim()}/thumbnail.jpg`;
}
