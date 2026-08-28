/**
 * Customize card user popover (`.j-user-popover` / `.j-friend-card`) —
 * SoT: user_nguoi_dung.giao_dien.popover
 * Plan: docs/PLAN_customize_user_card.md
 *
 * Theme-only: accent luôn inherit hồ sơ; nền gradient|image; cover mặc định ảnh bìa.
 * Cấu trúc card (avatar / stats / Feature) cố định hệ thống.
 */

import type { CSSProperties } from "react";

import {
  getPatternDef,
  isProfilePatternId,
  isProfilePresetAccentId,
  normalizeAccentHex,
  profileThemeImageUrl,
  resolveAccentHex,
  type ProfileAccentId,
  type ProfileBgPosition,
  type ProfileCustomEntry,
  type ProfilePatternId,
  type ProfileThemeSlice,
} from "@/lib/journey/profile-theme";

/* ── Local clamps — tránh TDZ với profile-theme (import ngược). ── */

const POP_DIM_MIN = 0.2;
const POP_DIM_MAX = 1;
const POP_DIM_DEFAULT = 0.35;

function clampPopDim(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return POP_DIM_DEFAULT;
  return Math.min(POP_DIM_MAX, Math.max(POP_DIM_MIN, raw));
}

function clampPopPos(raw: unknown, fallback = 0.5): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return fallback;
  return Math.min(1, Math.max(0, raw));
}

function parsePopPosition(raw: unknown): ProfileBgPosition {
  if (!raw || typeof raw !== "object") return { x: 0.5, y: 0.5 };
  const obj = raw as Record<string, unknown>;
  return { x: clampPopPos(obj.x), y: clampPopPos(obj.y) };
}

function popPositionToCss(pos: ProfileBgPosition): string {
  const x = Math.round(clampPopPos(pos.x) * 1000) / 10;
  const y = Math.round(clampPopPos(pos.y) * 1000) / 10;
  return `${x}% ${y}%`;
}

/* ── Enums / whitelist ───────────────────────────────────────────── */

export const POPOVER_ACCENT_MODES = [
  "inheritAccent",
  "custom",
  "none",
] as const;
export type PopoverAccentMode = (typeof POPOVER_ACCENT_MODES)[number];

export const POPOVER_PRESET_IDS = [
  "default",
  "gallery",
  "minimal",
  "studio",
] as const;
export type PopoverPresetId = (typeof POPOVER_PRESET_IDS)[number];

export const POPOVER_SURFACE_KINDS = ["gradient", "image"] as const;
export type PopoverSurfaceKind = (typeof POPOVER_SURFACE_KINDS)[number];

/** Legacy `plain` | `tint` → normalize thành `gradient`. */
export type PopoverSurfaceKindStored = PopoverSurfaceKind;

export const POPOVER_COVER_KINDS = ["profile", "pattern", "solid"] as const;
export type PopoverCoverKind = (typeof POPOVER_COVER_KINDS)[number];

/** Parser chấp nhận `image` (A2). */
export type PopoverCoverKindStored = PopoverCoverKind | "image";

export const POPOVER_BIO_MODES = ["clamp2", "clamp4", "hidden"] as const;
export type PopoverBioMode = (typeof POPOVER_BIO_MODES)[number];

export const POPOVER_STAT_IDS = [
  "feature",
  "gallery",
  "banBe",
  "follow",
  "verifiedOrg",
] as const;
export type PopoverStatId = (typeof POPOVER_STAT_IDS)[number];

export const POPOVER_STAT_LABELS: Record<PopoverStatId, string> = {
  feature: "Feature",
  gallery: "Gallery",
  banBe: "Bạn bè",
  follow: "Theo dõi",
  verifiedOrg: "Tổ chức",
};

export const POPOVER_CTA_KINDS = [
  "shop",
  "gallery",
  "journey",
  "congDong",
] as const;
export type PopoverCtaKind = (typeof POPOVER_CTA_KINDS)[number];

export const POPOVER_CTA_LABELS: Record<PopoverCtaKind, string> = {
  shop: "Shop của tôi",
  gallery: "Gallery",
  journey: "Journey",
  congDong: "Cộng đồng",
};

