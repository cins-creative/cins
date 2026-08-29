/**
 * Theme trang hồ sơ Journey — SoT: user_nguoi_dung.giao_dien (jsonb).
 * Plan: docs/PLAN_customize_theme.md
 *
 * Không gộp với user_nguoi_dung.theme (share OG).
 * Topbar không nhận vars — scope chỉ .cins-journey-page.
 */

import type { CSSProperties } from "react";

import { getCfAccountHash } from "@/lib/cloudflare/account-hash";
import {
  applyAvatarFramePatch,
  DEFAULT_AVATAR_FRAME,
  framesEqual,
  parseAvatarFrame,
  serializeAvatarFrame,
  validateAvatarFramePatchBody,
  type AvatarFramePatchInput,
  type ProfileAvatarFrameSlice,
} from "@/lib/journey/avatar-frame";
import {
  applyCardPatch,
  cardsEqual,
  DEFAULT_CARD_THEME,
  parseCardTheme,
  serializeCardTheme,
  validateCardPatchBody,
  type CardThemePatchInput,
  type ProfileCardThemeSlice,
} from "@/lib/journey/card-theme";
import {
  applyPopoverPatch,
  DEFAULT_POPOVER_THEME,
  parsePopoverTheme,
  popoversEqual,
  serializePopoverTheme,
  validatePopoverPatchBody,
  type PopoverThemePatchInput,
  type ProfilePopoverThemeSlice,
} from "@/lib/journey/popover-theme";
import {
  applyShopSwitchPatch,
  DEFAULT_SHOP_SWITCH,
  parseShopSwitch,
  serializeShopSwitch,
  shopSwitchesEqual,
  validateShopSwitchPatchBody,
  type ProfileShopSwitchSlice,
  type ShopSwitchPatchInput,
} from "@/lib/journey/shop-switch";

/* ── Accent presets (catalog 10 id; picker hiện 9 recent + colorwheel) ─ */

export const PROFILE_ACCENT_IDS = [
  "cins",
  "sky",
  "teal",
  "mint",
  "sun",
  "orange",
  "coral",
  "rose",
  "violet",
  "ink",
] as const;

export type ProfilePresetAccentId = (typeof PROFILE_ACCENT_IDS)[number];
export type ProfileAccentId = ProfilePresetAccentId | "custom";

export type ProfileAccentDef = {
  id: ProfilePresetAccentId;
  label: string;
  /** Hue neo (light). Dark mode nâng sáng bằng CSS color-mix. */
  hex: string;
};

export const PROFILE_ACCENTS: ReadonlyArray<ProfileAccentDef> = [
  { id: "cins", label: "CINs Blue", hex: "#1F74C9" },
  { id: "sky", label: "Xanh trời", hex: "#38A3F5" },
  { id: "teal", label: "Xanh ngọc", hex: "#0E9F9F" },
  { id: "mint", label: "Bạc hà", hex: "#1A7F57" },
  { id: "sun", label: "Nắng", hex: "#C99A00" },
  { id: "orange", label: "Cam", hex: "#B4620A" },
  { id: "coral", label: "San hô", hex: "#E4633F" },
  { id: "rose", label: "Hồng đào", hex: "#D94A72" },
  { id: "violet", label: "Tím", hex: "#7A45C4" },
  { id: "ink", label: "Mực đen", hex: "#1B1F2A" },
];

const ACCENT_BY_ID: Record<ProfilePresetAccentId, ProfileAccentDef> =
  Object.fromEntries(PROFILE_ACCENTS.map((a) => [a.id, a])) as Record<
    ProfilePresetAccentId,
    ProfileAccentDef
  >;

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function isProfilePresetAccentId(
  value: unknown,
): value is ProfilePresetAccentId {
  return (
    typeof value === "string" &&
    (PROFILE_ACCENT_IDS as readonly string[]).includes(value)
  );
}

export function isProfileAccentId(value: unknown): value is ProfileAccentId {
  return value === "custom" || isProfilePresetAccentId(value);
}

export function normalizeAccentHex(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const hex = raw.trim();
  if (!HEX_RE.test(hex)) return null;
  return hex.toUpperCase();
}

/** Số ô màu trên hàng swatch (MRU). */
export const PROFILE_ACCENT_RECENT_MAX = 9;

export const DEFAULT_PROFILE_ACCENT_RECENTS: readonly string[] =
  PROFILE_ACCENTS.slice(0, PROFILE_ACCENT_RECENT_MAX).map((a) =>
    a.hex.toUpperCase(),
  );

export function presetAccentIdFromHex(
  hex: string,
): ProfilePresetAccentId | null {
  const n = normalizeAccentHex(hex);
  if (!n) return null;
  for (const a of PROFILE_ACCENTS) {
    if (a.hex.toUpperCase() === n) return a.id;
  }
  return null;
}

/** Unique hex, mới nhất trước. Thiếu slot thì pad preset mặc định. */
export function parseAccentRecent(raw: unknown): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const hex = normalizeAccentHex(item);
      if (!hex || seen.has(hex)) continue;
      seen.add(hex);
      out.push(hex);
      if (out.length >= PROFILE_ACCENT_RECENT_MAX) break;
    }
  }
  if (out.length === 0) {
    return [...DEFAULT_PROFILE_ACCENT_RECENTS];
  }
  for (const hex of DEFAULT_PROFILE_ACCENT_RECENTS) {
    if (out.length >= PROFILE_ACCENT_RECENT_MAX) break;
    if (seen.has(hex)) continue;
    seen.add(hex);
    out.push(hex);
  }
  return out;
}

/** Màu mới → ô 1; các ô cũ dịch +1; trùng thì gỡ chỗ cũ rồi lên đầu. */
export function rememberAccentRecent(hex: string, prev: string[]): string[] {
  const n = normalizeAccentHex(hex);
  const list =
    prev.length > 0 ? parseAccentRecent(prev) : [...DEFAULT_PROFILE_ACCENT_RECENTS];
  if (!n || list[0] === n) return list;
  return [n, ...list.filter((h) => h !== n)].slice(
    0,
    PROFILE_ACCENT_RECENT_MAX,
  );
}

