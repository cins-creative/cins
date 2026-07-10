import type { EmbedProviderId, Tier1EmbedPlatformId } from "@/lib/editor/embed-providers";

/** Logo mini trên gallery / embed picker — Tier 1 + file .riv. */
export type EmbedPlatformLogoId = Tier1EmbedPlatformId | "rive-file";

export const EMBED_PLATFORM_LOGO: Record<EmbedPlatformLogoId, string> = {
  youtube: "/assets/embed-platforms/youtube.png",
  vimeo: "/assets/embed-platforms/vimeo.png",
  figma: "/assets/embed-platforms/figma.png",
  sketchfab: "/assets/embed-platforms/sketchfab.png",
  rive: "/assets/embed-platforms/rive.png",
  "rive-file": "/assets/embed-platforms/rive.png",
};

export function embedPlatformLogoSrc(
  provider: EmbedProviderId | null | undefined,
): string | null {
  if (!provider) return null;
  if (provider in EMBED_PLATFORM_LOGO) {
    return EMBED_PLATFORM_LOGO[provider as EmbedPlatformLogoId];
  }
  return null;
}