export const POPOVER_FEATURED_LAYOUTS = ["masonry", "grid"] as const;
export type PopoverFeaturedLayout = (typeof POPOVER_FEATURED_LAYOUTS)[number];

export const POPOVER_FEATURED_COLS = [2, 3, 4] as const;
export type PopoverFeaturedCols = (typeof POPOVER_FEATURED_COLS)[number];

export const POPOVER_FEATURED_LIMITS = [6, 9, 12, 0] as const;
export type PopoverFeaturedLimit = (typeof POPOVER_FEATURED_LIMITS)[number];

export const POPOVER_ACTION_PRIMARY = [
  "message",
  "follow",
  "friend",
  "journey",
] as const;
export type PopoverActionPrimary = (typeof POPOVER_ACTION_PRIMARY)[number];

/* ── Types ───────────────────────────────────────────────────────── */

export type ProfilePopoverThemeSlice = {
  enabled: boolean;
  preset: PopoverPresetId;
  mode: PopoverAccentMode;
  accent: ProfileAccentId;
  accentHex: string | null;
  surface: {
    kind: PopoverSurfaceKindStored;
    dim: number;
    /** A2 — Phase A1 luôn null. */
    imageId: string | null;
  };
  cover: {
    kind: PopoverCoverKindStored;
    patternId: ProfilePatternId;
    imageId: string | null;
    position: ProfileBgPosition;
    dim: number;
  };
  info: {
    bio: PopoverBioMode;
    /** C1: luôn true; giữ key forward-compatible. */
    meta: true;
  };
  stats: [PopoverStatId, PopoverStatId, PopoverStatId];
  actions: {
    primary: PopoverActionPrimary;
    cta: PopoverCtaKind | null;
  };
  featured: {
    layout: PopoverFeaturedLayout;
    cols: PopoverFeaturedCols;
    limit: PopoverFeaturedLimit;
    defaultOpen: boolean;
    autoplayVideo: boolean;
  };
};

/** DTO public gắn lên `/api/users/preview` — không gửi customs/wallpaper. */
export type UserPopoverThemeDto = {
  accentHex: string | null;
  surface: {
    kind: "gradient" | "image";
    dim: number;
    imageUrl: string | null;
  };
  cover: {
    kind: "profile" | "pattern" | "solid";
    patternId: ProfilePatternId | null;
    patternImage: string | null;
    patternSize: string | null;
    patternPosition: string | null;
    dim: number;
  };
  info: { bio: PopoverBioMode };
  stats: [PopoverStatId, PopoverStatId, PopoverStatId];
  actions: {
    primary: PopoverActionPrimary;
    cta: { kind: PopoverCtaKind; href: string; label: string } | null;
  };
  featured: {
    layout: PopoverFeaturedLayout;
    cols: PopoverFeaturedCols;
    limit: PopoverFeaturedLimit;
    defaultOpen: boolean;
    autoplayVideo: boolean;
  };
};

export const DEFAULT_POPOVER_STATS: [
  PopoverStatId,
  PopoverStatId,
  PopoverStatId,
] = ["feature", "gallery", "banBe"];

export const DEFAULT_POPOVER_THEME: ProfilePopoverThemeSlice = {
  enabled: false,
  preset: "default",
  /** Luôn theo accent hồ sơ — không mở UI chọn màu riêng. */
  mode: "inheritAccent",
  accent: "cins",
  accentHex: null,
  surface: { kind: "gradient", dim: POP_DIM_DEFAULT, imageId: null },
  cover: {
    kind: "profile",
    patternId: "dots",
    imageId: null,
    position: { x: 0.5, y: 0.5 },
    dim: POP_DIM_DEFAULT,
  },
  info: { bio: "clamp2", meta: true },
  stats: [...DEFAULT_POPOVER_STATS],
  actions: { primary: "message", cta: null },
  featured: {
    layout: "masonry",
    cols: 3,
    limit: 9,
    defaultOpen: true,
    autoplayVideo: false,
  },
};

/* ── Guards ──────────────────────────────────────────────────────── */