export function accentFromRecentHex(hex: string): {
  accent: ProfileAccentId;
  accentHex: string | null;
} {
  const n = normalizeAccentHex(hex);
  if (!n) return { accent: "cins", accentHex: null };
  const id = presetAccentIdFromHex(n);
  if (id) return { accent: id, accentHex: null };
  return { accent: "custom", accentHex: n };
}

/** Hook billing — Phase 1 luôn false. */
export function isPremiumPreset(_id: ProfileAccentId): boolean {
  return false;
}

/* ── Background patterns ─────────────────────────────────────────── */

export const PROFILE_PATTERN_IDS = [
  "none",
  "paper",
  "dots",
  "dots-stagger",
  "grid",
  "diagonal",
  "crosshatch",
  "confetti",
  "blueprint",
] as const;

export type ProfilePatternId = (typeof PROFILE_PATTERN_IDS)[number];

export type ProfilePatternDef = {
  id: ProfilePatternId;
  label: string;
  /** CSS background-image; dùng var(--j-accent) để nhuộm theo accent. */
  image: string | null;
  size: string | null;
  /** background-position cho lớp pattern (vd. chấm so le). */
  position: string | null;
  /**
   * Preview trong picker — đậm / tile nhỏ hơn để phân biệt ở ô ~56px.
   * Không set → dùng `image` / `size` / `position`.
   */
  thumbImage?: string | null;
  thumbSize?: string | null;
  thumbPosition?: string | null;
};

/** Ảnh mặc định trên tab «Ảnh nền» khi chưa có ảnh user (picker switch). */
export const PROFILE_THEME_BG_SWITCH_DEFAULT =
  "/journey/theme-bg-switch-default.jpg";

/**
 * Pattern sinh bằng gradient — 0 request ảnh.
 * Dùng color-mix với --j-accent để tự nhuộm theo preset màu.
 * `thumb*` đậm hơn cho ô chọn trong modal (page vẫn nhẹ hơn một chút).
 */
export const PROFILE_PATTERNS: ReadonlyArray<ProfilePatternDef> = [
  { id: "none", label: "Trơn", image: null, size: null, position: null },
  {
    id: "paper",
    label: "Giấy",
    image:
      "linear-gradient(180deg, color-mix(in srgb, var(--j-accent) 12%, transparent), transparent 52%), repeating-linear-gradient(0deg, transparent 0 11px, color-mix(in srgb, var(--j-accent) 8%, transparent) 11px 12px)",
    size: null,
    position: null,
    thumbImage:
      "linear-gradient(180deg, color-mix(in srgb, var(--j-accent) 28%, transparent), transparent 60%), repeating-linear-gradient(0deg, transparent 0 5px, color-mix(in srgb, var(--j-accent) 22%, transparent) 5px 6px)",
  },
  {
    id: "dots",
    label: "Chấm",
    image:
      "radial-gradient(circle, color-mix(in srgb, var(--j-accent) 28%, transparent) 1.5px, transparent 2px)",
    size: "16px 16px",
    position: null,
    thumbSize: "9px 9px",
    thumbImage:
      "radial-gradient(circle, color-mix(in srgb, var(--j-accent) 55%, transparent) 1.6px, transparent 2.1px)",
  },
  {
    id: "dots-stagger",
    label: "Chấm so le",
    image:
      "radial-gradient(circle, color-mix(in srgb, var(--j-accent) 28%, transparent) 1.4px, transparent 1.8px), radial-gradient(circle, color-mix(in srgb, var(--j-accent) 28%, transparent) 1.4px, transparent 1.8px)",
    size: "18px 18px, 18px 18px",
    position: "0 0, 9px 9px",
    thumbSize: "10px 10px, 10px 10px",
    thumbPosition: "0 0, 5px 5px",
    thumbImage:
      "radial-gradient(circle, color-mix(in srgb, var(--j-accent) 55%, transparent) 1.5px, transparent 2px), radial-gradient(circle, color-mix(in srgb, var(--j-accent) 55%, transparent) 1.5px, transparent 2px)",
  },
  {
    id: "grid",
    label: "Lưới",
    image:
      "repeating-linear-gradient(0deg, color-mix(in srgb, var(--j-accent) 16%, transparent) 0 1px, transparent 1px 20px), repeating-linear-gradient(90deg, color-mix(in srgb, var(--j-accent) 16%, transparent) 0 1px, transparent 1px 20px)",
    size: null,
    position: null,
    thumbImage:
      "repeating-linear-gradient(0deg, color-mix(in srgb, var(--j-accent) 40%, transparent) 0 1px, transparent 1px 10px), repeating-linear-gradient(90deg, color-mix(in srgb, var(--j-accent) 40%, transparent) 0 1px, transparent 1px 10px)",
  },
  {
    id: "diagonal",
    label: "Sọc chéo",
    image:
      "repeating-linear-gradient(45deg, color-mix(in srgb, var(--j-accent) 14%, transparent) 0 8px, transparent 8px 16px)",
    size: null,
    position: null,
    thumbImage:
      "repeating-linear-gradient(45deg, color-mix(in srgb, var(--j-accent) 42%, transparent) 0 5px, transparent 5px 10px)",
  },
  {
    id: "crosshatch",
    label: "Đan chéo",
    image:
      "repeating-linear-gradient(45deg, color-mix(in srgb, var(--j-accent) 12%, transparent) 0 7px, transparent 7px 14px), repeating-linear-gradient(-45deg, color-mix(in srgb, var(--j-accent) 12%, transparent) 0 7px, transparent 7px 14px)",
    size: null,
    position: null,
    thumbImage:
      "repeating-linear-gradient(45deg, color-mix(in srgb, var(--j-accent) 38%, transparent) 0 4px, transparent 4px 8px), repeating-linear-gradient(-45deg, color-mix(in srgb, var(--j-accent) 38%, transparent) 0 4px, transparent 4px 8px)",
  },
  {
    id: "confetti",
    label: "Confetti",
    image:
      "radial-gradient(circle at 20% 28%, color-mix(in srgb, var(--j-accent) 45%, transparent) 0 5px, transparent 6px), radial-gradient(circle at 72% 18%, color-mix(in srgb, var(--j-accent) 35%, #f43f5e) 0 4px, transparent 5px), radial-gradient(circle at 86% 66%, color-mix(in srgb, var(--j-accent) 30%, #eab308) 0 5px, transparent 6px), radial-gradient(circle at 34% 82%, color-mix(in srgb, var(--j-accent) 30%, #10b981) 0 4px, transparent 5px)",
    size: "220px 220px",
    position: null,
    thumbSize: "56px 56px",
  },
  {
    id: "blueprint",
    label: "Blueprint",
    image:
      "repeating-linear-gradient(0deg, color-mix(in srgb, var(--j-accent) 22%, transparent) 0 1px, transparent 1px 22px), repeating-linear-gradient(90deg, color-mix(in srgb, var(--j-accent) 22%, transparent) 0 1px, transparent 1px 22px)",
    size: null,
    position: null,
    thumbImage:
      "repeating-linear-gradient(0deg, color-mix(in srgb, var(--j-accent) 45%, transparent) 0 1px, transparent 1px 8px), repeating-linear-gradient(90deg, color-mix(in srgb, var(--j-accent) 45%, transparent) 0 1px, transparent 1px 8px), repeating-linear-gradient(0deg, color-mix(in srgb, var(--j-accent) 18%, transparent) 0 1px, transparent 1px 32px), repeating-linear-gradient(90deg, color-mix(in srgb, var(--j-accent) 18%, transparent) 0 1px, transparent 1px 32px)",
  },
];

