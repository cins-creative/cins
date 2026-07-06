import { galleryDisplayHref } from "@/lib/journey/gallery-display-url";
import {
  getConfiguredSiteUrl,
  isLikelyLocalOrPreviewHost,
} from "@/lib/auth/auth-origin";

/** Origin công khai khi dev/preview — FB/LI không scrape localhost. */
const FALLBACK_PUBLIC_ORIGIN = "https://cins.vn";

export function journeyPathForView(
  slug: string,
  view: "journey" | "gallery" = "journey",
): string {
  return view === "journey"
    ? `/${encodeURIComponent(slug)}`
    : `/${encodeURIComponent(slug)}?view=gallery`;
}

export function resolveShareOrigin(): string {
  if (typeof window === "undefined") return FALLBACK_PUBLIC_ORIGIN;
  try {
    const current = new URL(window.location.href);
    if (!isLikelyLocalOrPreviewHost(current.hostname)) {
      return current.origin;
    }
    const configured = getConfiguredSiteUrl();
    if (configured && !isLikelyLocalOrPreviewHost(configured.hostname)) {
      return configured.origin;
    }
    return FALLBACK_PUBLIC_ORIGIN;
  } catch {
    return FALLBACK_PUBLIC_ORIGIN;
  }
}

export function absoluteShareUrl(path: string): string {
  const base = resolveShareOrigin();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export type JourneyShareProfile = {
  slug: string;
  displayName: string;
  initials: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  roleLine: string;
  locationLine?: string | null;
  stats?: { cotMoc: number; tacPham: number };
  /** Thumbnail gallery — lấy từ cache panel khi có. */
  galleryThumbs?: string[];
};

export type JourneyShareCardKind = "journey" | "gallery";

export type JourneyShareCardVariant =
  | "profile"
  | "glass"
  | "hero"
  | "tab"
  | "mosaic"
  | "spotlight"
  | "filmstrip"
  | "portfolio";

export type JourneyJourneyCardVariant = "profile" | "glass" | "hero" | "tab";

export type JourneyGalleryCardVariant =
  | "mosaic"
  | "spotlight"
  | "filmstrip"
  | "portfolio";

export type JourneyShareMenuStep = "menu" | "journey-card" | "gallery-card";

export const JOURNEY_SHARE_CARD_VARIANTS: Record<
  JourneyShareCardKind,
  ReadonlyArray<{
    id: JourneyShareCardVariant;
    label: string;
    hint: string;
  }>
> = {
  journey: [
    { id: "profile", label: "Hồ sơ", hint: "Cover cinematic · avatar gradient · thống kê nổi bật" },
    { id: "glass", label: "Glass", hint: "Mesh màu · thẻ frosted · đủ thông tin hồ sơ" },
    { id: "hero", label: "Hero", hint: "Cover trái · hồ sơ phải" },
    { id: "tab", label: "Tab", hint: "Visual trái · panel ấm phải" },
  ],
  gallery: [
    { id: "mosaic", label: "Mosaic", hint: "Lưới 2×2 — ảnh ngang 4:3" },
    { id: "spotlight", label: "Spotlight", hint: "Hero 16:9 + hàng 4:3" },
    { id: "filmstrip", label: "Filmstrip", hint: "Dải ngang 16:9" },
    {
      id: "portfolio",
      label: "Portfolio",
      hint: "Header hồ sơ · mosaic tác phẩm nổi bật",
    },
  ],
};

export function journeyShareUrl(slug: string): string {
  return absoluteShareUrl(journeyPathForView(slug, "journey"));
}

export function galleryShareUrl(slug: string): string {
  return absoluteShareUrl(galleryDisplayHref(slug, "card"));
}

export function facebookShareUrl(shareUrl: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&display=popup`;
}

/** Mở FB share + copy link dự phòng (composer đôi khi trống). */
export async function openFacebookShare(
  shareUrl: string,
  shareTitle: string,
): Promise<void> {
  const clipText = shareTitle.trim()
    ? `${shareTitle.trim()}\n${shareUrl}`
    : shareUrl;
  await copyTextToClipboard(clipText);

  const url = facebookShareUrl(shareUrl);
  const popup = window.open(
    url,
    "cins-fb-share",
    "noopener,noreferrer,width=600,height=720,menubar=no,toolbar=no,status=no,scrollbars=yes",
  );
  if (!popup) {
    window.open(url, "_blank", "noopener,noreferrer");
  } else {
    popup.focus();
  }
}

export type SocialShareItem = {
  id: string;
  label: string;
  iconClass: string;
  iconLabel: string;
  href?: string;
  onClick?: () => void;
};

export function buildSocialShareItems(
  shareUrl: string,
  shareTitle: string,
  opts?: {
    onNativeShare?: () => void;
    onCopy?: () => void;
    onFacebookShare?: () => void;
  },
): SocialShareItem[] {
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(shareTitle || "CINs");

  return [
    ...(typeof navigator !== "undefined" && "share" in navigator && opts?.onNativeShare
      ? [
          {
            id: "native",
            label: "Chia sẻ…",
            iconClass: "j-share-soc-ic--native",
            iconLabel: "↗",
            onClick: opts.onNativeShare,
          } satisfies SocialShareItem,
        ]
      : []),
    ...(opts?.onCopy
      ? [
          {
            id: "copy",
            label: "Copy link",
            iconClass: "j-share-soc-ic--copy",
            iconLabel: "⎘",
            onClick: opts.onCopy,
          } satisfies SocialShareItem,
        ]
      : []),
    opts?.onFacebookShare
      ? {
          id: "fb",
          label: "Facebook",
          iconClass: "j-share-soc-ic--fb",
          iconLabel: "f",
          onClick: opts.onFacebookShare,
        }
      : {
          id: "fb",
          label: "Facebook",
          iconClass: "j-share-soc-ic--fb",
          iconLabel: "f",
          href: facebookShareUrl(shareUrl),
        },
    {
      id: "x",
      label: "X",
      iconClass: "j-share-soc-ic--x",
      iconLabel: "𝕏",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      iconClass: "j-share-soc-ic--in",
      iconLabel: "in",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      id: "zalo",
      label: "Zalo",
      iconClass: "j-share-soc-ic--zalo",
      iconLabel: "Z",
      href: `https://button-share.zalo.me/share_external?layout=1&color=blue&customize=false&width=24&height=24&isDesktop=true&href=${encodedUrl}`,
    },
    {
      id: "wa",
      label: "WhatsApp",
      iconClass: "j-share-soc-ic--wa",
      iconLabel: "W",
      href: `https://wa.me/?text=${encodeURIComponent(`${shareTitle ? `${shareTitle} — ` : ""}${shareUrl}`)}`,
    },
  ];
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const input = document.createElement("textarea");
      input.value = text;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.left = "-9999px";
      document.body.appendChild(input);
      input.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(input);
      return ok;
    } catch {
      return false;
    }
  }
}