export function isPopoverAccentMode(
  value: unknown,
): value is PopoverAccentMode {
  return (
    typeof value === "string" &&
    (POPOVER_ACCENT_MODES as readonly string[]).includes(value)
  );
}

export function isPopoverPresetId(value: unknown): value is PopoverPresetId {
  return (
    typeof value === "string" &&
    (POPOVER_PRESET_IDS as readonly string[]).includes(value)
  );
}

export function isPopoverStatId(value: unknown): value is PopoverStatId {
  return (
    typeof value === "string" &&
    (POPOVER_STAT_IDS as readonly string[]).includes(value)
  );
}

export function isPopoverCtaKind(value: unknown): value is PopoverCtaKind {
  return (
    typeof value === "string" &&
    (POPOVER_CTA_KINDS as readonly string[]).includes(value)
  );
}

export function isPopoverFeaturedLayout(
  value: unknown,
): value is PopoverFeaturedLayout {
  return (
    typeof value === "string" &&
    (POPOVER_FEATURED_LAYOUTS as readonly string[]).includes(value)
  );
}

export function isPopoverActionPrimary(
  value: unknown,
): value is PopoverActionPrimary {
  return (
    typeof value === "string" &&
    (POPOVER_ACTION_PRIMARY as readonly string[]).includes(value)
  );
}

function parseStats(raw: unknown): [PopoverStatId, PopoverStatId, PopoverStatId] {
  if (!Array.isArray(raw) || raw.length !== 3) {
    return [...DEFAULT_POPOVER_STATS];
  }
  const ids = raw.filter(isPopoverStatId);
  if (ids.length !== 3) return [...DEFAULT_POPOVER_STATS];
  if (new Set(ids).size !== 3) return [...DEFAULT_POPOVER_STATS];
  return [ids[0], ids[1], ids[2]];
}

function parseFeaturedCols(raw: unknown): PopoverFeaturedCols {
  if (raw === 2 || raw === 3 || raw === 4) return raw;
  return 3;
}

function parseFeaturedLimit(raw: unknown): PopoverFeaturedLimit {
  if (raw === 6 || raw === 9 || raw === 12 || raw === 0) return raw;
  return 9;
}

/* ── Presets ─────────────────────────────────────────────────────── */

type PopoverPresetPartial = {
  mode?: PopoverAccentMode;
  accent?: ProfileAccentId;
  accentHex?: string | null;
  surface?: Partial<ProfilePopoverThemeSlice["surface"]>;
  cover?: Partial<ProfilePopoverThemeSlice["cover"]>;
};

/** Chỉ theme — cấu trúc card (avatar / stats / Feature) luôn cố định hệ thống. */
const POPOVER_PRESET_DEFS: Record<PopoverPresetId, PopoverPresetPartial> = {
  default: {
    mode: "inheritAccent",
    surface: { kind: "gradient", dim: POP_DIM_DEFAULT, imageId: null },
    cover: { kind: "profile" },
  },
  gallery: {
    mode: "inheritAccent",
    surface: { kind: "gradient", dim: 0.4, imageId: null },
    cover: { kind: "profile" },
  },
  minimal: {
    mode: "inheritAccent",
    surface: { kind: "gradient", dim: 0.25, imageId: null },
    cover: { kind: "profile" },
  },
  studio: {
    mode: "inheritAccent",
    surface: { kind: "gradient", dim: 0.55, imageId: null },
    cover: { kind: "profile" },
  },
};

export const POPOVER_PRESET_LABELS: Record<PopoverPresetId, string> = {
  default: "Mặc định CINS",
  gallery: "Gallery",
  minimal: "Tối giản",
  studio: "Studio",
};

/** Ép cấu trúc cố định — cover+avatar+stats+Feature luôn đủ theo hệ. */
export function withFixedPopoverStructure(
  pop: ProfilePopoverThemeSlice,
): ProfilePopoverThemeSlice {
  return {
    ...pop,
    mode: "inheritAccent",
    accent: "cins",
    accentHex: null,
    info: { ...DEFAULT_POPOVER_THEME.info },
    stats: [...DEFAULT_POPOVER_THEME.stats],
    actions: { ...DEFAULT_POPOVER_THEME.actions },
    featured: { ...DEFAULT_POPOVER_THEME.featured },
  };
}

