/** Client-safe — phân loại & build URL embed Bunny Stream (Journey video). */

export type BunnyVideoEmbed = {
  provider: "bunny";
  libraryId: string;
  videoId: string;
  url: string;
};

const GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function buildBunnyEmbedUrl(libraryId: string, videoId: string): string {
  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;
}

export function classifyBunnyVideoUrl(rawUrl: string): BunnyVideoEmbed | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;

  const host = parsed.hostname.replace(/^www\./, "");

  const embedMatch = parsed.pathname.match(/^\/embed\/([^/]+)\/([^/?#]+)/);
  if (
    embedMatch &&
    /^(iframe|player)\.mediadelivery\.net$/i.test(host)
  ) {
    const libraryId = embedMatch[1];
    const videoId = embedMatch[2];
    if (!GUID_RE.test(videoId)) return null;
    return {
      provider: "bunny",
      libraryId,
      videoId,
      url: buildBunnyEmbedUrl(libraryId, videoId),
    };
  }

  if (host.endsWith(".b-cdn.net")) {
    const cdnMatch = parsed.pathname.match(/^\/([^/?#]+)/);
    const videoId = cdnMatch?.[1];
    if (!videoId || !GUID_RE.test(videoId)) return null;
    const libraryId = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID?.trim();
    if (!libraryId) return null;
    return {
      provider: "bunny",
      libraryId,
      videoId,
      url: buildBunnyEmbedUrl(libraryId, videoId),
    };
  }

  return null;
}

export function isBunnyVideoUrl(url: string): boolean {
  return classifyBunnyVideoUrl(url) !== null;
}

export function bunnyIframeSrc(embed: BunnyVideoEmbed): string {
  return buildBunnyEmbedUrl(embed.libraryId, embed.videoId);
}
