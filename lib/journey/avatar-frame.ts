/**
 * Customize khung avatar — SoT: user_nguoi_dung.giao_dien.avatarFrame
 * Plan: docs/PLAN_customize_avatar.md
 *
 * B1.1 (feedback): chỉ (1) preset màu viền / gradient + đổi màu trên preset
 * · (2) overlay ảnh/GIF absolute expand ~15px. Không shape / glow / gap / tile.
 */

import type { CSSProperties } from "react";

import { getCfAccountHash } from "@/lib/cloudflare/account-hash";
import type { ProfileCustomEntry } from "@/lib/journey/profile-theme";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function normalizeFrameHex(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const hex = raw.trim();
  if (!HEX_RE.test(hex)) return null;
  return hex.toUpperCase();
}

/* ── Color presets ───────────────────────────────────────────────── */

export const AVATAR_COLOR_PRESET_IDS = [
  "none",
  "solid-cins",
  "solid-mint",
  "solid-coral",
  "solid-violet",
  "solid-ink",
  "grad-sunset",
  "grad-ocean",
  "grad-aurora",
  "grad-candy",
] as const;

export type AvatarColorPresetId = (typeof AVATAR_COLOR_PRESET_IDS)[number];

export type AvatarColorPresetDef = {
  id: AvatarColorPresetId;
  label: string;
  style: "none" | "solid" | "gradient";
  /** Placeholder khi style = none (không vẽ ring). */
  hex: string;
  hex2: string | null;
};

export const AVATAR_COLOR_PRESETS: ReadonlyArray<AvatarColorPresetDef> = [
  {
    id: "none",
    label: "Không màu",
    style: "none",
    hex: "#1F74C9",
    hex2: null,
  },
  {
    id: "solid-cins",
    label: "CINs",
    style: "solid",
    hex: "#1F74C9",
    hex2: null,
  },
  {
    id: "solid-mint",
    label: "Bạc hà",
    style: "solid",
    hex: "#1A7F57",
    hex2: null,
  },
  {
    id: "solid-coral",
    label: "San hô",
    style: "solid",
    hex: "#E4633F",
    hex2: null,
  },
  {
    id: "solid-violet",
    label: "Tím",
    style: "solid",
    hex: "#7A45C4",
    hex2: null,
  },
  {
    id: "solid-ink",
    label: "Mực",
    style: "solid",
    hex: "#1B1F2A",
    hex2: null,
  },
  {
    id: "grad-sunset",
    label: "Hoàng hôn",
    style: "gradient",
    hex: "#E4633F",
    hex2: "#C99A00",
  },
  {
    id: "grad-ocean",
    label: "Đại dương",
    style: "gradient",
    hex: "#1F74C9",
    hex2: "#0E9F9F",
  },
  {
    id: "grad-aurora",
    label: "Cực quang",
    style: "gradient",
    hex: "#1A7F57",
    hex2: "#7A45C4",
  },
  {
    id: "grad-candy",
    label: "Kẹo",
    style: "gradient",
    hex: "#D94A72",
    hex2: "#BB89F8",
  },
];

const PRESET_BY_ID: Record<AvatarColorPresetId, AvatarColorPresetDef> =
  Object.fromEntries(AVATAR_COLOR_PRESETS.map((p) => [p.id, p])) as Record<
    AvatarColorPresetId,
    AvatarColorPresetDef
  >;

export function isAvatarColorPresetId(
  value: unknown,
): value is AvatarColorPresetId {
  return (
    typeof value === "string" &&
    (AVATAR_COLOR_PRESET_IDS as readonly string[]).includes(value)
  );
}

export function getAvatarColorPreset(
  id: AvatarColorPresetId,
): AvatarColorPresetDef {
  return PRESET_BY_ID[id] ?? PRESET_BY_ID["solid-cins"];
}

/* ── Overlay blend ───────────────────────────────────────────────── */

export const AVATAR_OVERLAY_BLEND_IDS = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "soft-light",
] as const;

export type AvatarOverlayBlendId = (typeof AVATAR_OVERLAY_BLEND_IDS)[number];

export type AvatarOverlayBlendDef = {
  id: AvatarOverlayBlendId;
  label: string;
};