const PATTERN_BY_ID: Record<ProfilePatternId, ProfilePatternDef> =
  Object.fromEntries(PROFILE_PATTERNS.map((p) => [p.id, p])) as Record<
    ProfilePatternId,
    ProfilePatternDef
  >;

export function isProfilePatternId(value: unknown): value is ProfilePatternId {
  return (
    typeof value === "string" &&
    (PROFILE_PATTERN_IDS as readonly string[]).includes(value)
  );
}

/* ── State shape ─────────────────────────────────────────────────── */

export const PROFILE_THEME_CUSTOMS_MAX = 9;
export const PROFILE_BG_DIM_MIN = 0.2;
export const PROFILE_BG_DIM_MAX = 1;
export const PROFILE_BG_DIM_DEFAULT = 0.35;

/**
 * Slider = độ đậm nền (20% mờ → 100% đậm tối đa).
 * CSS lớp phủ = đảo: 100% nền → phủ 0 (user đã xử lý ảnh sẵn).
 */
export function overlayDimFromUi(dim: number): number {
  const d = Math.min(PROFILE_BG_DIM_MAX, Math.max(PROFILE_BG_DIM_MIN, dim));
  return Math.min(1, Math.max(0, 1 - d));
}

export type ProfileBgKind = "none" | "pattern" | "image";

export type ProfileThemeDeviceId = "phone" | "tablet" | "desktop";

export const PROFILE_THEME_DEVICES: readonly ProfileThemeDeviceId[] = [
  "desktop",
  "tablet",
  "phone",
] as const;

/** Trọng tâm khung ảnh — 0..1 → CSS background-position %. */
export type ProfileBgPosition = { x: number; y: number };

export const DEFAULT_BG_POSITION: ProfileBgPosition = { x: 0.5, y: 0.5 };

export type ProfileDeviceBgOverride = {
  imageId: string | null;
  position: ProfileBgPosition;
};

export type ProfileBackground = {
  kind: ProfileBgKind;
  patternId: ProfilePatternId;
  imageId: string | null;
  dim: number;
  position: ProfileBgPosition;
  /** Override theo device; thiếu key / imageId null → kế thừa mặc định. */
  devices: Partial<Record<ProfileThemeDeviceId, ProfileDeviceBgOverride>>;
};

export type ProfileCustomEntry = {
  imageId: string;
  createdAt: string;
};

export type ProfileThemeSlice = {
  accent: ProfileAccentId;
  /** Hex `#RRGGBB` khi accent === "custom"; null khi dùng preset. */
  accentHex: string | null;
  /** Opt-in: áp theme lên trang chủ của chính viewer (mặc định tắt). */
  applyToHome: boolean;
  background: ProfileBackground;
};

export type ProfileGiaoDienState = {
  v: 1;
  theme: ProfileThemeSlice;
  customs: ProfileCustomEntry[];
  /** Nhóm B — khung & viền avatar. */
  avatarFrame: ProfileAvatarFrameSlice;
  /** Nhóm E — thanh bài / datebar (public theo author). */
  card: ProfileCardThemeSlice;
  /** Nhóm D — card user popover. */
  popover: ProfilePopoverThemeSlice;
  /** Khối ShopSwitchCard trên sidebar Journey. */
  shopSwitch: ProfileShopSwitchSlice;
};

export const DEFAULT_PROFILE_THEME: ProfileThemeSlice = {
  accent: "cins",
  accentHex: null,
  applyToHome: false,
  background: {
    kind: "none",
    patternId: "none",
    imageId: null,
    dim: PROFILE_BG_DIM_DEFAULT,
    position: { ...DEFAULT_BG_POSITION },
    devices: {},
  },
};

