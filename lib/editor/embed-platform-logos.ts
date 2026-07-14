import type {
  EmbedProviderId,
  Tier1EmbedPlatformId,
} from "@/lib/editor/embed-providers";

/** Logo mini trên gallery / embed picker — Tier 1 + file .riv/.lottie (CF Images 64×64). */
export type EmbedPlatformLogoId =
  | Tier1EmbedPlatformId
  | "rive-file"
  | "lottie-file";

const CF_EMBED_LOGO = (id: string) =>
  `https://imagedelivery.net/uJ2XS8GFEXi_dIXASK1Fkw/cins-embed-logo-${id}/public`;

export const EMBED_PLATFORM_LOGO: Record<EmbedPlatformLogoId, string> = {
  youtube: CF_EMBED_LOGO("youtube"),
  vimeo: CF_EMBED_LOGO("vimeo"),
  figma: CF_EMBED_LOGO("figma"),
  canva: CF_EMBED_LOGO("canva"),
  sketchfab: CF_EMBED_LOGO("sketchfab"),
  spline: CF_EMBED_LOGO("spline"),
  playcanvas: CF_EMBED_LOGO("playcanvas"),
  rive: CF_EMBED_LOGO("rive"),
  "rive-file": CF_EMBED_LOGO("rive"),
  lottie: CF_EMBED_LOGO("lottie"),
  "lottie-file": CF_EMBED_LOGO("lottie"),
  soundcloud: CF_EMBED_LOGO("soundcloud"),
};

export function embedPlatformLogoSrc(
  provider: EmbedProviderId | null | undefined,
): string | null {
  if (!provider) return null;
  if (provider in EMBED_PLATFORM_LOGO) {
    return EMBED_PLATFORM_LOGO[provider as EmbedPlatformLogoId];
  }
  if (provider === "framer") {
    return CF_EMBED_LOGO("framer");
  }
  if (provider === "codepen") {
    return CF_EMBED_LOGO("codepen");
  }
  return null;
}
