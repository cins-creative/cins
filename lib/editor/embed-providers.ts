/**
 * Tier 1 embed providers — whitelist URL → iframe src.
 * Dùng chung editor sanitize, PostRenderer, compose embed flow.
 */

import { getYoutubeId } from "@/lib/youtube";
import { isLottieAssetEmbedUrl } from "@/lib/editor/lottie-asset-url";
import { isRiveAssetEmbedUrl } from "@/lib/editor/rive-asset-url";

export type Tier1EmbedPlatformId =
  | "youtube"
  | "vimeo"
  | "figma"
  | "canva"
  | "sketchfab"
  | "spline"
  | "playcanvas"
  | "rive"
  | "lottie"
  | "codepen"
  | "soundcloud";

/** Mọi provider embed được lưu / render (gồm legacy Behance, Framer + file .riv/.lottie trên R2). */
export type EmbedProviderId =
  | Tier1EmbedPlatformId
  | "behance"
  | "framer"
  | "rive-file"
  | "lottie-file";

export type ClassifiedEmbed = {
  provider: EmbedProviderId;
  url: string;
};

export type EmbedPlatformGroupId =
  | "video"
  | "design"
  | "scene3d"
  | "motion"
  | "code"
  | "audio";

export type Tier1EmbedPlatformMeta = {
  id: Tier1EmbedPlatformId;
  label: string;
  hint: string;
  placeholder: string;
  exampleUrl: string;
  group: EmbedPlatformGroupId;
};

export type EmbedPlatformGroupMeta = {
  id: EmbedPlatformGroupId;
  label: string;
};

export const EMBED_PLATFORM_GROUPS: readonly EmbedPlatformGroupMeta[] = [
  { id: "video", label: "Video" },
  { id: "design", label: "Design" },
  { id: "scene3d", label: "3D & scene" },
  { id: "motion", label: "Motion" },
  { id: "code", label: "Creative coding" },
  { id: "audio", label: "Âm thanh" },
] as const;

export const TIER1_EMBED_PLATFORMS: readonly Tier1EmbedPlatformMeta[] = [
  {
    id: "youtube",
    label: "YouTube",
    hint: "Video, reel, breakdown, timelapse",
    placeholder: "https://www.youtube.com/watch?v=…",
    exampleUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    group: "video",
  },
  {
    id: "vimeo",
    label: "Vimeo",
    hint: "Video chuyên nghiệp, showreel",
    placeholder: "https://vimeo.com/123456789",
    exampleUrl: "https://vimeo.com/76979871",
    group: "video",
  },
  {
    id: "figma",
    label: "Figma",
    hint: "Design, prototype, FigJam",
    placeholder: "https://www.figma.com/design/…",
    exampleUrl: "https://www.figma.com/design/example",
    group: "design",
  },
  {
    id: "canva",
    label: "Canva",
    hint: "Design, presentation, social asset",
    placeholder: "https://www.canva.com/design/…/view",
    exampleUrl: "https://www.canva.com/design/DAFrLlkQu3Q/view",
    group: "design",
  },
  {
    id: "sketchfab",
    label: "Sketchfab",
    hint: "Model 3D tương tác",
    placeholder: "https://sketchfab.com/3d-models/…",
    exampleUrl:
      "https://sketchfab.com/3d-models/stay-home-ea49fe8bb9ca47909f79f64b86d94de1",
    group: "scene3d",
  },
  {
    id: "spline",
    label: "Spline",
    hint: "Scene 3D tương tác trên web",
    placeholder: "https://my.spline.design/…",
    exampleUrl: "https://my.spline.design/example-scene",
    group: "scene3d",
  },
  {
    id: "playcanvas",
    label: "PlayCanvas",
    hint: "Game / WebGL interactive",
    placeholder: "https://playcanv.as/p/…",
    exampleUrl: "https://playcanv.as/p/M9RjR1Cx/",
    group: "scene3d",
  },
  {
    id: "rive",
    label: "Rive",
    hint: "Motion & interaction",
    placeholder: "https://rive.app/s/…/embed",
    exampleUrl: "https://rive.app/s/example/embed",
    group: "motion",
  },
  {
    id: "lottie",
    label: "LottieFiles",
    hint: "Lottie animation",
    placeholder: "https://lottie.host/embed/…",
    exampleUrl:
      "https://lottie.host/embed/69b2d0a0-d887-435c-9be7-4db55796f227/j73MAwZiE2",
    group: "motion",
  },
  {
    id: "codepen",
    label: "CodePen",
    hint: "Creative coding, UI, shader demo",
    placeholder: "https://codepen.io/…/pen/…",
    exampleUrl: "https://codepen.io/team/codepen/pen/PNarYLP",
    group: "code",
  },
  {
    id: "soundcloud",
    label: "SoundCloud",
    hint: "Track, playlist, sound design",
    placeholder: "https://soundcloud.com/…/…",
    exampleUrl: "https://soundcloud.com/forss/flickermood",
    group: "audio",
  },
] as const;