/** Áp preset theme — bật enabled; luôn inherit accent hồ sơ + cover ảnh bìa mặc định. */
export function applyPopoverPreset(
  prev: ProfilePopoverThemeSlice,
  preset: PopoverPresetId,
): ProfilePopoverThemeSlice {
  const def = POPOVER_PRESET_DEFS[preset] ?? POPOVER_PRESET_DEFS.default;
  const surfaceKind: PopoverSurfaceKind =
    def.surface?.kind === "image" ? "image" : "gradient";
  return withFixedPopoverStructure({
    ...DEFAULT_POPOVER_THEME,
    enabled: true,
    preset,
    mode: "inheritAccent",
    accent: "cins",
    accentHex: null,
    surface: {
      kind: surfaceKind,
      dim: clampPopDim(def.surface?.dim ?? DEFAULT_POPOVER_THEME.surface.dim),
      imageId:
        surfaceKind === "image"
          ? (def.surface?.imageId ?? prev.surface.imageId)
          : null,
    },
    cover: {
      ...DEFAULT_POPOVER_THEME.cover,
      kind: "profile",
      imageId: null,
      position: { ...DEFAULT_POPOVER_THEME.cover.position },
      patternId: DEFAULT_POPOVER_THEME.cover.patternId,
      dim: DEFAULT_POPOVER_THEME.cover.dim,
    },
  });
}

/* ── Parse / serialize ───────────────────────────────────────────── */

export function parsePopoverTheme(
  raw: unknown,
  customs?: ProfileCustomEntry[] | null,
): ProfilePopoverThemeSlice {
  if (!raw || typeof raw !== "object") {
    return clonePopoverDefault();
  }
  const obj = raw as Record<string, unknown>;

  const enabled = obj.enabled === true || obj.enabled === "true";
  const preset: PopoverPresetId = isPopoverPresetId(obj.preset)
    ? obj.preset
    : "default";
  const mode: PopoverAccentMode = isPopoverAccentMode(obj.mode)
    ? obj.mode
    : DEFAULT_POPOVER_THEME.mode;

  let accent: ProfileAccentId = DEFAULT_POPOVER_THEME.accent;
  let accentHex: string | null = null;
  if (obj.accent === "custom") {
    const hex = normalizeAccentHex(obj.accentHex);
    if (hex) {
      accent = "custom";
      accentHex = hex;
    }
  } else if (isProfilePresetAccentId(obj.accent)) {
    accent = obj.accent;
  }

  const surfaceRaw =
    obj.surface && typeof obj.surface === "object"
      ? (obj.surface as Record<string, unknown>)
      : {};
  let surfaceKind: PopoverSurfaceKind = "gradient";
  if (surfaceRaw.kind === "image") {
    surfaceKind = "image";
  } else if (
    surfaceRaw.kind === "gradient" ||
    surfaceRaw.kind === "plain" ||
    surfaceRaw.kind === "tint"
  ) {
    /* Legacy plain/tint → gradient. */
    surfaceKind = "gradient";
  }

  let surfaceImageId: string | null = null;
  if (typeof surfaceRaw.imageId === "string" && surfaceRaw.imageId.trim()) {
    const id = surfaceRaw.imageId.trim();
    if (customs && customs.length > 0) {
      surfaceImageId = customs.some((c) => c.imageId === id) ? id : null;
    } else {
      surfaceImageId = id;
    }
  }
  if (surfaceKind !== "image") surfaceImageId = null;

  const coverRaw =
    obj.cover && typeof obj.cover === "object"
      ? (obj.cover as Record<string, unknown>)
      : {};
  let coverKind: PopoverCoverKindStored = "profile";
  if (
    coverRaw.kind === "profile" ||
    coverRaw.kind === "pattern" ||
    coverRaw.kind === "solid"
  ) {
    coverKind = coverRaw.kind;
  } else if (coverRaw.kind === "image") {
    coverKind = "pattern";
  }

  const patternId: ProfilePatternId = isProfilePatternId(coverRaw.patternId)
    ? coverRaw.patternId
    : "dots";

  let coverImageId: string | null = null;
  if (typeof coverRaw.imageId === "string" && coverRaw.imageId.trim()) {
    const id = coverRaw.imageId.trim();
    if (customs && customs.length > 0) {
      coverImageId = customs.some((c) => c.imageId === id) ? id : null;
    } else {
      coverImageId = id;
    }
  }

  const infoRaw =
    obj.info && typeof obj.info === "object"
      ? (obj.info as Record<string, unknown>)
      : {};
  const bio: PopoverBioMode =
    infoRaw.bio === "clamp2" ||
    infoRaw.bio === "clamp4" ||
    infoRaw.bio === "hidden"
      ? infoRaw.bio
      : "clamp2";

  const actionsRaw =
    obj.actions && typeof obj.actions === "object"
      ? (obj.actions as Record<string, unknown>)
      : {};
  const primary: PopoverActionPrimary = isPopoverActionPrimary(
    actionsRaw.primary,
  )
    ? actionsRaw.primary
    : "message";
  const cta: PopoverCtaKind | null = isPopoverCtaKind(actionsRaw.cta)
    ? actionsRaw.cta
    : null;

  const featuredRaw =
    obj.featured && typeof obj.featured === "object"
      ? (obj.featured as Record<string, unknown>)
      : {};
  const layout: PopoverFeaturedLayout = isPopoverFeaturedLayout(
    featuredRaw.layout,
  )
    ? featuredRaw.layout
    : "masonry";

  return withFixedPopoverStructure({
    enabled,
    preset,
    mode,
    accent,
    accentHex,
    surface: {
      kind: surfaceKind,
      dim: clampPopDim(surfaceRaw.dim),
      imageId: surfaceImageId,
    },
    cover: {
      kind: coverKind,
      patternId,
      imageId: coverImageId,
      position: parsePopPosition(coverRaw.position),
      dim: clampPopDim(coverRaw.dim),
    },
    info: { bio, meta: true },
    stats: parseStats(obj.stats),
    actions: { primary, cta },
    featured: {
      layout,
      cols: parseFeaturedCols(featuredRaw.cols),
      limit: parseFeaturedLimit(featuredRaw.limit),
      defaultOpen:
        featuredRaw.defaultOpen === undefined
          ? true
          : featuredRaw.defaultOpen === true ||
            featuredRaw.defaultOpen === "true",
      autoplayVideo: featuredRaw.autoplayVideo === true,
    },
  });
}

