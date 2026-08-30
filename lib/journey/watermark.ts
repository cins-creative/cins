/**
 * Customize watermark ảnh bài (album / bài dài).
 * SoT config: user_nguoi_dung.giao_dien.watermark
 * Per-post toggle: content_cot_moc.watermark_bat
 */

import type { CSSProperties } from "react";

import { getCfAccountHash } from "@/lib/cloudflare/account-hash";
import type { ProfileCustomEntry } from "@/lib/journey/profile-theme";
import { shopProtectWatermarkText } from "@/lib/shop/image-protect";

/* ── Corners ─────────────────────────────────────────────────────── */

export const WATERMARK_CORNER_IDS = [
  "tl",
  "tr",
  "bl",
  "br",
  "center",
] as const;

export type WatermarkCornerId = (typeof WATERMARK_CORNER_IDS)[number];

export type WatermarkCornerDef = {
  id: WatermarkCornerId;
  label: string;
};

export const WATERMARK_CORNERS: ReadonlyArray<WatermarkCornerDef> = [
  { id: "tl", label: "Trên trái" },
  { id: "tr", label: "Trên phải" },
  { id: "bl", label: "Dưới trái" },
  { id: "br", label: "Dưới phải" },
  { id: "center", label: "Giữa" },
];

export function isWatermarkCornerId(
  value: unknown,
): value is WatermarkCornerId {
  return (
    typeof value === "string" &&
    (WATERMARK_CORNER_IDS as readonly string[]).includes(value)
  );
}

/* ── Presets (static SVG under /public/watermarks) ───────────────── */

export const WATERMARK_PRESET_IDS = [
  "cins-mark",
  "cins-dot",
  "cins-signature",
] as const;

export type WatermarkPresetId = (typeof WATERMARK_PRESET_IDS)[number];

export type WatermarkPresetDef = {
  id: WatermarkPresetId;
  label: string;
  /** Public URL (SVG/PNG). */
  src: string;
};

export const WATERMARK_PRESETS: ReadonlyArray<WatermarkPresetDef> = [
  {
    id: "cins-mark",
    label: "CINs mark",
    src: "/watermarks/cins-mark.svg",
  },
  {
    id: "cins-dot",
    label: "CINs dot",
    src: "/watermarks/cins-dot.svg",
  },
  {
    id: "cins-signature",
    label: "Chữ ký",
    src: "/watermarks/cins-signature.svg",
  },
];

const PRESET_BY_ID: Record<WatermarkPresetId, WatermarkPresetDef> =
  Object.fromEntries(WATERMARK_PRESETS.map((p) => [p.id, p])) as Record<
    WatermarkPresetId,
    WatermarkPresetDef
  >;

export function isWatermarkPresetId(
  value: unknown,
): value is WatermarkPresetId {
  return (
    typeof value === "string" &&
    (WATERMARK_PRESET_IDS as readonly string[]).includes(value)
  );
}

export function getWatermarkPreset(id: WatermarkPresetId): WatermarkPresetDef {
  return PRESET_BY_ID[id] ?? PRESET_BY_ID["cins-mark"];
}

/* ── Size / opacity / margin ─────────────────────────────────────── */

export const WATERMARK_SIZE_MIN = 8;
export const WATERMARK_SIZE_MAX = 45;
export const WATERMARK_SIZE_DEFAULT = 18;

export const WATERMARK_OPACITY_MIN = 0.15;
export const WATERMARK_OPACITY_MAX = 1;
export const WATERMARK_OPACITY_DEFAULT = 0.55;

export const WATERMARK_MARGIN_MIN = 1;
export const WATERMARK_MARGIN_MAX = 12;
export const WATERMARK_MARGIN_DEFAULT = 3;

function clampSize(n: unknown, fallback = WATERMARK_SIZE_DEFAULT): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(WATERMARK_SIZE_MAX, Math.max(WATERMARK_SIZE_MIN, Math.round(v)));
}

