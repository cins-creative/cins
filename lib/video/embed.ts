/**
 * Client-safe — phân giải embed video Cloudflare Stream.
 */

import {
  buildStreamHlsUrl,
  buildStreamIframeUrl,
  buildStreamThumbnailUrl,
  classifyStreamVideoUrl,
  isStreamUid,
  type StreamVideoEmbed,
} from "@/lib/cloudflare/stream-embed";

export type VideoProvider = "stream";

export type ResolvedVideoEmbed = {
  provider: "stream";
  id: string;
  stream: StreamVideoEmbed;
};

export type VideoEmbedHints = {
  /** `config.videoProvider` — nguồn tường minh khi URL chưa classify được. */
  videoProvider?: string | null;
  /** `config.videoId` — Stream uid. */
  videoId?: string | null;
};

/** Phân giải embed video từ URL + hint provider/id (Cloudflare Stream). */
export function resolveVideoEmbed(
  url: string,
  hints?: VideoEmbedHints,
): ResolvedVideoEmbed | null {
  const provider = hints?.videoProvider?.trim().toLowerCase();
  const videoId = hints?.videoId?.trim() || "";

  if (provider === "stream") {
    const uid = videoId || "";
    if (isStreamUid(uid)) {
      return {
        provider: "stream",
        id: uid,
        stream: { provider: "stream", uid, url: buildStreamIframeUrl(uid) },
      };
    }
    const fromUrl = classifyStreamVideoUrl(url);
    if (fromUrl) return { provider: "stream", id: fromUrl.uid, stream: fromUrl };
  }

  const streamFromUrl = classifyStreamVideoUrl(url);
  if (streamFromUrl) {
    return { provider: "stream", id: streamFromUrl.uid, stream: streamFromUrl };
  }

  if (videoId && isStreamUid(videoId)) {
    return {
      provider: "stream",
      id: videoId,
      stream: {
        provider: "stream",
        uid: videoId,
        url: buildStreamIframeUrl(videoId),
      },
    };
  }

  return null;
}

/** URL iframe phát video (autoplay tuỳ chọn). */
export function buildResolvedVideoIframeSrc(
  embed: ResolvedVideoEmbed,
  autoplay = false,
): string {
  const base = buildStreamIframeUrl(embed.id);
  const params = new URLSearchParams();
  if (autoplay) {
    params.set("autoplay", "true");
    params.set("muted", "true");
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function resolvedVideoThumbnailUrl(
  embed: ResolvedVideoEmbed,
): string | null {
  return buildStreamThumbnailUrl(embed.id);
}

export function resolvedVideoHlsUrl(embed: ResolvedVideoEmbed): string | null {
  return buildStreamHlsUrl(embed.id);
}