function clonePopoverDefault(): ProfilePopoverThemeSlice {
  return {
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
  };
}

export function serializePopoverTheme(
  pop: ProfilePopoverThemeSlice,
): Record<string, unknown> {
  const fixed = withFixedPopoverStructure(pop);
  return {
    v: 1,
    enabled: fixed.enabled === true,
    preset: fixed.preset,
    mode: fixed.mode,
    accent:
      fixed.mode === "custom"
        ? fixed.accent === "custom"
          ? "custom"
          : fixed.accent
        : null,
    accentHex:
      fixed.mode === "custom" && fixed.accent === "custom"
        ? fixed.accentHex
        : null,
    surface: {
      kind: fixed.surface.kind === "image" ? "image" : "gradient",
      dim: clampPopDim(fixed.surface.dim),
      imageId: fixed.surface.kind === "image" ? fixed.surface.imageId : null,
    },
    cover: {
      kind:
        fixed.cover.kind === "pattern" || fixed.cover.kind === "solid"
          ? fixed.cover.kind
          : "profile",
      patternId: fixed.cover.patternId,
      dim: clampPopDim(fixed.cover.dim),
      position: {
        x: fixed.cover.position.x,
        y: fixed.cover.position.y,
      },
    },
    /* Cấu trúc cố định — ghi để forward-compat, client không được đổi. */
    info: { bio: "clamp2", meta: true },
    stats: [...DEFAULT_POPOVER_STATS],
    actions: { primary: "message", cta: null },
    featured: {
      layout: "masonry",
      cols: 3,
      limit: 9,
      defaultOpen: true,
      autoplayVideo: false,
    },
  };
}

/* ── PATCH ───────────────────────────────────────────────────────── */