function clampOpacity(
  n: unknown,
  fallback = WATERMARK_OPACITY_DEFAULT,
): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  const rounded = Math.round(v * 100) / 100;
  return Math.min(
    WATERMARK_OPACITY_MAX,
    Math.max(WATERMARK_OPACITY_MIN, rounded),
  );
}

function clampMargin(n: unknown, fallback = WATERMARK_MARGIN_DEFAULT): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(
    WATERMARK_MARGIN_MAX,
    Math.max(WATERMARK_MARGIN_MIN, Math.round(v)),
  );
}

/* ── State ───────────────────────────────────────────────────────── */

export type WatermarkSource = "preset" | "custom";

export type ProfileWatermarkSlice = {
  enabled: boolean;
  /** Sọc URL mặc định (overlay loại hàng). Tách với logo PNG. */
  protectOverlay: boolean;
  source: WatermarkSource;
  presetId: WatermarkPresetId;
  /** CF Images id ∈ customs — khi source = custom. */
  imageId: string | null;
  corner: WatermarkCornerId;
  /** % chiều ngang ô ảnh. */
  sizePct: number;
  opacity: number;
  /** % inset từ mép theo góc chọn. */
  marginPct: number;
};

export const DEFAULT_WATERMARK: ProfileWatermarkSlice = {
  enabled: false,
  protectOverlay: true,
  source: "preset",
  presetId: "cins-mark",
  imageId: null,
  corner: "br",
  sizePct: WATERMARK_SIZE_DEFAULT,
  opacity: WATERMARK_OPACITY_DEFAULT,
  marginPct: WATERMARK_MARGIN_DEFAULT,
};

export type WatermarkProtectContext = {
  ownerSlug?: string | null;
  tenHienThi?: string | null;
};

export type WatermarkRenderDto = {
  /** Sọc chữ + URL — mặc định khi bật (cùng lớp overlay shop loại hàng). */
  protectText: string;
  /** Logo PNG tùy chỉnh; null = chỉ sọc URL. */
  src: string | null;
  corner: WatermarkCornerId;
  sizePct: number;
  opacity: number;
  marginPct: number;
};

function customImageUrl(imageId: string): string | null {
  const id = imageId.trim();
  if (!id) return null;
  const hash = getCfAccountHash();
  if (!hash) return null;
  return `https://imagedelivery.net/${hash}/${id}/public`;
}

export function watermarksEqual(
  a: ProfileWatermarkSlice,
  b: ProfileWatermarkSlice,
): boolean {
  return (
    a.enabled === b.enabled &&
    a.protectOverlay === b.protectOverlay &&
    a.source === b.source &&
    a.presetId === b.presetId &&
    a.imageId === b.imageId &&
    a.corner === b.corner &&
    a.sizePct === b.sizePct &&
    a.opacity === b.opacity &&
    a.marginPct === b.marginPct
  );
}

export function parseWatermark(
  raw: unknown,
  customs?: ProfileCustomEntry[] | null,
): ProfileWatermarkSlice {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_WATERMARK };
  }
  const obj = raw as Record<string, unknown>;
  const enabled = obj.enabled === true || obj.enabled === "true";
  const protectOverlay = !(
    obj.protectOverlay === false || obj.protectOverlay === "false"
  );
  const source: WatermarkSource =
    obj.source === "custom" ? "custom" : "preset";
  const presetId = isWatermarkPresetId(obj.presetId)
    ? obj.presetId
    : DEFAULT_WATERMARK.presetId;
  let imageId: string | null =
    typeof obj.imageId === "string" && obj.imageId.trim()
      ? obj.imageId.trim()
      : null;
  if (imageId && customs && customs.length > 0) {
    const allowed = new Set(customs.map((c) => c.imageId));
    if (!allowed.has(imageId)) imageId = null;
  }
  const corner = isWatermarkCornerId(obj.corner)
    ? obj.corner
    : DEFAULT_WATERMARK.corner;

  return {
    enabled,
    protectOverlay,
    source: source === "custom" && !imageId ? "preset" : source,
    presetId,
    imageId,
    corner,
    sizePct: clampSize(obj.sizePct),
    opacity: clampOpacity(obj.opacity),
    marginPct: clampMargin(obj.marginPct),
  };
}

