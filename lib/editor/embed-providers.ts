/**
 * Tier 1 embed providers — whitelist URL → iframe src.
 * Dùng chung editor sanitize, PostRenderer, compose embed flow.
 */

import { getYoutubeId } from "@/lib/youtube";
import { isRiveAssetEmbedUrl } from "@/lib/editor/rive-asset-url";

export type Tier1EmbedPlatformId =
  | "youtube"
  | "vimeo"
  | "figma"
  | "sketchfab"
  | "rive";

/** Mọi provider embed được lưu / render (gồm legacy Behance, Framer + file .riv trên R2). */
export type EmbedProviderId =
  | Tier1EmbedPlatformId
  | "behance"
  | "framer"
  | "rive-file";

export type ClassifiedEmbed = {
  provider: EmbedProviderId;
  url: string;
};

export type Tier1EmbedPlatformMeta = {
  id: Tier1EmbedPlatformId;
  label: string;
  hint: string;
  placeholder: string;
  exampleUrl: string;
};

export const TIER1_EMBED_PLATFORMS: readonly Tier1EmbedPlatformMeta[] = [
  {
    id: "youtube",
    label: "YouTube",
    hint: "Video, reel, breakdown, timelapse",
    placeholder: "https://www.youtube.com/watch?v=…",
    exampleUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  },
  {
    id: "vimeo",
    label: "Vimeo",
    hint: "Video chuyên nghiệp, showreel",
    placeholder: "https://vimeo.com/123456789",
    exampleUrl: "https://vimeo.com/76979871",
  },
  {
    id: "figma",
    label: "Figma",
    hint: "Design, prototype, FigJam",
    placeholder: "https://www.figma.com/design/…",
    exampleUrl: "https://www.figma.com/design/example",
  },
  {
    id: "sketchfab",
    label: "Sketchfab",
    hint: "Model 3D tương tác",
    placeholder: "https://sketchfab.com/3d-models/…",
    exampleUrl:
      "https://sketchfab.com/3d-models/stay-home-ea49fe8bb9ca47909f79f64b86d94de1",
  },
  {
    id: "rive",
    label: "Rive",
    hint: "Motion & interaction",
    placeholder: "https://rive.app/s/…/embed",
    exampleUrl: "https://rive.app/s/example/embed",
  },
] as const;

const EMBED_HOST_RULES: Array<{
  host: RegExp;
  provider: EmbedProviderId;
}> = [
  {
    host: /^(www\.|m\.)?(youtube\.com|youtube-nocookie\.com|youtu\.be)$/i,
    provider: "youtube",
  },
  { host: /^(www\.)?vimeo\.com$/i, provider: "vimeo" },
  { host: /^(www\.)?(figma\.com|embed\.figma\.com)$/i, provider: "figma" },
  { host: /^(www\.)?framer\.com$/i, provider: "framer" },
  { host: /^(www\.)?sketchfab\.com$/i, provider: "sketchfab" },
  { host: /^skfb\.ly$/i, provider: "sketchfab" },
  { host: /^(www\.)?rive\.app$/i, provider: "rive" },
  { host: /^(www\.)?behance\.net$/i, provider: "behance" },
];

function parseEmbedUrl(rawUrl: string | undefined): URL | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function classifyEmbedUrl(
  rawUrl: string | undefined,
): ClassifiedEmbed | null {
  if (isRiveAssetEmbedUrl(rawUrl)) {
    return { provider: "rive-file", url: rawUrl!.trim() };
  }
  const parsed = parseEmbedUrl(rawUrl);
  if (!parsed) return null;
  const host = parsed.hostname.replace(/^www\./, "");
  for (const rule of EMBED_HOST_RULES) {
    if (rule.host.test(host) || rule.host.test(parsed.hostname)) {
      return { provider: rule.provider, url: parsed.toString() };
    }
  }
  return null;
}

export function embedUrlMatchesPlatform(
  rawUrl: string,
  platform: Tier1EmbedPlatformId,
): boolean {
  if (platform === "rive" && isRiveAssetEmbedUrl(rawUrl)) {
    return true;
  }
  const cls = classifyEmbedUrl(rawUrl);
  if (cls?.provider !== platform) return false;
  return buildEmbedIframeSrc(cls) !== null;
}

export function getTier1EmbedPlatformMeta(
  id: Tier1EmbedPlatformId,
): Tier1EmbedPlatformMeta {
  const meta = TIER1_EMBED_PLATFORMS.find((p) => p.id === id);
  if (!meta) {
    return TIER1_EMBED_PLATFORMS[0];
  }
  return meta;
}