export function emptyGiaoDien(): ProfileGiaoDienState {
  return {
    v: 1,
    theme: {
      ...DEFAULT_PROFILE_THEME,
      background: {
        ...DEFAULT_PROFILE_THEME.background,
        position: { ...DEFAULT_BG_POSITION },
        devices: {},
      },
    },
    customs: [],
    avatarFrame: { ...DEFAULT_AVATAR_FRAME },
    card: {
      ...DEFAULT_CARD_THEME,
      position: { ...DEFAULT_CARD_THEME.position },
    },
    popover: {
      ...DEFAULT_POPOVER_THEME,
      surface: { ...DEFAULT_POPOVER_THEME.surface },
      cover: {
        ...DEFAULT_POPOVER_THEME.cover,
        position: { ...DEFAULT_POPOVER_THEME.cover.position },
      },
      info: { ...DEFAULT_POPOVER_THEME.info },
      stats: [...DEFAULT_POPOVER_THEME.stats],
      actions: { ...DEFAULT_POPOVER_THEME.actions },
      featured: { ...DEFAULT_POPOVER_THEME.featured },
    },
    shopSwitch: {
      ...DEFAULT_SHOP_SWITCH,
      position: { ...DEFAULT_SHOP_SWITCH.position },
    },
  };
}

export function clampDim(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return PROFILE_BG_DIM_DEFAULT;
  }
  return Math.min(PROFILE_BG_DIM_MAX, Math.max(PROFILE_BG_DIM_MIN, raw));
}

export function clampPositionCoord(raw: unknown, fallback = 0.5): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return fallback;
  return Math.min(1, Math.max(0, raw));
}

export function parseBgPosition(
  raw: unknown,
  fallback: ProfileBgPosition = DEFAULT_BG_POSITION,
): ProfileBgPosition {
  if (!raw || typeof raw !== "object") {
    return { x: fallback.x, y: fallback.y };
  }
  const obj = raw as Record<string, unknown>;
  return {
    x: clampPositionCoord(obj.x, fallback.x),
    y: clampPositionCoord(obj.y, fallback.y),
  };
}

export function positionToCss(pos: ProfileBgPosition): string {
  const x = Math.round(clampPositionCoord(pos.x) * 1000) / 10;
  const y = Math.round(clampPositionCoord(pos.y) * 1000) / 10;
  return `${x}% ${y}%`;
}

export function isProfileThemeDeviceId(
  value: unknown,
): value is ProfileThemeDeviceId {
  return value === "phone" || value === "tablet" || value === "desktop";
}

/** Ảnh hiệu lực cho một device (kế thừa default nếu null/thiếu). */
export function resolveDeviceImageId(
  bg: ProfileBackground,
  device: ProfileThemeDeviceId,
): string | null {
  const override = bg.devices[device];
  if (override && typeof override.imageId === "string" && override.imageId) {
    return override.imageId;
  }
  return bg.imageId;
}

export function resolveDevicePosition(
  bg: ProfileBackground,
  device: ProfileThemeDeviceId,
): ProfileBgPosition {
  const override = bg.devices[device];
  if (override?.position) {
    return {
      x: clampPositionCoord(override.position.x, bg.position.x),
      y: clampPositionCoord(override.position.y, bg.position.y),
    };
  }
  return { x: bg.position.x, y: bg.position.y };
}

function parseCustoms(raw: unknown): ProfileCustomEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: ProfileCustomEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.imageId !== "string" || !row.imageId.trim()) continue;
    out.push({
      imageId: row.imageId.trim(),
      createdAt:
        typeof row.createdAt === "string" && row.createdAt
          ? row.createdAt
          : new Date(0).toISOString(),
    });
    if (out.length >= PROFILE_THEME_CUSTOMS_MAX) break;
  }
  return out;
}

function parseDevices(
  raw: unknown,
  customs: ProfileCustomEntry[],
  fallbackPos: ProfileBgPosition,
): ProfileBackground["devices"] {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const allowed = new Set(customs.map((c) => c.imageId));
  const out: ProfileBackground["devices"] = {};
  for (const id of PROFILE_THEME_DEVICES) {
    const row = obj[id];
    if (!row || typeof row !== "object") continue;
    const d = row as Record<string, unknown>;
    let imageId: string | null = null;
    if (typeof d.imageId === "string" && d.imageId.trim()) {
      const idTrim = d.imageId.trim();
      imageId = allowed.has(idTrim) ? idTrim : null;
    } else if (d.imageId === null) {
      imageId = null;
    }
    out[id] = {
      imageId,
      position: parseBgPosition(d.position, fallbackPos),
    };
  }
  return out;
}

function parseBackground(
  raw: unknown,
  customs: ProfileCustomEntry[],
): ProfileBackground {
  const base: ProfileBackground = {
    ...DEFAULT_PROFILE_THEME.background,
    position: { ...DEFAULT_BG_POSITION },
    devices: {},
  };
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, unknown>;

  const kindRaw = obj.kind;
  const kind: ProfileBgKind =
    kindRaw === "pattern" || kindRaw === "image" || kindRaw === "none"
      ? kindRaw
      : "none";

  const patternId = isProfilePatternId(obj.patternId)
    ? obj.patternId
    : kind === "pattern"
      ? "dots"
      : "none";

  const position = parseBgPosition(obj.position);
  const devices = parseDevices(obj.devices, customs, position);

  let imageId: string | null =
    typeof obj.imageId === "string" && obj.imageId.trim()
      ? obj.imageId.trim()
      : null;
  if (kind === "image") {
    const allowed = new Set(customs.map((c) => c.imageId));
    if (!imageId || !allowed.has(imageId)) {
      for (const id of PROFILE_THEME_DEVICES) {
        const dId = devices[id]?.imageId;
        if (dId && allowed.has(dId)) {
          imageId = dId;
          break;
        }
      }
    }
    if (!imageId || !allowed.has(imageId)) {
      return {
        kind: "pattern",
        patternId: patternId === "none" ? "dots" : patternId,
        imageId: null,
        dim: clampDim(obj.dim),
        position,
        devices: {},
      };
    }
  } else {
    imageId = null;
  }

  return {
    kind: kind === "image" ? "image" : kind === "pattern" ? "pattern" : "none",
    patternId: kind === "pattern" ? patternId : "none",
    imageId: kind === "image" ? imageId : null,
    dim: clampDim(obj.dim),
    position,
    devices: kind === "image" ? devices : {},
  };
}