export function serializeWatermark(
  wm: ProfileWatermarkSlice,
): Record<string, unknown> | undefined {
  if (!wm.enabled && watermarksEqual(wm, DEFAULT_WATERMARK)) {
    return undefined;
  }
  return {
    v: 1,
    enabled: wm.enabled === true,
    protectOverlay: wm.protectOverlay !== false,
    source: wm.source,
    presetId: wm.presetId,
    imageId: wm.source === "custom" ? wm.imageId : null,
    corner: wm.corner,
    sizePct: clampSize(wm.sizePct),
    opacity: clampOpacity(wm.opacity),
    marginPct: clampMargin(wm.marginPct),
  };
}

export type WatermarkPatchInput = {
  enabled?: boolean;
  protectOverlay?: boolean;
  source?: WatermarkSource;
  presetId?: WatermarkPresetId;
  imageId?: string | null;
  corner?: WatermarkCornerId;
  sizePct?: number;
  opacity?: number;
  marginPct?: number;
};

export type ValidateWatermarkPatchResult =
  | { ok: true; patch: WatermarkPatchInput }
  | { ok: false; error: string };

export function validateWatermarkPatchBody(
  raw: unknown,
): ValidateWatermarkPatchResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "watermark phải là object." };
  }
  const obj = raw as Record<string, unknown>;
  const patch: WatermarkPatchInput = {};

  if ("enabled" in obj) {
    if (typeof obj.enabled !== "boolean") {
      return { ok: false, error: "watermark.enabled phải là boolean." };
    }
    patch.enabled = obj.enabled;
  }
  if ("protectOverlay" in obj) {
    if (typeof obj.protectOverlay !== "boolean") {
      return { ok: false, error: "watermark.protectOverlay phải là boolean." };
    }
    patch.protectOverlay = obj.protectOverlay;
  }
  if ("source" in obj) {
    if (obj.source !== "preset" && obj.source !== "custom") {
      return { ok: false, error: "watermark.source không hợp lệ." };
    }
    patch.source = obj.source;
  }
  if ("presetId" in obj) {
    if (!isWatermarkPresetId(obj.presetId)) {
      return { ok: false, error: "watermark.presetId không hợp lệ." };
    }
    patch.presetId = obj.presetId;
  }
  if ("imageId" in obj) {
    if (obj.imageId != null && typeof obj.imageId !== "string") {
      return { ok: false, error: "watermark.imageId không hợp lệ." };
    }
    patch.imageId =
      typeof obj.imageId === "string" && obj.imageId.trim()
        ? obj.imageId.trim()
        : null;
  }
  if ("corner" in obj) {
    if (!isWatermarkCornerId(obj.corner)) {
      return { ok: false, error: "watermark.corner không hợp lệ." };
    }
    patch.corner = obj.corner;
  }
  if ("sizePct" in obj) {
    if (typeof obj.sizePct !== "number" || !Number.isFinite(obj.sizePct)) {
      return { ok: false, error: "watermark.sizePct không hợp lệ." };
    }
    patch.sizePct = clampSize(obj.sizePct);
  }
  if ("opacity" in obj) {
    if (typeof obj.opacity !== "number" || !Number.isFinite(obj.opacity)) {
      return { ok: false, error: "watermark.opacity không hợp lệ." };
    }
    patch.opacity = clampOpacity(obj.opacity);
  }
  if ("marginPct" in obj) {
    if (typeof obj.marginPct !== "number" || !Number.isFinite(obj.marginPct)) {
      return { ok: false, error: "watermark.marginPct không hợp lệ." };
    }
    patch.marginPct = clampMargin(obj.marginPct);
  }

  return { ok: true, patch };
}