export type PopoverThemePatchInput = {
  enabled?: boolean;
  preset?: PopoverPresetId;
  surface?: {
    kind?: PopoverSurfaceKind;
    dim?: number;
    imageId?: string | null;
  };
  cover?: {
    kind?: PopoverCoverKind;
    patternId?: ProfilePatternId;
    dim?: number;
  };
};

export type ValidatePopoverPatchResult =
  | { ok: true; patch: PopoverThemePatchInput }
  | { ok: false; error: string };

export function validatePopoverPatchBody(
  raw: unknown,
): ValidatePopoverPatchResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "popover phải là object." };
  }
  const obj = raw as Record<string, unknown>;
  const patch: PopoverThemePatchInput = {};

  if ("enabled" in obj) {
    if (typeof obj.enabled !== "boolean") {
      return { ok: false, error: "popover.enabled phải là boolean." };
    }
    patch.enabled = obj.enabled;
  }
  if ("preset" in obj) {
    if (!isPopoverPresetId(obj.preset)) {
      return { ok: false, error: "popover.preset không hợp lệ." };
    }
    patch.preset = obj.preset;
  }
  /* mode / accent — luôn inheritAccent; bỏ qua nếu client gửi. */

  if ("surface" in obj) {
    if (!obj.surface || typeof obj.surface !== "object") {
      return { ok: false, error: "popover.surface không hợp lệ." };
    }
    const s = obj.surface as Record<string, unknown>;
    const surface: NonNullable<PopoverThemePatchInput["surface"]> = {};
    if ("kind" in s) {
      if (s.kind !== "gradient" && s.kind !== "image") {
        return { ok: false, error: "popover.surface.kind không hợp lệ." };
      }
      surface.kind = s.kind;
    }
    if ("dim" in s) {
      if (typeof s.dim !== "number" || !Number.isFinite(s.dim)) {
        return { ok: false, error: "popover.surface.dim không hợp lệ." };
      }
      surface.dim = clampPopDim(s.dim);
    }
    if ("imageId" in s) {
      if (s.imageId != null && typeof s.imageId !== "string") {
        return { ok: false, error: "popover.surface.imageId không hợp lệ." };
      }
      surface.imageId =
        typeof s.imageId === "string" && s.imageId.trim()
          ? s.imageId.trim()
          : null;
    }
    patch.surface = surface;
  }

  if ("cover" in obj) {
    if (!obj.cover || typeof obj.cover !== "object") {
      return { ok: false, error: "popover.cover không hợp lệ." };
    }
    const c = obj.cover as Record<string, unknown>;
    const cover: NonNullable<PopoverThemePatchInput["cover"]> = {};
    if ("kind" in c) {
      if (c.kind !== "profile" && c.kind !== "pattern" && c.kind !== "solid") {
        return { ok: false, error: "popover.cover.kind không hợp lệ." };
      }
      cover.kind = c.kind;
    }
    if ("patternId" in c) {
      if (!isProfilePatternId(c.patternId)) {
        return { ok: false, error: "popover.cover.patternId không hợp lệ." };
      }
      cover.patternId = c.patternId;
    }
    if ("dim" in c) {
      if (typeof c.dim !== "number" || !Number.isFinite(c.dim)) {
        return { ok: false, error: "popover.cover.dim không hợp lệ." };
      }
      cover.dim = clampPopDim(c.dim);
    }
    patch.cover = cover;
  }

  /* info / stats / actions / featured — cố định hệ thống, bỏ qua nếu client gửi. */

  if (
    patch.enabled === undefined &&
    !patch.preset &&
    !patch.surface &&
    !patch.cover
  ) {
    return { ok: false, error: "popover thiếu field hợp lệ." };
  }

  return { ok: true, patch };
}

