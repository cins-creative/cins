/**
 * Client-safe — lớp trừu tượng provider video (Bunny ↔ Cloudflare Stream).
 *
 * Trong lúc migrate, block embed có thể là:
 *   - Bunny (cũ): `config.bunnyVideoId` hoặc URL iframe.mediadelivery.net / *.b-cdn.net
 *   - Stream (mới): `config.videoProvider='stream'` + `config.videoId` hoặc URL cloudflarestream.com
 *
 * Đây là điểm phân giải chung để cả hai chạy song song cho tới khi backfill xong.
 */

import {
  bunnyIframeSrc,
  buildBunnyVideoThumbnailUrl,
  type BunnyVideoEmbed,
} from "@/lib/bunny/embed";
import { resolveBunnyEmbed } from "@/lib/journey/video-embed";
import {
  buildStreamHlsUrl,
  buildStreamIframeUrl,
  buildStreamThumbnailUrl,
  classifyStreamVideoUrl,
  isStreamUid,
  type StreamVideoEmbed,
} from "@/lib/cloudflare/stream-embed";

export type VideoProvider = "bunny" | "stream";

export type ResolvedVideoEmbed =
  | { provider: "bunny"; id: string; bunny: BunnyVideoEmbed }
  | { provider: "stream"; id: string; stream: StreamVideoEmbed };

export type VideoEmbedHints = {
  /** `config.videoProvider` — nguồn tường minh khi URL chưa classify được. */
  videoProvider?: string | null;
  /** `config.videoId` — id chung (Stream uid hoặc Bunny guid). */
  videoId?: string | null;
  /** Legacy `config.bunnyVideoId`. */
  bunnyVideoId?: string | null;
};

/** Phân giải embed video từ URL + hint provider/id (Bunny cũ hoặc Stream mới). */
export function resolveVideoEmbed(
  url: string,
  hints?: VideoEmbedHints,
): ResolvedVideoEmbed | null {
  const provider = hints?.videoProvider?.trim().toLowerCase();
  const videoId = hints?.videoId?.trim() || "";

  // 1) Provider tường minh = stream.
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

  // 2) URL Stream.
  const streamFromUrl = classifyStreamVideoUrl(url);
  if (streamFromUrl) {
    return { provider: "stream", id: streamFromUrl.uid, stream: streamFromUrl };
  }

  // 3) Stream uid trong videoId (khi provider không set nhưng id là uid Stream).
  if (provider !== "bunny" && videoId && isStreamUid(videoId)) {
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

  // 4) Bunny (URL hoặc guid legacy).
  const bunny = resolveBunnyEmbed(url, videoId || hints?.bunnyVideoId || null);
  if (bunny) return { provider: "bunny", id: bunny.videoId, bunny };

  return null;
}

/** URL iframe phát video theo provider (autoplay tuỳ chọn). */
export function buildResolvedVideoIframeSrc(
  embed: ResolvedVideoEmbed,
  autoplay = false,
): string {
  if (embed.provider === "stream") {
    const base = buildStreamIframeUrl(embed.id);
    const params = new URLSearchParams();
    if (autoplay) {
      params.set("autoplay", "true");
      params.set("muted", "true");
    }
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }
  const base = bunnyIframeSrc(embed.bunny);
  const sep = base.includes("?") ? "&" : "?";
  return autoplay
    ? `${base}${sep}autoplay=true&preload=true&playsinline=true`
    : `${base}${sep}preload=true&playsinline=true`;
}

export function resolvedVideoThumbnailUrl(
  embed: ResolvedVideoEmbed,
): string | null {
  return embed.provider === "stream"
    ? buildStreamThumbnailUrl(embed.id)
    : buildBunnyVideoThumbnailUrl(embed.id);
}

/** HLS chỉ có ở Stream — Bunny dùng iframe/MP4. */
export function resolvedVideoHlsUrl(embed: ResolvedVideoEmbed): string | null {
  return embed.provider === "stream" ? buildStreamHlsUrl(embed.id) : null;
}