export function applyWatermarkPatch(
  prev: ProfileWatermarkSlice,
  patch: WatermarkPatchInput,
  customs?: ProfileCustomEntry[] | null,
): ProfileWatermarkSlice {
  let source = patch.source ?? prev.source;
  let presetId = patch.presetId ?? prev.presetId;
  if (!isWatermarkPresetId(presetId)) presetId = DEFAULT_WATERMARK.presetId;

  let imageId =
    patch.imageId !== undefined ? patch.imageId : prev.imageId;
  if (imageId && customs && customs.length > 0) {
    const allowed = new Set(customs.map((c) => c.imageId));
    if (!allowed.has(imageId)) imageId = null;
  }
  if (source === "custom" && !imageId) {
    source = "preset";
  }

  const corner = patch.corner ?? prev.corner;

  return {
    enabled: patch.enabled !== undefined ? patch.enabled : prev.enabled,
    protectOverlay:
      patch.protectOverlay !== undefined
        ? patch.protectOverlay
        : prev.protectOverlay !== false,
    source,
    presetId,
    imageId: source === "custom" ? imageId : null,
    corner: isWatermarkCornerId(corner) ? corner : DEFAULT_WATERMARK.corner,
    sizePct:
      patch.sizePct !== undefined
        ? clampSize(patch.sizePct)
        : clampSize(prev.sizePct),
    opacity:
      patch.opacity !== undefined
        ? clampOpacity(patch.opacity)
        : clampOpacity(prev.opacity),
    marginPct:
      patch.marginPct !== undefined
        ? clampMargin(patch.marginPct)
        : clampMargin(prev.marginPct),
  };
}

export function resolveWatermarkDto(
  wm: ProfileWatermarkSlice,
  ctx?: WatermarkProtectContext,
): WatermarkRenderDto | null {
  if (!wm.enabled) return null;

  let src: string | null = null;
  if (wm.source === "custom" && wm.imageId) {
    src = customImageUrl(wm.imageId);
  }

  return {
    protectText: wm.protectOverlay
      ? shopProtectWatermarkText({
          shopTen: ctx?.tenHienThi,
          ownerSlug: ctx?.ownerSlug,
        })
      : "",
    src,
    corner: wm.corner,
    sizePct: clampSize(wm.sizePct),
    opacity: clampOpacity(wm.opacity),
    marginPct: clampMargin(wm.marginPct),
  };
}

/** Parse raw giao_dien → DTO (null nếu tắt). */
export function watermarkFromGiaoDien(
  giaoDienRaw: unknown,
  ctx?: WatermarkProtectContext,
): WatermarkRenderDto | null {
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
  const customsRaw = Array.isArray(obj.customs)
    ? (obj.customs as ProfileCustomEntry[])
    : null;
  return resolveWatermarkDto(parseWatermark(obj.watermark, customsRaw), ctx);
}

export function watermarkCssVars(
  dto: WatermarkRenderDto,
): CSSProperties & Record<string, string | number> {
  return {
    ["--j-wm-size" as string]: `${dto.sizePct}%`,
    ["--j-wm-opacity" as string]: String(dto.opacity),
    ["--j-wm-margin" as string]: `${dto.marginPct}%`,
  };
}

export function watermarkCornerClass(corner: WatermarkCornerId): string {
  return `j-wm-overlay--${corner}`;
}

/** Owner đã bật watermark (sọc URL mặc định; logo tùy chỉnh không bắt buộc). */
export function ownerHasWatermarkConfig(
  wm: ProfileWatermarkSlice | null | undefined,
): boolean {
  return wm?.enabled === true;
}

/**
 * Gắn watermark DTO lên milestone self/verified (cùng grain với avatarFrame).
 */
export function attachAuthorWatermarkToSelfMilestones<
  T extends {
    variant: string;
    authorWatermark?: WatermarkRenderDto | null;
  },
>(milestones: T[], dto: WatermarkRenderDto | null): T[] {
  return milestones.map((m) => {
    if (m.variant === "bookmark" || m.variant === "tagged") return m;
    if (m.variant !== "self" && m.variant !== "verified") return m;
    if (!dto) {
      if (m.authorWatermark == null) return m;
      const { authorWatermark: _drop, ...rest } = m;
      return rest as T;
    }
    return { ...m, authorWatermark: dto };
  });
}