function extractVimeoId(url: string): string | null {
  const parsed = parseEmbedUrl(url);
  if (!parsed) return null;
  if (!parsed.hostname.replace(/^www\./, "").includes("vimeo.com")) return null;
  const m = parsed.pathname.match(/\/(\d+)/);
  return m?.[1] ?? null;
}

function extractSketchfabModelId(url: string): string | null {
  const parsed = parseEmbedUrl(url);
  if (!parsed) return null;
  const host = parsed.hostname.replace(/^www\./, "");
  if (host === "skfb.ly") {
    const slug = parsed.pathname.replace(/^\/+/, "").split("/")[0];
    return slug || null;
  }

  const segmentMatch = parsed.pathname.match(
    /\/(?:3d-models|models)\/([^/?#]+)/,
  );
  if (!segmentMatch) return null;

  const segment = decodeURIComponent(segmentMatch[1]);
  if (/^[a-f0-9]{32}$/i.test(segment)) return segment;

  const hexMatch = segment.match(/([a-f0-9]{32})$/i);
  if (hexMatch) return hexMatch[1];

  return segment;
}

function normalizeSketchfabEmbedSrc(url: string): string | null {
  const parsed = parseEmbedUrl(url);
  if (!parsed) return null;

  const id = extractSketchfabModelId(url);
  if (!id) return null;

  const out = new URL(
    `https://sketchfab.com/models/${encodeURIComponent(id)}/embed`,
  );

  if (parsed.pathname.includes("/embed")) {
    parsed.searchParams.forEach((value, key) => {
      out.searchParams.set(key, value);
    });
  }

  if (!out.searchParams.has("autostart")) {
    out.searchParams.set("autostart", "0");
  }
  if (!out.searchParams.has("ui_watermark")) {
    out.searchParams.set("ui_watermark", "0");
  }

  return out.toString();
}

function normalizeRiveEmbedSrc(url: string): string {
  const parsed = parseEmbedUrl(url);
  if (!parsed) return url;
  if (parsed.pathname.endsWith("/embed")) return parsed.toString();
  const m = parsed.pathname.match(/\/s\/([^/?#]+)/);
  if (m) {
    return `https://rive.app/s/${encodeURIComponent(m[1])}/embed`;
  }
  return parsed.toString();
}

function normalizeFramerEmbedSrc(url: string): string {
  const parsed = parseEmbedUrl(url);
  if (!parsed) return url;
  if (parsed.pathname.includes("/embed")) return parsed.toString();
  if (parsed.pathname.includes("/projects/")) {
    const base = parsed.pathname.replace(/\/$/, "");
    return `https://framer.com${base}/embed`;
  }
  return parsed.toString();
}

function figmaEmbedSrc(originalUrl: string): string {
  return `https://www.figma.com/embed?embed_host=cins&url=${encodeURIComponent(originalUrl)}`;
}

/** Build iframe `src` — null nếu không nhúng inline được (Behance). */
export function buildEmbedIframeSrc(
  cls: ClassifiedEmbed,
  options?: { autoplay?: boolean },
): string | null {
  const autoplay = options?.autoplay === true;

  if (cls.provider === "youtube") {
    const id = getYoutubeId(cls.url);
    if (!id) return null;
    const base = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
    return autoplay ? `${base}?autoplay=1&playsinline=1` : base;
  }

  if (cls.provider === "vimeo") {
    const id = extractVimeoId(cls.url);
    if (!id) return null;
    const base = `https://player.vimeo.com/video/${encodeURIComponent(id)}`;
    return autoplay ? `${base}?autoplay=1` : base;
  }

  if (cls.provider === "figma") {
    return figmaEmbedSrc(cls.url);
  }

  if (cls.provider === "framer") {
    return normalizeFramerEmbedSrc(cls.url);
  }

  if (cls.provider === "sketchfab") {
    return normalizeSketchfabEmbedSrc(cls.url);
  }

  if (cls.provider === "rive") {
    return normalizeRiveEmbedSrc(cls.url);
  }

  return null;
}

export function buildEmbedIframeSrcFromUrl(
  rawUrl: string,
  options?: { autoplay?: boolean },
): string | null {
  const cls = classifyEmbedUrl(rawUrl);
  if (!cls) return null;
  return buildEmbedIframeSrc(cls, options);
}
