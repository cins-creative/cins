import type { ProfileAvatarFrameSlice } from "@/lib/journey/avatar-frame";
import type { ProfileCardThemeSlice } from "@/lib/journey/card-theme";
import type { ProfilePopoverThemeSlice } from "@/lib/journey/popover-theme";
import type {
  ProfileCustomEntry,
  ProfileThemeSlice,
} from "@/lib/journey/profile-theme";
import type { ProfileShopSwitchSlice } from "@/lib/journey/shop-switch";
import type { ProfileWatermarkSlice } from "@/lib/journey/watermark";

export type GiaoDienPatchBody = Record<string, unknown>;

export type GiaoDienPatchResult = {
  ok: boolean;
  error?: string;
  customs?: ProfileCustomEntry[];
  avatarFrame?: unknown;
  card?: unknown;
  popover?: unknown;
  shopSwitch?: unknown;
  watermark?: unknown;
  theme?: unknown;
};

export function themeSliceToPatch(next: ProfileThemeSlice): GiaoDienPatchBody {
  return {
    accent: next.accent,
    accentHex: next.accentHex,
    applyToHome: next.applyToHome,
    background: {
      kind: next.background.kind,
      patternId: next.background.patternId,
      imageId: next.background.imageId,
      dim: next.background.dim,
      position: next.background.position,
      devices: next.background.devices,
    },
  };
}

export function avatarFrameSliceToPatch(
  next: ProfileAvatarFrameSlice,
): GiaoDienPatchBody {
  return {
    avatarFrame: {
      enabled: next.enabled,
      presetId: next.presetId,
      hex: next.hex,
      hex2: next.hex2,
      overlayImageId: next.overlayImageId,
      overlayBlend: next.overlayBlend,
    },
  };
}

export function cardSliceToPatch(
  next: ProfileCardThemeSlice,
): GiaoDienPatchBody {
  return {
    card: {
      enabled: next.enabled,
      mode: next.mode,
      dim: next.dim,
      imageId: next.imageId,
      position: next.position,
      scale: next.scale,
      rotate: next.rotate,
      patternId: next.patternId,
      ...(next.mode === "custom"
        ? {
            accent: next.accent,
            accentHex: next.accent === "custom" ? next.accentHex : null,
          }
        : {}),
    },
  };
}

export function popoverSliceToPatch(
  next: ProfilePopoverThemeSlice,
): GiaoDienPatchBody {
  return {
    popover: {
      enabled: next.enabled,
      preset: next.preset,
      surface: {
        kind: next.surface.kind === "image" ? "image" : "gradient",
        dim: next.surface.dim,
        imageId: next.surface.kind === "image" ? next.surface.imageId : null,
      },
      cover: {
        kind:
          next.cover.kind === "pattern" || next.cover.kind === "solid"
            ? next.cover.kind
            : "profile",
        patternId: next.cover.patternId,
        dim: next.cover.dim,
      },
    },
  };
}

export function shopSwitchSliceToPatch(
  next: ProfileShopSwitchSlice,
): GiaoDienPatchBody {
  return {
    shopSwitch: {
      kind: next.kind,
      imageId: next.imageId,
      aspect: next.aspect,
      position: next.position,
      showName: next.showName,
    },
  };
}

export function watermarkSliceToPatch(
  next: ProfileWatermarkSlice,
): GiaoDienPatchBody {
  return {
    watermark: {
      enabled: next.enabled,
      source: next.source,
      presetId: next.presetId,
      imageId: next.imageId,
      corner: next.corner,
      sizePct: next.sizePct,
      opacity: next.opacity,
      marginPct: next.marginPct,
    },
  };
}

export async function patchGiaoDien(
  body: GiaoDienPatchBody,
): Promise<GiaoDienPatchResult> {
  const res = await fetch("/api/user/giao-dien", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as
    | GiaoDienPatchResult
    | null;
  if (!res.ok) {
    return { ok: false, error: data?.error ?? "Không lưu được." };
  }
  return { ok: true, ...data };
}

export async function resetGiaoDienTheme(): Promise<GiaoDienPatchResult> {
  const res = await fetch("/api/user/giao-dien", { method: "DELETE" });
  const data = (await res.json().catch(() => null)) as
    | GiaoDienPatchResult
    | null;
  if (!res.ok) {
    return { ok: false, error: data?.error ?? "Không khôi phục được." };
  }
  return { ok: true, ...data };
}