export const AVATAR_OVERLAY_BLENDS: ReadonlyArray<AvatarOverlayBlendDef> = [
  { id: "normal", label: "Normal" },
  { id: "multiply", label: "Multiply" },
  { id: "screen", label: "Screen" },
  { id: "overlay", label: "Overlay" },
  { id: "soft-light", label: "Soft light" },
];

export function isAvatarOverlayBlendId(
  value: unknown,
): value is AvatarOverlayBlendId {
  return (
    typeof value === "string" &&
    (AVATAR_OVERLAY_BLEND_IDS as readonly string[]).includes(value)
  );
}

/* ── State ───────────────────────────────────────────────────────── */

export type ProfileAvatarFrameSlice = {
  enabled: boolean;
  presetId: AvatarColorPresetId;
  /** Override stop 1 — null = dùng màu preset. */
  hex: string | null;
  /** Override stop 2 (gradient) — null = dùng preset. */
  hex2: string | null;
  /** CF Images id ∈ customs — overlay design (PNG/GIF). */
  overlayImageId: string | null;
  /** mix-blend-mode của lớp overlay — mặc định normal. */
  overlayBlend: AvatarOverlayBlendId;
};

export type AvatarFrameDto = {
  ringStyle: "none" | "solid" | "gradient";
  ringHex: string;
  ringHex2: string | null;
  overlayImageUrl: string | null;
  overlayBlend: AvatarOverlayBlendId;
};

export const DEFAULT_AVATAR_FRAME: ProfileAvatarFrameSlice = {
  enabled: false,
  presetId: "solid-cins",
  hex: null,
  hex2: null,
  overlayImageId: null,
  overlayBlend: "normal",
};

/** Expand overlay layer (px) ngoài mép avatar. */
export const AVATAR_OVERLAY_EXPAND_PX = 15;

function overlayImageUrl(imageId: string): string | null {
  const id = imageId.trim();
  if (!id) return null;
  const hash = getCfAccountHash();
  if (!hash) return null;
  /* public — giữ GIF động; không dùng variant crop. */
  return `https://imagedelivery.net/${hash}/${id}/public`;
}

/** Tolerant parse — v1 (shape/ring/glow) → map sang v2 preset+overlay. */
export function parseAvatarFrame(
  raw: unknown,
  customs?: ProfileCustomEntry[] | null,
): ProfileAvatarFrameSlice {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_AVATAR_FRAME };
  }
  const obj = raw as Record<string, unknown>;
  const enabled = obj.enabled === true || obj.enabled === "true";

  let presetId: AvatarColorPresetId = DEFAULT_AVATAR_FRAME.presetId;
  if (isAvatarColorPresetId(obj.presetId)) {
    presetId = obj.presetId;
  } else {
    /* Legacy v1: ring.style + accentHex / mode */
    const ring =
      obj.ring && typeof obj.ring === "object"
        ? (obj.ring as Record<string, unknown>)
        : null;
    if (ring) {
      const style = ring.style === "gradient" ? "gradient" : "solid";
      const hex =
        normalizeFrameHex(ring.accentHex) ??
        normalizeFrameHex(ring.hex) ??
        null;
      if (style === "gradient") {
        presetId = "grad-sunset";
      } else if (hex) {
        const match = AVATAR_COLOR_PRESETS.find(
          (p) => p.style === "solid" && p.hex === hex,
        );
        presetId = match?.id ?? "solid-cins";
      }
    }
  }

  const preset = getAvatarColorPreset(presetId);
  let hex = normalizeFrameHex(obj.hex);
  let hex2 = normalizeFrameHex(obj.hex2);

  /* Legacy overrides từ ring */
  if (!hex && obj.ring && typeof obj.ring === "object") {
    const ring = obj.ring as Record<string, unknown>;
    hex = normalizeFrameHex(ring.accentHex) ?? normalizeFrameHex(ring.hex);
    hex2 = normalizeFrameHex(ring.hex2);
  }

  /* Nếu trùng preset → coi như null (không lưu thừa). */
  if (hex && hex === preset.hex) hex = null;
  if (hex2 && hex2 === preset.hex2) hex2 = null;
  if (preset.style === "solid" || preset.style === "none") hex2 = null;
  if (preset.style === "none") {
    hex = null;
    hex2 = null;
  }

  let overlayImageId: string | null = null;
  if (typeof obj.overlayImageId === "string" && obj.overlayImageId.trim()) {
    const id = obj.overlayImageId.trim();
    if (customs && customs.length > 0) {
      const allowed = new Set(customs.map((c) => c.imageId));
      overlayImageId = allowed.has(id) ? id : null;
    } else {
      overlayImageId = id;
    }
  }

  return {
    enabled,
    presetId,
    hex,
    hex2,
    overlayImageId,
    overlayBlend: isAvatarOverlayBlendId(obj.overlayBlend)
      ? obj.overlayBlend
      : DEFAULT_AVATAR_FRAME.overlayBlend,
  };
}