const TIER1_IDS = new Set<string>(
  TIER1_EMBED_PLATFORMS.map((p) => p.id),
);

export function isTier1EmbedPlatformId(
  value: string | null | undefined,
): value is Tier1EmbedPlatformId {
  return Boolean(value && TIER1_IDS.has(value));
}

export function getTier1PlatformsByGroup(
  groupId: EmbedPlatformGroupId,
): readonly Tier1EmbedPlatformMeta[] {
  return TIER1_EMBED_PLATFORMS.filter((p) => p.group === groupId);
}

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
  { host: /^(www\.)?canva\.com$/i, provider: "canva" },
  { host: /^(www\.)?framer\.com$/i, provider: "framer" },
  { host: /^(www\.)?sketchfab\.com$/i, provider: "sketchfab" },
  { host: /^skfb\.ly$/i, provider: "sketchfab" },
  { host: /^my\.spline\.design$/i, provider: "spline" },
  { host: /^(playcanv\.as|playcanvas\.com)$/i, provider: "playcanvas" },
  { host: /^(www\.)?rive\.app$/i, provider: "rive" },
  {
    host: /^(www\.|embed\.)?lottiefiles\.com$/i,
    provider: "lottie",
  },
  { host: /^lottie\.host$/i, provider: "lottie" },
  { host: /^(www\.)?codepen\.io$/i, provider: "codepen" },
  {
    host: /^(www\.|w\.|api\.)?soundcloud\.com$/i,
    provider: "soundcloud",
  },
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
  if (isLottieAssetEmbedUrl(rawUrl)) {
    return { provider: "lottie-file", url: rawUrl!.trim() };
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
  if (platform === "lottie" && isLottieAssetEmbedUrl(rawUrl)) {
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

/** Canva design → /view?embed (tldraw / Canva smart embed pattern). */
function normalizeCanvaEmbedSrc(url: string): string | null {
  const parsed = parseEmbedUrl(url);
  if (!parsed) return null;
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts[0]?.toLowerCase() !== "design" || !parts[1]) return null;

  const designId = parts[1];
  const rest = parts.slice(2);
  const actions = new Set(["view", "watch", "edit"]);
  let token: string | null = null;
  if (rest[0] && !actions.has(rest[0].toLowerCase())) {
    token = rest[0];
  }

  const path = token
    ? `/design/${encodeURIComponent(designId)}/${encodeURIComponent(token)}/view`
    : `/design/${encodeURIComponent(designId)}/view`;
  return `https://www.canva.com${path}?embed`;
}

function normalizeSplineEmbedSrc(url: string): string | null {
  const parsed = parseEmbedUrl(url);
  if (!parsed) return null;
  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  if (host !== "my.spline.design") return null;
  const slug = parsed.pathname.replace(/^\/+|\/+$/g, "").split("/")[0];
  if (!slug) return null;
  return `https://my.spline.design/${encodeURIComponent(slug)}`;
}

function normalizePlayCanvasEmbedSrc(url: string): string | null {
  const parsed = parseEmbedUrl(url);
  if (!parsed) return null;
  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  if (host !== "playcanv.as" && host !== "playcanvas.com") return null;

  const m = parsed.pathname.match(/\/(?:e\/)?p\/([^/?#]+)/i);
  if (!m?.[1]) return null;
  return `https://playcanv.as/e/p/${encodeURIComponent(m[1])}/`;
}

function normalizeLottieEmbedSrc(url: string): string | null {
  const parsed = parseEmbedUrl(url);
  if (!parsed) return null;
  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

  /* Handoff hiện tại — iFrame / oEmbed: lottie.host/embed/{uuid}/{slug} */
  if (host === "lottie.host") {
    const embed = parsed.pathname.match(
      /^\/embed\/([0-9a-f-]{36})\/([A-Za-z0-9_-]+)\/?$/i,
    );
    if (embed?.[1] && embed[2]) {
      return `https://lottie.host/embed/${embed[1].toLowerCase()}/${encodeURIComponent(embed[2])}`;
    }
    /* Asset CDN (.lottie/.json) — không phải iframe; dùng upload file hoặc player. */
    return null;
  }

  if (host === "embed.lottiefiles.com") {
    const m = parsed.pathname.match(/\/animation\/([^/?#]+)/i);
    if (!m?.[1]) return null;
    return `https://embed.lottiefiles.com/animation/${encodeURIComponent(m[1])}`;
  }

  if (host === "lottiefiles.com") {
    const anim = parsed.pathname.match(
      /\/(?:free-)?animations?\/(?:[^/?#]*-)?([A-Za-z0-9]+)/i,
    );
    if (anim?.[1]) {
      return `https://embed.lottiefiles.com/animation/${encodeURIComponent(anim[1])}`;
    }
  }

  return null;
}

function normalizeCodePenEmbedSrc(url: string): string | null {
  const parsed = parseEmbedUrl(url);
  if (!parsed) return null;

  const team = parsed.pathname.match(
    /^\/team\/([^/]+)\/(?:pen|embed|full|details)\/([^/?#]+)/i,
  );
  if (team?.[1] && team[2]) {
    return `https://codepen.io/team/${encodeURIComponent(team[1])}/embed/${encodeURIComponent(team[2])}?default-tab=result&theme-id=dark`;
  }

  const m = parsed.pathname.match(
    /^\/([^/]+)\/(?:pen|embed|full|details)\/([^/?#]+)/i,
  );
  if (!m) return null;
  const user = m[1];
  const slug = m[2];
  if (
    !user ||
    !slug ||
    user.toLowerCase() === "anon" ||
    user.toLowerCase() === "team"
  ) {
    return null;
  }
  return `https://codepen.io/${encodeURIComponent(user)}/embed/${encodeURIComponent(slug)}?default-tab=result&theme-id=dark`;
}

function normalizeSoundCloudEmbedSrc(url: string): string | null {
  const parsed = parseEmbedUrl(url);
  if (!parsed) return null;
  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "w.soundcloud.com" && parsed.pathname.includes("/player")) {
    const nested = parsed.searchParams.get("url");
    if (!nested) return null;
    try {
      const nestedUrl = new URL(nested);
      if (!nestedUrl.hostname.includes("soundcloud.com")) return null;
    } catch {
      return null;
    }
    const out = new URL("https://w.soundcloud.com/player/");
    out.searchParams.set("url", nested);
    out.searchParams.set("auto_play", "false");
    out.searchParams.set("hide_related", "true");
    out.searchParams.set("show_comments", "false");
    out.searchParams.set("visual", "true");
    return out.toString();
  }

  if (!host.includes("soundcloud.com")) return null;
  if (host.startsWith("api.")) {
    // api.soundcloud.com/tracks/… — widget accepts these
  } else {
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
  }

  const out = new URL("https://w.soundcloud.com/player/");
  out.searchParams.set("url", parsed.toString());
  out.searchParams.set("auto_play", "false");
  out.searchParams.set("hide_related", "true");
  out.searchParams.set("show_comments", "false");
  out.searchParams.set("visual", "true");
  return out.toString();
}

/** Permissions string for iframe `allow` (no `allow=` wrapper). */
export function embedIframeAllowAttr(
  provider: EmbedProviderId | string,
): string {
  switch (provider) {
    case "rive":
    case "rive-file":
      return "autoplay; encrypted-media; clipboard-write";
    case "sketchfab":
    case "spline":
      return "autoplay; fullscreen; xr-spatial-tracking";
    case "playcanvas":
      return "camera; microphone; xr-spatial-tracking; fullscreen; autoplay";
    case "youtube":
    case "vimeo":
      return "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    case "soundcloud":
      return "autoplay; encrypted-media";
    case "lottie":
    case "lottie-file":
      return "autoplay";
    case "codepen":
      return "fullscreen; clipboard-write";
    default:
      return "fullscreen";
  }
}

export function embedIframeTitle(provider: EmbedProviderId | string): string {
  switch (provider) {
    case "youtube":
      return "YouTube video player";
    case "vimeo":
      return "Vimeo video player";
    case "figma":
      return "Figma file";
    case "canva":
      return "Canva design";
    case "framer":
      return "Framer prototype";
    case "sketchfab":
      return "Sketchfab 3D model";
    case "spline":
      return "Spline 3D scene";
    case "playcanvas":
      return "PlayCanvas app";
    case "rive":
    case "rive-file":
      return "Rive animation";
    case "lottie":
    case "lottie-file":
      return "Lottie animation";
    case "codepen":
      return "CodePen embed";
    case "soundcloud":
      return "SoundCloud player";
    case "behance":
      return "Behance project";
    default:
      return "Embedded content";
  }
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

  if (cls.provider === "canva") {
    return normalizeCanvaEmbedSrc(cls.url);
  }

  if (cls.provider === "framer") {
    return normalizeFramerEmbedSrc(cls.url);
  }

  if (cls.provider === "sketchfab") {
    return normalizeSketchfabEmbedSrc(cls.url);
  }

  if (cls.provider === "spline") {
    return normalizeSplineEmbedSrc(cls.url);
  }

  if (cls.provider === "playcanvas") {
    return normalizePlayCanvasEmbedSrc(cls.url);
  }

  if (cls.provider === "rive") {
    return normalizeRiveEmbedSrc(cls.url);
  }

  if (cls.provider === "lottie") {
    return normalizeLottieEmbedSrc(cls.url);
  }

  if (cls.provider === "codepen") {
    return normalizeCodePenEmbedSrc(cls.url);
  }

  if (cls.provider === "soundcloud") {
    return normalizeSoundCloudEmbedSrc(cls.url);
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