/** Tolerant parse — `{}` / null / JSON hỏng → default. */
export function parseProfileGiaoDien(raw: unknown): ProfileGiaoDienState {
  if (raw == null) return emptyGiaoDien();

  let obj: Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object") return emptyGiaoDien();
      obj = parsed as Record<string, unknown>;
    } catch {
      return emptyGiaoDien();
    }
  } else if (typeof raw === "object") {
    obj = raw as Record<string, unknown>;
  } else {
    return emptyGiaoDien();
  }

  const customs = parseCustoms(obj.customs);
  const themeRaw =
    obj.theme && typeof obj.theme === "object"
      ? (obj.theme as Record<string, unknown>)
      : {};

  const accentRaw = themeRaw.accent;
  let accent: ProfileAccentId = DEFAULT_PROFILE_THEME.accent;
  let accentHex: string | null = null;

  if (accentRaw === "custom") {
    const hex = normalizeAccentHex(themeRaw.accentHex);
    if (hex) {
      accent = "custom";
      accentHex = hex;
    }
  } else if (isProfilePresetAccentId(accentRaw)) {
    accent = accentRaw;
  } else {
    const legacyHex = normalizeAccentHex(themeRaw.accentHex);
    if (legacyHex) {
      accent = "custom";
      accentHex = legacyHex;
    }
  }

  const applyToHome = themeRaw.applyToHome === true;

  const state: ProfileGiaoDienState = {
    v: 1,
    theme: {
      accent,
      accentHex,
      applyToHome,
      background: parseBackground(themeRaw.background, customs),
    },
    customs,
    avatarFrame: parseAvatarFrame(obj.avatarFrame, customs),
    card: parseCardTheme(obj.card, customs),
    popover: parsePopoverTheme(obj.popover, customs),
    shopSwitch: parseShopSwitch(obj.shopSwitch, customs),
  };

  return state;
}

export function isDefaultProfileTheme(state: ProfileGiaoDienState): boolean {
  const { accent, accentHex, applyToHome, background } = state.theme;
  return (
    accent === "cins" &&
    !accentHex &&
    !applyToHome &&
    background.kind === "none" &&
    state.customs.length === 0
  );
}

/* ── PATCH validation ────────────────────────────────────────────── */

export type ProfileThemePatchInput = {
  accent?: ProfileAccentId;
  accentHex?: string | null;
  applyToHome?: boolean;
  background?: {
    kind?: ProfileBgKind;
    patternId?: ProfilePatternId;
    imageId?: string | null;
    dim?: number;
    position?: ProfileBgPosition;
    devices?: Partial<
      Record<
        ProfileThemeDeviceId,
        { imageId?: string | null; position?: ProfileBgPosition }
      >
    >;
  };
  /** Nhóm E — merge `giao_dien.card`. */
  card?: CardThemePatchInput;
  /** Nhóm B — merge `giao_dien.avatarFrame`. */
  avatarFrame?: AvatarFramePatchInput;
  /** Nhóm D — merge `giao_dien.popover`. */
  popover?: PopoverThemePatchInput;
  /** Khối Shop trên sidebar. */
  shopSwitch?: ShopSwitchPatchInput;
};

export type ValidateThemePatchResult =
  | { ok: true; patch: ProfileThemePatchInput }
  | { ok: false; error: string };

function parsePatchPosition(
  raw: unknown,
): ProfileBgPosition | { error: string } {
  if (!raw || typeof raw !== "object") {
    return { error: "background.position không hợp lệ." };
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.x !== "number" || !Number.isFinite(obj.x)) {
    return { error: "background.position.x không hợp lệ." };
  }
  if (typeof obj.y !== "number" || !Number.isFinite(obj.y)) {
    return { error: "background.position.y không hợp lệ." };
  }
  if (obj.x < 0 || obj.x > 1 || obj.y < 0 || obj.y > 1) {
    return { error: "background.position phải trong [0, 1]." };
  }
  return { x: obj.x, y: obj.y };
}