export function serializeAvatarFrame(
  frame: ProfileAvatarFrameSlice,
): Record<string, unknown> | undefined {
  if (!frame.enabled && framesEqual(frame, DEFAULT_AVATAR_FRAME)) {
    return undefined;
  }
  return {
    v: 2,
    enabled: frame.enabled === true,
    presetId: frame.presetId,
    hex: frame.hex,
    hex2: frame.hex2,
    overlayImageId: frame.overlayImageId,
    overlayBlend:
      frame.overlayBlend === "normal" ? undefined : frame.overlayBlend,
  };
}

export type AvatarFramePatchInput = {
  enabled?: boolean;
  presetId?: AvatarColorPresetId;
  hex?: string | null;
  hex2?: string | null;
  overlayImageId?: string | null;
  overlayBlend?: AvatarOverlayBlendId;
};

export type ValidateAvatarFramePatchResult =
  | { ok: true; patch: AvatarFramePatchInput }
  | { ok: false; error: string };

export function validateAvatarFramePatchBody(
  raw: unknown,
): ValidateAvatarFramePatchResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "avatarFrame phải là object." };
  }
  const obj = raw as Record<string, unknown>;
  const patch: AvatarFramePatchInput = {};

  if ("enabled" in obj) {
    if (typeof obj.enabled !== "boolean") {
      return { ok: false, error: "avatarFrame.enabled phải là boolean." };
    }
    patch.enabled = obj.enabled;
  }

  if ("presetId" in obj) {
    if (!isAvatarColorPresetId(obj.presetId)) {
      return { ok: false, error: "avatarFrame.presetId không hợp lệ." };
    }
    patch.presetId = obj.presetId;
  }

  if ("hex" in obj) {
    if (obj.hex == null) {
      patch.hex = null;
    } else {
      const hex = normalizeFrameHex(obj.hex);
      if (!hex) {
        return { ok: false, error: "avatarFrame.hex phải là #RRGGBB." };
      }
      patch.hex = hex;
    }
  }

  if ("hex2" in obj) {
    if (obj.hex2 == null) {
      patch.hex2 = null;
    } else {
      const hex = normalizeFrameHex(obj.hex2);
      if (!hex) {
        return { ok: false, error: "avatarFrame.hex2 phải là #RRGGBB." };
      }
      patch.hex2 = hex;
    }
  }

  if ("overlayImageId" in obj) {
    if (obj.overlayImageId != null && typeof obj.overlayImageId !== "string") {
      return { ok: false, error: "avatarFrame.overlayImageId không hợp lệ." };
    }
    patch.overlayImageId =
      typeof obj.overlayImageId === "string" && obj.overlayImageId.trim()
        ? obj.overlayImageId.trim()
        : null;
  }

  if ("overlayBlend" in obj) {
    if (!isAvatarOverlayBlendId(obj.overlayBlend)) {
      return { ok: false, error: "avatarFrame.overlayBlend không hợp lệ." };
    }
    patch.overlayBlend = obj.overlayBlend;
  }

  return { ok: true, patch };
}

