/**
 * Customize khối Shop trên sidebar Journey (`ShopSwitchCard`).
 * SoT: user_nguoi_dung.giao_dien.shopSwitch
 *
 * Khác grain với shop_cua_hang.giao_dien (theme storefront — Phase C).
 */

import type { CSSProperties } from "react";

import { getCfAccountHash } from "@/lib/cloudflare/account-hash";
import type {
  ProfileBgPosition,
  ProfileCustomEntry,
} from "@/lib/journey/profile-theme";

function clampCoord(raw: unknown, fallback = 0.5): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return fallback;
  return Math.min(1, Math.max(0, raw));
}

function parsePosition(
  raw: unknown,
  fallback: ProfileBgPosition = { x: 0.5, y: 0.5 },
): ProfileBgPosition {
  if (!raw || typeof raw !== "object") {
    return { x: fallback.x, y: fallback.y };
  }
  const obj = raw as Record<string, unknown>;
  return {
    x: clampCoord(obj.x, fallback.x),
    y: clampCoord(obj.y, fallback.y),
  };
}

function positionCss(pos: ProfileBgPosition): string {
  const x = Math.round(clampCoord(pos.x) * 1000) / 10;
  const y = Math.round(clampCoord(pos.y) * 1000) / 10;
  return `${x}% ${y}%`;
}

function shopSwitchImageUrl(imageId: string): string | null {
  const id = imageId.trim();
  if (!id) return null;
  const hash = getCfAccountHash();
  if (!hash) return null;
  return `https://imagedelivery.net/${hash}/${id}/public`;
}

export const SHOP_SWITCH_KINDS = ["classic", "poster"] as const;
export type ShopSwitchKind = (typeof SHOP_SWITCH_KINDS)[number];

/** Tỉ lệ rộng/cao — 4:3 là khối cao nhất được phép. */
export const SHOP_SWITCH_ASPECT_MIN = 4 / 3;
/** Banner thấp (3:1). */
export const SHOP_SWITCH_ASPECT_MAX = 3;
export const SHOP_SWITCH_ASPECT_DEFAULT = 16 / 9;

/** Ước lượng bề ngang card trên sidebar — gợi ý px cho user. */
export const SHOP_SWITCH_SIDEBAR_PX = 240;
export const SHOP_SWITCH_DEMO_WIDTH = 1200;

export const SHOP_SWITCH_ASPECT_PRESETS = [
  { id: "4-3", label: "4:3", w: 4, h: 3 },
  { id: "3-2", label: "3:2", w: 3, h: 2 },
  { id: "16-9", label: "16:9", w: 16, h: 9 },
  { id: "2-1", label: "2:1", w: 2, h: 1 },
  { id: "3-1", label: "3:1", w: 3, h: 1 },
] as const;

export type ShopSwitchAspectPresetId =
  (typeof SHOP_SWITCH_ASPECT_PRESETS)[number]["id"];

export type ProfileShopSwitchSlice = {
  kind: ShopSwitchKind;
  /** CF Images id ∈ customs — chỉ dùng khi kind = poster. */
  imageId: string | null;
  /** width / height, kẹp [4/3, 3]. */
  aspect: number;
  position: ProfileBgPosition;
  /** Hiện hàng tên shop + overlay. Tắt thì chỉ còn ảnh khối. */
  showName: boolean;
};

export type ShopSwitchDto = {
  kind: ShopSwitchKind;
  imageUrl: string | null;
  aspect: number;
  positionCss: string;
  showName: boolean;
};

export type ShopSwitchPatchInput = {
  kind?: ShopSwitchKind;
  imageId?: string | null;
  aspect?: number;
  position?: ProfileBgPosition;
  showName?: boolean;
};

export const DEFAULT_SHOP_SWITCH: ProfileShopSwitchSlice = {
  kind: "classic",
  imageId: null,
  aspect: SHOP_SWITCH_ASPECT_DEFAULT,
  position: { x: 0.5, y: 0.5 },
  showName: true,
};

export function isShopSwitchKind(value: unknown): value is ShopSwitchKind {
  return value === "classic" || value === "poster";
}

export function clampShopSwitchAspect(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return SHOP_SWITCH_ASPECT_DEFAULT;
  }
  return Math.min(
    SHOP_SWITCH_ASPECT_MAX,
    Math.max(SHOP_SWITCH_ASPECT_MIN, raw),
  );
}