export function validateThemePatchBody(
  body: unknown,
): ValidateThemePatchResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Body phải là object." };
  }
  const obj = body as Record<string, unknown>;
  const patch: ProfileThemePatchInput = {};

  if ("accent" in obj) {
    if (!isProfileAccentId(obj.accent)) {
      return { ok: false, error: "accent không hợp lệ." };
    }
    patch.accent = obj.accent;
    if (obj.accent === "custom") {
      const hex = normalizeAccentHex(obj.accentHex);
      if (!hex) {
        return {
          ok: false,
          error: "accentHex phải là #RRGGBB khi accent = custom.",
        };
      }
      patch.accentHex = hex;
    } else {
      patch.accentHex = null;
    }
  } else if ("accentHex" in obj) {
    const hex = normalizeAccentHex(obj.accentHex);
    if (!hex) {
      return { ok: false, error: "accentHex phải là #RRGGBB." };
    }
    patch.accent = "custom";
    patch.accentHex = hex;
  }

  if ("applyToHome" in obj) {
    if (typeof obj.applyToHome !== "boolean") {
      return { ok: false, error: "applyToHome phải là boolean." };
    }
    patch.applyToHome = obj.applyToHome;
  }

  if ("background" in obj) {
    if (!obj.background || typeof obj.background !== "object") {
      return { ok: false, error: "background không hợp lệ." };
    }
    const bg = obj.background as Record<string, unknown>;
    const next: NonNullable<ProfileThemePatchInput["background"]> = {};

    if ("kind" in bg) {
      if (bg.kind !== "none" && bg.kind !== "pattern" && bg.kind !== "image") {
        return { ok: false, error: "background.kind không hợp lệ." };
      }
      next.kind = bg.kind;
    }
    if ("patternId" in bg) {
      if (!isProfilePatternId(bg.patternId)) {
        return { ok: false, error: "background.patternId không hợp lệ." };
      }
      next.patternId = bg.patternId;
    }
    if ("imageId" in bg) {
      if (bg.imageId != null && typeof bg.imageId !== "string") {
        return { ok: false, error: "background.imageId không hợp lệ." };
      }
      next.imageId =
        typeof bg.imageId === "string" && bg.imageId.trim()
          ? bg.imageId.trim()
          : null;
    }
    if ("dim" in bg) {
      if (typeof bg.dim !== "number" || !Number.isFinite(bg.dim)) {
        return { ok: false, error: "background.dim không hợp lệ." };
      }
      if (bg.dim < 0 || bg.dim > PROFILE_BG_DIM_MAX) {
        return {
          ok: false,
          error: `background.dim phải trong [0, ${PROFILE_BG_DIM_MAX}].`,
        };
      }
      next.dim = clampDim(bg.dim);
    }
    if ("position" in bg) {
      const pos = parsePatchPosition(bg.position);
      if ("error" in pos) return { ok: false, error: pos.error };
      next.position = pos;
    }
    if ("devices" in bg) {
      if (!bg.devices || typeof bg.devices !== "object") {
        return { ok: false, error: "background.devices không hợp lệ." };
      }
      const devicesRaw = bg.devices as Record<string, unknown>;
      const devices: NonNullable<
        ProfileThemePatchInput["background"]
      >["devices"] = {};
      for (const [key, val] of Object.entries(devicesRaw)) {
        if (!isProfileThemeDeviceId(key)) {
          return {
            ok: false,
            error: `background.devices.${key} không hợp lệ.`,
          };
        }
        if (val == null) {
          devices[key] = { imageId: null };
          continue;
        }
        if (typeof val !== "object") {
          return {
            ok: false,
            error: `background.devices.${key} không hợp lệ.`,
          };
        }
        const d = val as Record<string, unknown>;
        const entry: {
          imageId?: string | null;
          position?: ProfileBgPosition;
        } = {};
        if ("imageId" in d) {
          if (d.imageId != null && typeof d.imageId !== "string") {
            return {
              ok: false,
              error: `background.devices.${key}.imageId không hợp lệ.`,
            };
          }
          entry.imageId =
            typeof d.imageId === "string" && d.imageId.trim()
              ? d.imageId.trim()
              : null;
        }
        if ("position" in d) {
          const pos = parsePatchPosition(d.position);
          if ("error" in pos) {
            return {
              ok: false,
              error: `background.devices.${key}.position không hợp lệ.`,
            };
          }
          entry.position = pos;
        }
        devices[key] = entry;
      }
      next.devices = devices;
    }
    patch.background = next;
  }

  if ("card" in obj) {
    const cardResult = validateCardPatchBody(obj.card);
    if (!cardResult.ok) return cardResult;
    patch.card = cardResult.patch;
  }

  if ("avatarFrame" in obj) {
    const frameResult = validateAvatarFramePatchBody(obj.avatarFrame);
    if (!frameResult.ok) return frameResult;
    patch.avatarFrame = frameResult.patch;
  }

  if ("popover" in obj) {
    const popResult = validatePopoverPatchBody(obj.popover);
    if (!popResult.ok) return popResult;
    patch.popover = popResult.patch;
  }

  if ("shopSwitch" in obj) {
    const shopResult = validateShopSwitchPatchBody(obj.shopSwitch);
    if (!shopResult.ok) return shopResult;
    patch.shopSwitch = shopResult.patch;
  }

  if (
    !patch.accent &&
    !patch.background &&
    patch.accentHex === undefined &&
    patch.applyToHome === undefined &&
    !patch.card &&
    !patch.avatarFrame &&
    !patch.popover &&
    !patch.shopSwitch
  ) {
    return {
      ok: false,
      error:
        "Thiếu accent, background, applyToHome, card, avatarFrame, popover hoặc shopSwitch.",
    };
  }

  return { ok: true, patch };
}

/** Merge nông theme; giữ key nhóm B–F trên root. */
export function applyThemePatch(
  prev: ProfileGiaoDienState,
  patch: ProfileThemePatchInput,
): ProfileGiaoDienState {
  const background: ProfileBackground = {
    ...prev.theme.background,
    position: { ...prev.theme.background.position },
    devices: { ...prev.theme.background.devices },
  };
  if (patch.background) {
    if (patch.background.kind !== undefined) {
      background.kind = patch.background.kind;
    }
    if (patch.background.patternId !== undefined) {
      background.patternId = patch.background.patternId;
    }
    if (patch.background.imageId !== undefined) {
      background.imageId = patch.background.imageId;
    }
    if (patch.background.dim !== undefined) {
      background.dim = clampDim(patch.background.dim);
    }
    if (patch.background.position) {
      background.position = {
        x: clampPositionCoord(patch.background.position.x),
        y: clampPositionCoord(patch.background.position.y),
      };
    }
    if (patch.background.devices) {
      for (const id of PROFILE_THEME_DEVICES) {
        const d = patch.background.devices[id];
        if (!d) continue;
        const prevD = background.devices[id] ?? {
          imageId: null,
          position: { ...background.position },
        };
        background.devices[id] = {
          imageId: d.imageId !== undefined ? d.imageId : prevD.imageId,
          position: d.position
            ? {
                x: clampPositionCoord(d.position.x, prevD.position.x),
                y: clampPositionCoord(d.position.y, prevD.position.y),
              }
            : { ...prevD.position },
        };
      }
    }
    if (background.kind === "none") {
      background.patternId = "none";
      background.imageId = null;
      background.devices = {};
    } else if (background.kind === "pattern") {
      background.imageId = null;
      background.devices = {};
      if (background.patternId === "none") background.patternId = "dots";
    } else if (background.kind === "image") {
      background.patternId = "none";
    }
  }

  let accent = patch.accent ?? prev.theme.accent;
  let accentHex =
    patch.accentHex !== undefined ? patch.accentHex : prev.theme.accentHex;
  if (accent === "custom") {
    accentHex = normalizeAccentHex(accentHex);
    if (!accentHex) {
      accent = "cins";
      accentHex = null;
    }
  } else {
    accentHex = null;
  }

  const applyToHome =
    patch.applyToHome !== undefined
      ? patch.applyToHome
      : prev.theme.applyToHome;

  const next: ProfileGiaoDienState = {
    v: 1,
    theme: {
      accent,
      accentHex,
      applyToHome,
      background,
    },
    customs: prev.customs,
    avatarFrame: patch.avatarFrame
      ? applyAvatarFramePatch(prev.avatarFrame, patch.avatarFrame, prev.customs)
      : prev.avatarFrame,
    card: patch.card
      ? applyCardPatch(prev.card, patch.card, prev.customs)
      : prev.card,
    popover: patch.popover
      ? applyPopoverPatch(prev.popover, patch.popover, prev.customs)
      : prev.popover,
    shopSwitch: patch.shopSwitch
      ? applyShopSwitchPatch(prev.shopSwitch, patch.shopSwitch, prev.customs)
      : prev.shopSwitch,
  };
  return next;
}