export function applyPopoverPatch(
  prev: ProfilePopoverThemeSlice,
  patch: PopoverThemePatchInput,
  customs?: ProfileCustomEntry[] | null,
): ProfilePopoverThemeSlice {
  let next = { ...prev };

  if (patch.preset !== undefined) {
    next = applyPopoverPreset(prev, patch.preset);
  }

  if (patch.enabled !== undefined) next.enabled = patch.enabled;

  if (patch.surface) {
    let kind: PopoverSurfaceKind =
      patch.surface.kind ??
      (next.surface.kind === "image" ? "image" : "gradient");
    if (kind !== "gradient" && kind !== "image") kind = "gradient";

    let imageId =
      patch.surface.imageId !== undefined
        ? patch.surface.imageId
        : next.surface.imageId;
    if (kind === "image") {
      if (imageId && customs && customs.length > 0) {
        const allowed = new Set(customs.map((c) => c.imageId));
        if (!allowed.has(imageId)) imageId = null;
      }
      if (!imageId) kind = "gradient";
    } else {
      imageId = null;
    }

    next.surface = {
      kind,
      dim:
        patch.surface.dim !== undefined
          ? clampPopDim(patch.surface.dim)
          : next.surface.dim,
      imageId,
    };
  }

  if (patch.cover) {
    next.cover = {
      ...next.cover,
      kind: patch.cover.kind ?? next.cover.kind,
      patternId: patch.cover.patternId ?? next.cover.patternId,
      dim:
        patch.cover.dim !== undefined
          ? clampPopDim(patch.cover.dim)
          : next.cover.dim,
      imageId: null,
      position: { ...next.cover.position },
    };
    if (next.cover.kind === "image") next.cover.kind = "pattern";
    if (next.cover.kind === "pattern" && next.cover.patternId === "none") {
      next.cover.patternId = "dots";
    }
  }

  if (patch.preset === undefined && Object.keys(patch).length > 0) {
    next.preset = "default";
  }

  return withFixedPopoverStructure(next);
}

export function popoversEqual(
  a: ProfilePopoverThemeSlice,
  b: ProfilePopoverThemeSlice,
): boolean {
  return (
    a.enabled === b.enabled &&
    a.preset === b.preset &&
    a.surface.kind === b.surface.kind &&
    a.surface.dim === b.surface.dim &&
    a.surface.imageId === b.surface.imageId &&
    a.cover.kind === b.cover.kind &&
    a.cover.patternId === b.cover.patternId &&
    a.cover.dim === b.cover.dim
  );
}

/* ── Resolve DTO / CSS ───────────────────────────────────────────── */

export function resolvePopoverCtaHref(
  kind: PopoverCtaKind,
  slug: string,
): string {
  const s = slug.trim();
  if (!s) return "/";
  switch (kind) {
    case "shop":
      return `/${encodeURIComponent(s)}/shop`;
    case "gallery":
      return `/${encodeURIComponent(s)}?view=gallery`;
    case "journey":
      return `/${encodeURIComponent(s)}`;
    case "congDong":
      return `/cong-dong`;
    default:
      return `/${encodeURIComponent(s)}`;
  }
}

export function resolvePopoverThemeDto(
  pop: ProfilePopoverThemeSlice,
  theme: ProfileThemeSlice,
  slug: string,
): UserPopoverThemeDto | null {
  if (!pop.enabled) return null;

  /* Luôn inherit accent hồ sơ. */
  const accentHex = resolveAccentHex(theme);

  const coverKind: "profile" | "pattern" | "solid" =
    pop.cover.kind === "pattern" || pop.cover.kind === "solid"
      ? pop.cover.kind
      : "profile";

  let patternImage: string | null = null;
  let patternSize: string | null = null;
  let patternPosition: string | null = null;
  let patternId: ProfilePatternId | null = null;
  if (coverKind === "pattern") {
    patternId = pop.cover.patternId === "none" ? "dots" : pop.cover.patternId;
    const def = getPatternDef(patternId);
    patternImage = def.image;
    patternSize = def.size;
    patternPosition = def.position;
  }

  let surfaceKind: "gradient" | "image" =
    pop.surface.kind === "image" ? "image" : "gradient";
  let surfaceImageUrl: string | null = null;
  if (surfaceKind === "image" && pop.surface.imageId) {
    surfaceImageUrl = profileThemeImageUrl(pop.surface.imageId, "public");
    if (!surfaceImageUrl) surfaceKind = "gradient";
  } else if (surfaceKind === "image") {
    surfaceKind = "gradient";
  }

  /* Cấu trúc luôn cố định — cover / avatar / Feature masonry 3 cột, mở sẵn. */
  return {
    accentHex,
    surface: {
      kind: surfaceKind,
      dim: clampPopDim(pop.surface.dim),
      imageUrl: surfaceKind === "image" ? surfaceImageUrl : null,
    },
    cover: {
      kind: coverKind,
      patternId,
      patternImage,
      patternSize,
      patternPosition,
      dim: clampPopDim(pop.cover.dim),
    },
    info: { bio: "clamp2" },
    stats: [...DEFAULT_POPOVER_STATS],
    actions: { primary: "message", cta: null },
    featured: {
      layout: "masonry",
      cols: 3,
      limit: 9,
      defaultOpen: true,
      autoplayVideo: false,
    },
  };
}