export function shopSwitchAspectFromWh(w: number, h: number): number {
  if (h <= 0) return SHOP_SWITCH_ASPECT_DEFAULT;
  return clampShopSwitchAspect(w / h);
}

export function nearestShopSwitchAspectPreset(aspect: number): {
  id: ShopSwitchAspectPresetId;
  label: string;
} {
  const a = clampShopSwitchAspect(aspect);
  let best: (typeof SHOP_SWITCH_ASPECT_PRESETS)[number] =
    SHOP_SWITCH_ASPECT_PRESETS[2];
  let bestDelta = Infinity;
  for (const p of SHOP_SWITCH_ASPECT_PRESETS) {
    const delta = Math.abs(p.w / p.h - a);
    if (delta < bestDelta) {
      best = p;
      bestDelta = delta;
    }
  }
  return { id: best.id, label: best.label };
}

export function shopSwitchDemoSize(aspect: number): {
  w: number;
  h: number;
  label: string;
  sidebarH: number;
} {
  const a = clampShopSwitchAspect(aspect);
  const w = SHOP_SWITCH_DEMO_WIDTH;
  const h = Math.max(1, Math.round(w / a));
  const sidebarH = Math.max(1, Math.round(SHOP_SWITCH_SIDEBAR_PX / a));
  return {
    w,
    h,
    label: `${w}×${h} px`,
    sidebarH,
  };
}

export function shopSwitchesEqual(
  a: ProfileShopSwitchSlice,
  b: ProfileShopSwitchSlice,
): boolean {
  return (
    a.kind === b.kind &&
    a.imageId === b.imageId &&
    Math.abs(a.aspect - b.aspect) < 0.0005 &&
    Math.abs(a.position.x - b.position.x) < 0.0005 &&
    Math.abs(a.position.y - b.position.y) < 0.0005 &&
    a.showName === b.showName
  );
}

export function parseShopSwitch(
  raw: unknown,
  customs?: ProfileCustomEntry[] | null,
): ProfileShopSwitchSlice {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_SHOP_SWITCH, position: { ...DEFAULT_SHOP_SWITCH.position } };
  }
  const obj = raw as Record<string, unknown>;
  let imageId: string | null = null;
  if (typeof obj.imageId === "string" && obj.imageId.trim()) {
    const id = obj.imageId.trim();
    if (customs && customs.length > 0) {
      imageId = customs.some((c) => c.imageId === id) ? id : null;
    } else {
      imageId = id;
    }
  }
  const kind: ShopSwitchKind = imageId ? "poster" : "classic";
  const showName =
    typeof obj.showName === "boolean"
      ? obj.showName
      : kind !== "poster";
  return {
    kind,
    imageId,
    aspect: clampShopSwitchAspect(obj.aspect),
    position: parsePosition(obj.position, DEFAULT_SHOP_SWITCH.position),
    showName,
  };
}

export function serializeShopSwitch(
  state: ProfileShopSwitchSlice,
): Record<string, unknown> {
  return {
    kind: state.kind,
    imageId: state.imageId,
    aspect: Math.round(clampShopSwitchAspect(state.aspect) * 1000) / 1000,
    position: {
      x: state.position.x,
      y: state.position.y,
    },
    showName: state.showName,
  };
}