function serializeDevices(
  devices: ProfileBackground["devices"],
): Record<string, unknown> | undefined {
  const out: Record<string, unknown> = {};
  let any = false;
  for (const id of PROFILE_THEME_DEVICES) {
    const d = devices[id];
    if (!d) continue;
    any = true;
    out[id] = {
      imageId: d.imageId,
      position: { x: d.position.x, y: d.position.y },
    };
  }
  return any ? out : undefined;
}

/** Payload ghi DB — bỏ key undefined. */
export function serializeGiaoDien(
  state: ProfileGiaoDienState,
): Record<string, unknown> {
  const devices = serializeDevices(state.theme.background.devices);
  const background: Record<string, unknown> = {
    kind: state.theme.background.kind,
    patternId: state.theme.background.patternId,
    imageId: state.theme.background.imageId,
    dim: state.theme.background.dim,
    position: {
      x: state.theme.background.position.x,
      y: state.theme.background.position.y,
    },
  };
  if (devices) background.devices = devices;

  const out: Record<string, unknown> = {
    v: 1,
    theme: {
      accent: state.theme.accent,
      accentHex: state.theme.accent === "custom" ? state.theme.accentHex : null,
      applyToHome: state.theme.applyToHome === true,
      background,
    },
    customs: state.customs.slice(0, PROFILE_THEME_CUSTOMS_MAX),
  };
  const framePayload = serializeAvatarFrame(state.avatarFrame);
  if (
    framePayload &&
    (state.avatarFrame.enabled ||
      !framesEqual(state.avatarFrame, DEFAULT_AVATAR_FRAME))
  ) {
    out.avatarFrame = framePayload;
  }
  if (state.card.enabled || !cardsEqual(state.card, DEFAULT_CARD_THEME)) {
    out.card = serializeCardTheme(state.card);
  }
  if (
    state.popover.enabled ||
    !popoversEqual(state.popover, DEFAULT_POPOVER_THEME)
  ) {
    out.popover = serializePopoverTheme(state.popover);
  }
  if (!shopSwitchesEqual(state.shopSwitch, DEFAULT_SHOP_SWITCH)) {
    out.shopSwitch = serializeShopSwitch(state.shopSwitch);
  }
  return out;
}

/* ── CSS vars ────────────────────────────────────────────────────── */

export type ProfileThemeCssVars = CSSProperties & {
  ["--j-accent"]?: string;
  ["--j-bg-image"]?: string;
  ["--j-bg-image-sm"]?: string;
  ["--j-bg-image-md"]?: string;
  ["--j-bg-size"]?: string;
  ["--j-bg-position"]?: string;
  ["--j-bg-position-sm"]?: string;
  ["--j-bg-position-md"]?: string;
  ["--j-bg-repeat"]?: string;
  ["--j-bg-dim"]?: string;
};

/** URL Cloudflare Images (client-safe). */
export function profileThemeImageUrl(
  imageId: string,
  variant: "gridsm" | "grid" | "public" | "feed" | "feedsm" = "public",
): string | null {
  const id = imageId.trim();
  if (!id) return null;
  const hash = getCfAccountHash();
  if (!hash) return null;
  return `https://imagedelivery.net/${hash}/${id}/${variant}`;
}

/** Đưa ảnh mới lên đầu customs, cap PROFILE_THEME_CUSTOMS_MAX. */
export function prependProfileCustom(
  prev: ProfileCustomEntry[],
  imageId: string,
  createdAt: string = new Date().toISOString(),
): ProfileCustomEntry[] {
  const id = imageId.trim();
  if (!id) return prev.slice(0, PROFILE_THEME_CUSTOMS_MAX);
  return [
    { imageId: id, createdAt },
    ...prev.filter((c) => c.imageId !== id),
  ].slice(0, PROFILE_THEME_CUSTOMS_MAX);
}

/**
 * Gỡ một ảnh khỏi `customs` + scrub khỏi background/devices + card/popover imageId.
 * Nếu đang dùng ảnh đó và không còn ảnh thay thế → chuyển kind về pattern `dots`.
 */