export function applyAvatarFramePatch(
  prev: ProfileAvatarFrameSlice,
  patch: AvatarFramePatchInput,
  customs?: ProfileCustomEntry[] | null,
): ProfileAvatarFrameSlice {
  let presetId = patch.presetId ?? prev.presetId;
  if (!isAvatarColorPresetId(presetId)) presetId = DEFAULT_AVATAR_FRAME.presetId;
  const preset = getAvatarColorPreset(presetId);

  let hex = patch.hex !== undefined ? patch.hex : prev.hex;
  let hex2 = patch.hex2 !== undefined ? patch.hex2 : prev.hex2;
  hex = normalizeFrameHex(hex);
  hex2 = normalizeFrameHex(hex2);

  /* Đổi preset → xóa override trùng màu preset mới (giữ override khác). */
  if (patch.presetId !== undefined) {
    if (hex && hex === preset.hex) hex = null;
    if (hex2 && hex2 === preset.hex2) hex2 = null;
  }

  if (preset.style === "solid" || preset.style === "none") hex2 = null;
  if (preset.style === "none") {
    hex = null;
    hex2 = null;
  }

  let overlayImageId =
    patch.overlayImageId !== undefined
      ? patch.overlayImageId
      : prev.overlayImageId;
  if (overlayImageId && customs && customs.length > 0) {
    const allowed = new Set(customs.map((c) => c.imageId));
    if (!allowed.has(overlayImageId)) overlayImageId = null;
  }

  return {
    enabled: patch.enabled !== undefined ? patch.enabled : prev.enabled,
    presetId,
    hex,
    hex2,
    overlayImageId,
    overlayBlend:
      patch.overlayBlend !== undefined
        ? patch.overlayBlend
        : prev.overlayBlend,
  };
}

export function resolveAvatarFrameDto(
  frame: ProfileAvatarFrameSlice,
): AvatarFrameDto | null {
  if (!frame.enabled) return null;

  const overlayUrl = frame.overlayImageId
    ? overlayImageUrl(frame.overlayImageId)
    : null;
  const overlayBlend = isAvatarOverlayBlendId(frame.overlayBlend)
    ? frame.overlayBlend
    : DEFAULT_AVATAR_FRAME.overlayBlend;

  const preset = getAvatarColorPreset(frame.presetId);
  if (preset.style === "none") {
    return {
      ringStyle: "none",
      ringHex: "",
      ringHex2: null,
      overlayImageUrl: overlayUrl,
      overlayBlend,
    };
  }

  const ringHex = normalizeFrameHex(frame.hex) ?? preset.hex;
  const ringHex2 =
    preset.style === "gradient"
      ? (normalizeFrameHex(frame.hex2) ?? preset.hex2)
      : null;

  return {
    ringStyle: preset.style,
    ringHex,
    ringHex2,
    overlayImageUrl: overlayUrl,
    overlayBlend,
  };
}