export function validateShopSwitchPatchBody(
  raw: unknown,
): { ok: true; patch: ShopSwitchPatchInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "shopSwitch phải là object." };
  }
  const obj = raw as Record<string, unknown>;
  const patch: ShopSwitchPatchInput = {};

  if ("kind" in obj) {
    if (!isShopSwitchKind(obj.kind)) {
      return { ok: false, error: "shopSwitch.kind không hợp lệ." };
    }
    patch.kind = obj.kind;
  }
  if ("imageId" in obj) {
    if (obj.imageId != null && typeof obj.imageId !== "string") {
      return { ok: false, error: "shopSwitch.imageId không hợp lệ." };
    }
    patch.imageId =
      typeof obj.imageId === "string" && obj.imageId.trim()
        ? obj.imageId.trim()
        : null;
  }
  if ("aspect" in obj) {
    if (typeof obj.aspect !== "number" || !Number.isFinite(obj.aspect)) {
      return { ok: false, error: "shopSwitch.aspect không hợp lệ." };
    }
    patch.aspect = clampShopSwitchAspect(obj.aspect);
  }
  if ("position" in obj) {
    if (!obj.position || typeof obj.position !== "object") {
      return { ok: false, error: "shopSwitch.position không hợp lệ." };
    }
    const pos = obj.position as Record<string, unknown>;
    if (typeof pos.x !== "number" || typeof pos.y !== "number") {
      return { ok: false, error: "shopSwitch.position không hợp lệ." };
    }
    if (
      !Number.isFinite(pos.x) ||
      !Number.isFinite(pos.y) ||
      pos.x < 0 ||
      pos.x > 1 ||
      pos.y < 0 ||
      pos.y > 1
    ) {
      return { ok: false, error: "shopSwitch.position phải trong [0, 1]." };
    }
    patch.position = { x: pos.x, y: pos.y };
  }
  if ("showName" in obj) {
    if (typeof obj.showName !== "boolean") {
      return { ok: false, error: "shopSwitch.showName phải là boolean." };
    }
    patch.showName = obj.showName;
  }

  return { ok: true, patch };
}

export function applyShopSwitchPatch(
  prev: ProfileShopSwitchSlice,
  patch: ShopSwitchPatchInput,
  customs?: ProfileCustomEntry[] | null,
): ProfileShopSwitchSlice {
  let imageId =
    patch.imageId !== undefined ? patch.imageId : prev.imageId;
  if (imageId && customs && customs.length > 0) {
    const allowed = new Set(customs.map((c) => c.imageId));
    if (!allowed.has(imageId)) imageId = null;
  }

  const kind: ShopSwitchKind = imageId ? "poster" : "classic";
  return {
    kind,
    imageId,
    aspect: patch.aspect !== undefined
      ? clampShopSwitchAspect(patch.aspect)
      : prev.aspect,
    position: patch.position
      ? {
          x: Math.min(1, Math.max(0, patch.position.x)),
          y: Math.min(1, Math.max(0, patch.position.y)),
        }
      : { ...prev.position },
    showName:
      patch.showName !== undefined ? patch.showName : prev.showName,
  };
}

export function resolveShopSwitchDto(
  slice: ProfileShopSwitchSlice,
): ShopSwitchDto {
  const aspect = clampShopSwitchAspect(slice.aspect);
  const pos = positionCss(slice.position);
  if (slice.imageId) {
    const imageUrl = shopSwitchImageUrl(slice.imageId);
    if (imageUrl) {
      return {
        kind: "poster",
        imageUrl,
        aspect,
        positionCss: pos,
        showName: slice.showName,
      };
    }
  }
  return {
    kind: "classic",
    imageUrl: null,
    aspect,
    positionCss: pos,
    showName: slice.showName,
  };
}

export function shopSwitchFromGiaoDien(raw: unknown): ShopSwitchDto {
  if (!raw || typeof raw !== "object") {
    return resolveShopSwitchDto(DEFAULT_SHOP_SWITCH);
  }
  const obj = raw as Record<string, unknown>;
  const customsRaw = Array.isArray(obj.customs) ? obj.customs : [];
  const customs: ProfileCustomEntry[] = [];
  for (const row of customsRaw) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    if (typeof rec.imageId === "string" && rec.imageId.trim()) {
      customs.push({
        imageId: rec.imageId.trim(),
        createdAt:
          typeof rec.createdAt === "string" ? rec.createdAt : "",
      });
    }
  }
  return resolveShopSwitchDto(parseShopSwitch(obj.shopSwitch, customs));
}

export function shopSwitchCardStyle(
  dto: ShopSwitchDto,
): CSSProperties {
  const style: CSSProperties = {
    ["--j-shop-switch-aspect" as string]: String(dto.aspect),
  };
  if (dto.imageUrl) {
    style["--j-shop-switch-pos" as string] = dto.positionCss;
  }
  return style;
}

export const SHOP_SWITCH_PREVIEW_EVENT = "cins-shop-switch-preview";

export type ShopSwitchPreviewDetail = {
  dto: ShopSwitchDto;
};

export function dispatchShopSwitchPreview(dto: ShopSwitchDto): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ShopSwitchPreviewDetail>(SHOP_SWITCH_PREVIEW_EVENT, {
      detail: { dto },
    }),
  );
}