export function removeProfileCustomImage(
  state: ProfileGiaoDienState,
  imageId: string,
): ProfileGiaoDienState {
  const id = imageId.trim();
  if (!id) return state;

  const customs = state.customs.filter((c) => c.imageId !== id);
  const card =
    state.card.imageId === id
      ? { ...state.card, imageId: null }
      : state.card;
  const avatarFrame =
    state.avatarFrame.overlayImageId === id
      ? { ...state.avatarFrame, overlayImageId: null }
      : state.avatarFrame;
  const popover =
    state.popover.surface.imageId === id
      ? {
          ...state.popover,
          surface: {
            ...state.popover.surface,
            imageId: null,
            kind: "gradient" as const,
          },
        }
      : state.popover;
  const shopSwitch =
    state.shopSwitch.imageId === id
      ? {
          ...state.shopSwitch,
          imageId: null,
          kind: "classic" as const,
        }
      : state.shopSwitch;
  const prevBg = state.theme.background;

  if (prevBg.kind !== "image") {
    return { ...state, customs, card, avatarFrame, popover, shopSwitch };
  }

  const devices: ProfileBackground["devices"] = {};
  for (const deviceId of PROFILE_THEME_DEVICES) {
    const row = prevBg.devices[deviceId];
    if (!row) continue;
    devices[deviceId] = {
      imageId: row.imageId === id ? null : row.imageId,
      position: { ...row.position },
    };
  }

  let nextImageId =
    prevBg.imageId === id ? null : (prevBg.imageId ?? null);
  if (!nextImageId) {
    for (const deviceId of PROFILE_THEME_DEVICES) {
      const dId = devices[deviceId]?.imageId;
      if (dId) {
        nextImageId = dId;
        break;
      }
    }
  }
  if (!nextImageId) {
    nextImageId = customs[0]?.imageId ?? null;
  }

  const stillHasImage =
    Boolean(nextImageId) ||
    Object.values(devices).some((d) => Boolean(d?.imageId));

  const background: ProfileBackground = stillHasImage
    ? {
        ...prevBg,
        imageId: nextImageId,
        position: { ...prevBg.position },
        devices,
      }
    : {
        kind: "pattern",
        patternId: "dots",
        imageId: null,
        dim: prevBg.dim,
        position: { ...prevBg.position },
        devices: {},
      };

  return {
    ...state,
    theme: {
      ...state.theme,
      background,
    },
    customs,
    card,
    avatarFrame,
    popover,
    shopSwitch,
  };
}

/**
 * Sinh biến gắn lên `.cins-journey-page[data-profile-theme]`.
 * Pattern / ảnh đứng yên qua ::before fixed — không set background-attachment.
 */
export function profileThemeCssVars(
  state: ProfileGiaoDienState,
): ProfileThemeCssVars {
  const hex = resolveAccentHex(state.theme);
  const bg = state.theme.background;
  const vars: ProfileThemeCssVars = {
    ["--j-accent"]: hex,
    ["--j-bg-dim"]: "0",
  };

  if (bg.kind === "pattern") {
    const pattern = PATTERN_BY_ID[bg.patternId] ?? PATTERN_BY_ID.none;
    if (pattern.image) {
      vars["--j-bg-image"] = pattern.image;
      vars["--j-bg-size"] = pattern.size ?? "auto";
      vars["--j-bg-position"] = pattern.position ?? "0 0";
      vars["--j-bg-position-sm"] = vars["--j-bg-position"];
      vars["--j-bg-position-md"] = vars["--j-bg-position"];
      vars["--j-bg-repeat"] = "repeat";
      vars["--j-bg-dim"] = String(overlayDimFromUi(bg.dim));
    }
  } else if (bg.kind === "image") {
    const phoneId = resolveDeviceImageId(bg, "phone");
    const tabletId = resolveDeviceImageId(bg, "tablet");
    const desktopId = resolveDeviceImageId(bg, "desktop");
    if (!phoneId && !tabletId && !desktopId) return vars;

    /* Nền full-bleed — luôn `public` (1920×1080). Không dùng gridsm (400px) — vỡ nét. */
    const phoneUrl = phoneId ? profileThemeImageUrl(phoneId, "public") : null;
    const tabletUrl = tabletId
      ? profileThemeImageUrl(tabletId, "public")
      : null;
    const desktopUrl = desktopId
      ? profileThemeImageUrl(desktopId, "public")
      : null;

    if (desktopUrl) vars["--j-bg-image"] = `url("${desktopUrl}")`;
    else if (tabletUrl) vars["--j-bg-image"] = `url("${tabletUrl}")`;
    else if (phoneUrl) vars["--j-bg-image"] = `url("${phoneUrl}")`;

    if (phoneUrl) vars["--j-bg-image-sm"] = `url("${phoneUrl}")`;
    else if (vars["--j-bg-image"]) {
      vars["--j-bg-image-sm"] = vars["--j-bg-image"];
    }

    if (tabletUrl) vars["--j-bg-image-md"] = `url("${tabletUrl}")`;
    else if (vars["--j-bg-image"]) {
      vars["--j-bg-image-md"] = vars["--j-bg-image"];
    }

    vars["--j-bg-size"] = "cover";
    vars["--j-bg-repeat"] = "no-repeat";
    vars["--j-bg-position"] = positionToCss(
      resolveDevicePosition(bg, "desktop"),
    );
    vars["--j-bg-position-sm"] = positionToCss(
      resolveDevicePosition(bg, "phone"),
    );
    vars["--j-bg-position-md"] = positionToCss(
      resolveDevicePosition(bg, "tablet"),
    );
    vars["--j-bg-dim"] = String(overlayDimFromUi(bg.dim));
  }

  return vars;
}

export function resolveAccentHex(theme: ProfileThemeSlice): string {
  if (theme.accent === "custom") {
    return normalizeAccentHex(theme.accentHex) ?? ACCENT_BY_ID.cins.hex;
  }
  return ACCENT_BY_ID[theme.accent]?.hex ?? ACCENT_BY_ID.cins.hex;
}

/** @deprecated Dùng resolveAccentHex(theme) — giữ alias cho preset. */
export function getAccentHex(
  id: ProfileAccentId,
  accentHex?: string | null,
): string {
  if (id === "custom") {
    return normalizeAccentHex(accentHex) ?? ACCENT_BY_ID.cins.hex;
  }
  return ACCENT_BY_ID[id]?.hex ?? ACCENT_BY_ID.cins.hex;
}

export function getPatternDef(id: ProfilePatternId): ProfilePatternDef {
  return PATTERN_BY_ID[id] ?? PATTERN_BY_ID.none;
}