/** Parse raw giao_dien → DTO (preview API). */
export function popoverThemeDtoFromGiaoDien(
  giaoDienRaw: unknown,
  slug: string,
): UserPopoverThemeDto | null {
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
    : [];
  const pop = parsePopoverTheme(obj.popover, customsRaw);

  const themeRaw =
    obj.theme && typeof obj.theme === "object"
      ? (obj.theme as Record<string, unknown>)
      : {};
  let accent: ProfileAccentId = "cins";
  let accentHex: string | null = null;
  if (themeRaw.accent === "custom") {
    const hex = normalizeAccentHex(themeRaw.accentHex);
    if (hex) {
      accent = "custom";
      accentHex = hex;
    }
  } else if (isProfilePresetAccentId(themeRaw.accent)) {
    accent = themeRaw.accent;
  }
  const themeSlice: ProfileThemeSlice = {
    accent,
    accentHex,
    applyToHome: themeRaw.applyToHome === true,
    background: {
      kind: "none",
      patternId: "none",
      imageId: null,
      dim: POP_DIM_DEFAULT,
      position: { x: 0.5, y: 0.5 },
      devices: {},
    },
  };

  return resolvePopoverThemeDto(pop, themeSlice, slug);
}

export type PopoverThemeCssVars = CSSProperties & {
  ["--j-pop-accent"]?: string;
  ["--j-pop-surface-dim"]?: string;
  ["--j-pop-surface-image"]?: string;
  ["--j-pop-cover-image"]?: string;
  ["--j-pop-cover-size"]?: string;
  ["--j-pop-cover-pos"]?: string;
  ["--j-pop-cover-dim"]?: string;
  ["--j-pop-featured-cols"]?: string;
};

export function popoverThemeStyle(
  dto: UserPopoverThemeDto | null | undefined,
): PopoverThemeCssVars | undefined {
  if (!dto) return undefined;
  const vars: PopoverThemeCssVars = {
    ["--j-pop-surface-dim"]: String(dto.surface.dim),
    ["--j-pop-cover-dim"]: String(dto.cover.dim),
    ["--j-pop-featured-cols"]: String(dto.featured.cols),
  };
  if (dto.accentHex) {
    vars["--j-pop-accent"] = dto.accentHex;
  }
  if (dto.surface.kind === "image" && dto.surface.imageUrl) {
    vars["--j-pop-surface-image"] = `url("${dto.surface.imageUrl}")`;
  }
  if (dto.cover.kind === "pattern" && dto.cover.patternImage) {
    vars["--j-pop-cover-image"] = dto.cover.patternImage;
    if (dto.cover.patternSize) {
      vars["--j-pop-cover-size"] = dto.cover.patternSize;
    }
    if (dto.cover.patternPosition) {
      vars["--j-pop-cover-pos"] = dto.cover.patternPosition;
    }
  }
  return vars;
}

export function resolveStatValue(
  id: PopoverStatId,
  stats: {
    cotMoc?: number;
    tacPham?: number;
    banBe?: number;
    theoDoi?: number;
    toChucXacThuc?: number;
  },
): number {
  switch (id) {
    case "feature":
      return stats.tacPham ?? 0;
    case "gallery":
      return stats.cotMoc ?? 0;
    case "banBe":
      return stats.banBe ?? 0;
    case "follow":
      return stats.theoDoi ?? 0;
    case "verifiedOrg":
      return stats.toChucXacThuc ?? 0;
    default:
      return 0;
  }
}