/** Parse raw giao_dien → DTO (null nếu tắt). */
export function avatarFrameFromGiaoDien(
  giaoDienRaw: unknown,
): AvatarFrameDto | null {
  if (giaoDienRaw == null) return null;
  let obj: Record<string, unknown>;
  if (typeof giaoDienRaw === "string") {
    try {
      const parsed = JSON.parse(giaoDienRaw) as unknown;
      if (!parsed || typeof parsed !== "object") return null;
      obj = parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  } else if (typeof giaoDienRaw === "object") {
    obj = giaoDienRaw as Record<string, unknown>;
  } else {
    return null;
  }

  const customsRaw = Array.isArray(obj.customs) ? obj.customs : [];
  const customs: ProfileCustomEntry[] = [];
  for (const row of customsRaw) {
    if (!row || typeof row !== "object") continue;
    const id = (row as { imageId?: unknown }).imageId;
    if (typeof id === "string" && id.trim()) {
      customs.push({
        imageId: id.trim(),
        createdAt:
          typeof (row as { createdAt?: unknown }).createdAt === "string"
            ? (row as { createdAt: string }).createdAt
            : new Date(0).toISOString(),
      });
    }
  }

  return resolveAvatarFrameDto(parseAvatarFrame(obj.avatarFrame, customs));
}

export type AvatarFrameCssVars = CSSProperties & {
  ["--j-av-ring"]?: string;
  ["--j-av-ring-2"]?: string;
  ["--j-av-overlay"]?: string;
  ["--j-av-expand"]?: string;
  ["--j-av-blend"]?: string;
  ["--j-av-bw"]?: string;
};

export type AvatarFrameStyleOptions = {
  /** Cỡ avatar (px) — scale expand/viền từ chuẩn 96px. */
  sizePx?: number;
};

export function avatarFrameStyle(
  dto: AvatarFrameDto | null | undefined,
  opts?: AvatarFrameStyleOptions,
): AvatarFrameCssVars | undefined {
  if (!dto) return undefined;
  const size = opts?.sizePx ?? 96;
  const scale = size > 0 ? size / 96 : 1;
  const expand = Math.max(4, Math.round(AVATAR_OVERLAY_EXPAND_PX * scale));
  const bw = Math.max(1.5, Math.round(4 * scale * 10) / 10);
  const vars: AvatarFrameCssVars = {
    ["--j-av-expand"]: `${expand}px`,
    ["--j-av-bw"]: `${bw}px`,
  };
  if (dto.ringStyle !== "none" && dto.ringHex) {
    vars["--j-av-ring"] = dto.ringHex;
  }
  if (dto.ringStyle === "gradient" && dto.ringHex2) {
    vars["--j-av-ring-2"] = dto.ringHex2;
  }
  if (dto.overlayImageUrl) {
    vars["--j-av-overlay"] = `url("${dto.overlayImageUrl}")`;
    vars["--j-av-blend"] = dto.overlayBlend;
  }
  return vars;
}

export function avatarFrameClass(
  dto: AvatarFrameDto | null | undefined,
): string {
  if (!dto) return "";
  const parts = ["j-avf"];
  if (dto.ringStyle === "gradient") parts.push("j-avf-ring-gradient");
  else if (dto.ringStyle === "solid") parts.push("j-avf-ring-solid");
  if (dto.overlayImageUrl) parts.push("j-avf-has-overlay");
  return parts.join(" ");
}

export function framesEqual(
  a: ProfileAvatarFrameSlice,
  b: ProfileAvatarFrameSlice,
): boolean {
  return (
    a.enabled === b.enabled &&
    a.presetId === b.presetId &&
    a.hex === b.hex &&
    a.hex2 === b.hex2 &&
    a.overlayImageId === b.overlayImageId &&
    a.overlayBlend === b.overlayBlend
  );
}

/** Effective colors for picker (preset + overrides). */
export function resolveFrameColors(frame: ProfileAvatarFrameSlice): {
  style: "none" | "solid" | "gradient";
  hex: string;
  hex2: string | null;
} {
  const preset = getAvatarColorPreset(frame.presetId);
  if (preset.style === "none") {
    return { style: "none", hex: preset.hex, hex2: null };
  }
  return {
    style: preset.style,
    hex: normalizeFrameHex(frame.hex) ?? preset.hex,
    hex2:
      preset.style === "gradient"
        ? (normalizeFrameHex(frame.hex2) ?? preset.hex2)
        : null,
  };
}

export const AVATAR_FRAME_PREVIEW_EVENT = "cins-avatar-frame-preview";

export type AvatarFramePreviewDetail = {
  frame: ProfileAvatarFrameSlice;
};

export function dispatchAvatarFramePreview(
  frame: ProfileAvatarFrameSlice,
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<AvatarFramePreviewDetail>(AVATAR_FRAME_PREVIEW_EVENT, {
      detail: { frame },
    }),
  );
}

/**
 * Khung avatar trên chip tác giả — self/verified (kể cả visibility cộng đồng).
 * Không gắn bookmark / tagged (chip là người khác hoặc org).
 */
export function milestoneTakesAuthorAvatarFrame(m: {
  variant: string;
}): boolean {
  if (m.variant === "bookmark" || m.variant === "tagged") return false;
  return m.variant === "self" || m.variant === "verified";
}

export function attachAuthorAvatarFrameToSelfMilestones<
  T extends {
    variant: string;
    visibility?: string | null;
    authorAvatarFrame?: AvatarFrameDto | null;
  },
>(milestones: T[], dto: AvatarFrameDto | null): T[] {
  return milestones.map((m) => {
    if (!milestoneTakesAuthorAvatarFrame(m)) return m;
    if (!dto) {
      if (m.authorAvatarFrame == null) return m;
      const { authorAvatarFrame: _drop, ...rest } = m;
      return rest as T;
    }
    return { ...m, authorAvatarFrame: dto };
  });
}
