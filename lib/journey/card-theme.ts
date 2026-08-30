/**
 * Customize thanh bài (`.jcard-datebar`) — SoT: user_nguoi_dung.giao_dien.card
 * Plan: docs/PLAN_customize_post_card.md (A1·B1·C1+guest World·D1)
 *
 * Nền đặc + độ đậm (`dim`) · ảnh tùy chọn từ `giao_dien.customs` (cùng pool Theme).
 * Public branding theo tác giả — World feed hiện style của từng author.
 */

import type { CSSProperties } from "react";

import { getCfAccountHash } from "@/lib/cloudflare/account-hash";
import {
  getPatternDef,
  isProfileAccentId,
  isProfilePatternId,
  isProfilePresetAccentId,
  normalizeAccentHex,
  resolveAccentHex,
  type ProfileAccentId,
  type ProfileBgPosition,
  type ProfileCustomEntry,
  type ProfilePatternId,
  type ProfileThemeSlice,
} from "@/lib/journey/profile-theme";

/* ── Local clamps — tránh import runtime clamp* từ profile-theme
 * (profile-theme import ngược file này → TDZ khi DEFAULT dùng binding sống). */

const CARD_DIM_MIN = 0.2;
const CARD_DIM_MAX = 1;
const CARD_DIM_DEFAULT = 0.35;

export const CARD_IMAGE_SCALE_MIN = 0.5;
export const CARD_IMAGE_SCALE_MAX = 3;
export const CARD_IMAGE_SCALE_DEFAULT = 1;
export const CARD_IMAGE_ROTATE_MIN = -180;
export const CARD_IMAGE_ROTATE_MAX = 180;
export const CARD_IMAGE_ROTATE_DEFAULT = 0;

function clampCardDim(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return CARD_DIM_DEFAULT;
  return Math.min(CARD_DIM_MAX, Math.max(CARD_DIM_MIN, raw));
}

export const CARD_IMAGE_POS_MIN = -1;
export const CARD_IMAGE_POS_MAX = 2;

function clampCardPos(raw: unknown, fallback = 0.5): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return fallback;
  return Math.min(CARD_IMAGE_POS_MAX, Math.max(CARD_IMAGE_POS_MIN, raw));
}

export function clampCardImagePos(
  raw: unknown,
  fallback = 0.5,
): number {
  return clampCardPos(raw, fallback);
}

export function clampCardImageScale(
  raw: unknown,
  fallback = CARD_IMAGE_SCALE_DEFAULT,
): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return fallback;
  return Math.min(CARD_IMAGE_SCALE_MAX, Math.max(CARD_IMAGE_SCALE_MIN, raw));
}

export function clampCardImageRotate(
  raw: unknown,
  fallback = CARD_IMAGE_ROTATE_DEFAULT,
): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return fallback;
  return Math.min(CARD_IMAGE_ROTATE_MAX, Math.max(CARD_IMAGE_ROTATE_MIN, raw));
}

function parseCardPosition(raw: unknown): ProfileBgPosition {
  if (!raw || typeof raw !== "object") return { x: 0.5, y: 0.5 };
  const obj = raw as Record<string, unknown>;
  return { x: clampCardPos(obj.x), y: clampCardPos(obj.y) };
}

function cardPositionToCss(pos: ProfileBgPosition): string {
  const x = Math.round(clampCardPos(pos.x) * 1000) / 10;
  const y = Math.round(clampCardPos(pos.y) * 1000) / 10;
  return `${x}% ${y}%`;
}

function resolveCardPatternId(
  card: ProfileCardThemeSlice,
  imageUrl: string | null,
): ProfilePatternId {
  if (imageUrl) return "none";
  if (card.mode !== "custom") return "none";
  return isProfilePatternId(card.patternId) ? card.patternId : "none";
}

/** Slider độ đậm → CSS overlay (đảo: 100% nền → phủ 0). */
function cardOverlayFromDim(dim: number): number {
  const d = clampCardDim(dim);
  return Math.min(1, Math.max(0, 1 - d));
}

function cardImageUrl(
  imageId: string,
  variant: "gridsm" | "feedsm" | "public" = "feedsm",
): string | null {
  const id = imageId.trim();
  if (!id) return null;
  const hash = getCfAccountHash();
  if (!hash) return null;
  return `https://imagedelivery.net/${hash}/${id}/${variant}`;
}

export const CARD_ACCENT_MODES = ["inheritAccent", "custom", "none"] as const;
export type CardAccentMode = (typeof CARD_ACCENT_MODES)[number];

export type ProfileCardThemeSlice = {
  enabled: boolean;
  mode: CardAccentMode;
  /** Chỉ dùng khi mode = custom. */
  accent: ProfileAccentId;
  accentHex: string | null;
  /** Độ đậm nền đặc / ảnh — cùng thang Theme (0.2–1). */
  dim: number;
  /** CF Images id trong `customs`; null = chỉ nền màu. */
  imageId: string | null;
  /** Trọng tâm crop ảnh trên datebar — −1…2 (0.5 = giữa; ngoài 0–1 để kéo góc). */
  position: ProfileBgPosition;
  /** Phóng ảnh quanh điểm neo — 0.5–3 (1 = cover). */
  scale: number;
  /** Xoay ảnh quanh điểm neo — độ, −180…180. */
  rotate: number;
  /** Họa tiết CSS (cùng catalog Theme). Chỉ áp khi mode = custom và không có ảnh. */
  patternId: ProfilePatternId;
};

/** DTO gắn lên milestone / datebar — hex + dim + URL ảnh đã resolve. */
export type AuthorCardThemeDto = {
  /** null = không tint màu (mode none), vẫn có thể có ảnh. */
  accentHex: string | null;
  dim: number;
  imageUrl: string | null;
  position: ProfileBgPosition;
  scale: number;
  rotate: number;
  /** `none` = không họa tiết. */
  patternId: ProfilePatternId;
};

export const DEFAULT_CARD_THEME: ProfileCardThemeSlice = {
  enabled: false,
  mode: "inheritAccent",
  accent: "cins",
  accentHex: null,
  dim: CARD_DIM_DEFAULT,
  imageId: null,
  position: { x: 0.5, y: 0.5 },
  scale: CARD_IMAGE_SCALE_DEFAULT,
  rotate: CARD_IMAGE_ROTATE_DEFAULT,
  patternId: "none",
};

export function isCardAccentMode(value: unknown): value is CardAccentMode {
  return (
    typeof value === "string" &&
    (CARD_ACCENT_MODES as readonly string[]).includes(value)
  );
}

/** Tolerant parse — thiếu / hỏng → default (enabled: false). Bỏ qua `barStyle` cũ. */
export function parseCardTheme(
  raw: unknown,
  customs?: ProfileCustomEntry[] | null,
): ProfileCardThemeSlice {
  if (!raw || typeof raw !== "object") {
    return {
      ...DEFAULT_CARD_THEME,
      position: { ...DEFAULT_CARD_THEME.position },
    };
  }
  const obj = raw as Record<string, unknown>;

  const enabled = obj.enabled === true || obj.enabled === "true";
  const mode: CardAccentMode = isCardAccentMode(obj.mode)
    ? obj.mode
    : DEFAULT_CARD_THEME.mode;
  const dim = clampCardDim(
    typeof obj.dim === "number" ? obj.dim : DEFAULT_CARD_THEME.dim,
  );

  let imageId: string | null = null;
  if (typeof obj.imageId === "string" && obj.imageId.trim()) {
    const id = obj.imageId.trim();
    if (customs && customs.length > 0) {
      const allowed = new Set(customs.map((c) => c.imageId));
      imageId = allowed.has(id) ? id : null;
    } else {
      imageId = id;
    }
  }

  let accent: ProfileAccentId = DEFAULT_CARD_THEME.accent;
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

  return {
    enabled,
    mode,
    accent,
    accentHex,
    dim,
    imageId,
    position: parseCardPosition(obj.position),
    scale: clampCardImageScale(obj.scale),
    rotate: clampCardImageRotate(obj.rotate),
    patternId: isProfilePatternId(obj.patternId) ? obj.patternId : "none",
  };
}

export function serializeCardTheme(
  card: ProfileCardThemeSlice,
): Record<string, unknown> | undefined {
  const position = parseCardPosition(card.position);
  const scale = clampCardImageScale(card.scale);
  const rotate = clampCardImageRotate(card.rotate);
  return {
    v: 1,
    enabled: card.enabled === true,
    mode: card.mode,
    accent:
      card.mode === "custom"
        ? card.accent === "custom"
          ? "custom"
          : card.accent
        : null,
    accentHex:
      card.mode === "custom" && card.accent === "custom"
        ? card.accentHex
        : null,
    dim: clampCardDim(card.dim),
    imageId: card.imageId,
    position: { x: position.x, y: position.y },
    scale,
    rotate,
    patternId: isProfilePatternId(card.patternId) ? card.patternId : "none",
  };
}

export type CardThemePatchInput = {
  enabled?: boolean;
  mode?: CardAccentMode;
  accent?: ProfileAccentId;
  accentHex?: string | null;
  dim?: number;
  imageId?: string | null;
  position?: ProfileBgPosition;
  scale?: number;
  rotate?: number;
  patternId?: ProfilePatternId;
};

export type ValidateCardPatchResult =
  | { ok: true; patch: CardThemePatchInput }
  | { ok: false; error: string };

export function validateCardPatchBody(
  raw: unknown,
): ValidateCardPatchResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "card phải là object." };
  }
  const obj = raw as Record<string, unknown>;
  const patch: CardThemePatchInput = {};

  if ("enabled" in obj) {
    if (typeof obj.enabled !== "boolean") {
      return { ok: false, error: "card.enabled phải là boolean." };
    }
    patch.enabled = obj.enabled;
  }

  if ("mode" in obj) {
    if (!isCardAccentMode(obj.mode)) {
      return { ok: false, error: "card.mode không hợp lệ." };
    }
    patch.mode = obj.mode;
  }

  if ("dim" in obj) {
    if (typeof obj.dim !== "number" || Number.isNaN(obj.dim)) {
      return { ok: false, error: "card.dim phải là số." };
    }
    patch.dim = clampCardDim(obj.dim);
  }

  if ("imageId" in obj) {
    if (obj.imageId != null && typeof obj.imageId !== "string") {
      return { ok: false, error: "card.imageId không hợp lệ." };
    }
    patch.imageId =
      typeof obj.imageId === "string" && obj.imageId.trim()
        ? obj.imageId.trim()
        : null;
  }

  if ("position" in obj) {
    if (!obj.position || typeof obj.position !== "object") {
      return { ok: false, error: "card.position không hợp lệ." };
    }
    const pos = obj.position as Record<string, unknown>;
    patch.position = {
      x: clampCardPos(pos.x),
      y: clampCardPos(pos.y),
    };
  }

  if ("scale" in obj) {
    if (typeof obj.scale !== "number" || Number.isNaN(obj.scale)) {
      return { ok: false, error: "card.scale phải là số." };
    }
    patch.scale = clampCardImageScale(obj.scale);
  }

  if ("rotate" in obj) {
    if (typeof obj.rotate !== "number" || Number.isNaN(obj.rotate)) {
      return { ok: false, error: "card.rotate phải là số." };
    }
    patch.rotate = clampCardImageRotate(obj.rotate);
  }

  if ("patternId" in obj) {
    if (!isProfilePatternId(obj.patternId)) {
      return { ok: false, error: "card.patternId không hợp lệ." };
    }
    patch.patternId = obj.patternId;
  }

  if ("accent" in obj) {
    if (!isProfileAccentId(obj.accent)) {
      return { ok: false, error: "card.accent không hợp lệ." };
    }
    patch.accent = obj.accent;
    if (obj.accent === "custom") {
      const hex = normalizeAccentHex(obj.accentHex);
      if (!hex) {
        return {
          ok: false,
          error: "card.accentHex phải là #RRGGBB khi accent = custom.",
        };
      }
      patch.accentHex = hex;
    } else {
      patch.accentHex = null;
    }
  } else if ("accentHex" in obj) {
    const hex = normalizeAccentHex(obj.accentHex);
    if (!hex) {
      return { ok: false, error: "card.accentHex phải là #RRGGBB." };
    }
    patch.accent = "custom";
    patch.accentHex = hex;
  }

  return { ok: true, patch };
}

export function applyCardPatch(
  prev: ProfileCardThemeSlice,
  patch: CardThemePatchInput,
  customs?: ProfileCustomEntry[] | null,
): ProfileCardThemeSlice {
  let accent = patch.accent ?? prev.accent;
  let accentHex =
    patch.accentHex !== undefined ? patch.accentHex : prev.accentHex;
  if (accent === "custom") {
    accentHex = normalizeAccentHex(accentHex);
    if (!accentHex) {
      accent = "cins";
      accentHex = null;
    }
  } else {
    accentHex = null;
  }

  let imageId =
    patch.imageId !== undefined ? patch.imageId : prev.imageId;
  if (imageId && customs && customs.length > 0) {
    const allowed = new Set(customs.map((c) => c.imageId));
    if (!allowed.has(imageId)) imageId = null;
  }

  let patternId: ProfilePatternId = isProfilePatternId(prev.patternId)
    ? prev.patternId
    : "none";
  if (patch.patternId !== undefined) {
    patternId = patch.patternId;
    if (patternId !== "none" && patch.imageId === undefined) {
      imageId = null;
    }
  }
  if (imageId) patternId = "none";

  const prevPos = parseCardPosition(prev.position);
  const position = patch.position
    ? {
        x: clampCardPos(patch.position.x, prevPos.x),
        y: clampCardPos(patch.position.y, prevPos.y),
      }
    : prevPos;

  return {
    enabled: patch.enabled !== undefined ? patch.enabled : prev.enabled,
    mode: patch.mode ?? prev.mode,
    accent,
    accentHex,
    dim:
      patch.dim !== undefined
        ? clampCardDim(patch.dim)
        : clampCardDim(prev.dim),
    imageId,
    position,
    scale:
      patch.scale !== undefined
        ? clampCardImageScale(patch.scale)
        : clampCardImageScale(prev.scale),
    rotate:
      patch.rotate !== undefined
        ? clampCardImageRotate(patch.rotate)
        : clampCardImageRotate(prev.rotate),
    patternId,
  };
}

/**
 * Resolve DTO công khai cho feed/card.
 * `enabled: false` hoặc accent mặc định CINs khi inherit → null (không tint).
 * `mode: none` → không tint màu; vẫn trả DTO nếu có ảnh.
 */
export function resolveAuthorCardThemeDto(
  card: ProfileCardThemeSlice,
  theme: ProfileThemeSlice,
): AuthorCardThemeDto | null {
  if (!card.enabled) return null;

  const imageUrl = card.imageId
    ? cardImageUrl(card.imageId, "public")
    : null;
  const position = parseCardPosition(card.position);
  const dim = clampCardDim(card.dim);
  const scale = clampCardImageScale(card.scale);
  const rotate = clampCardImageRotate(card.rotate);
  const patternId = resolveCardPatternId(card, imageUrl);

  if (card.mode === "none") {
    if (!imageUrl) return null;
    return {
      accentHex: null,
      dim,
      imageUrl,
      position,
      scale,
      rotate,
      patternId: "none",
    };
  }

  let accentHex: string;
  if (card.mode === "custom") {
    accentHex = resolveAccentHex({
      ...theme,
      accent: card.accent,
      accentHex: card.accentHex,
    });
  } else {
    /* inherit — không tint nếu theme vẫn CINs mặc định và không có ảnh / họa tiết. */
    if (
      theme.accent === "cins" &&
      !theme.accentHex &&
      !card.imageId &&
      patternId === "none"
    ) {
      return null;
    }
    accentHex = resolveAccentHex(theme);
  }

  return {
    accentHex,
    dim,
    imageUrl,
    position,
    scale,
    rotate,
    patternId,
  };
}

/** Parse raw giao_dien → DTO (null nếu tắt / default). */
export function authorCardThemeFromGiaoDien(
  giaoDienRaw: unknown,
): AuthorCardThemeDto | null {
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
            ? ((row as { createdAt: string }).createdAt)
            : new Date(0).toISOString(),
      });
    }
  }

  const card = parseCardTheme(obj.card, customs);
  const themeRaw =
    obj.theme && typeof obj.theme === "object"
      ? (obj.theme as Record<string, unknown>)
      : {};

  let accent: ProfileThemeSlice["accent"] = isProfileAccentId(themeRaw.accent)
    ? themeRaw.accent
    : "cins";
  let accentHex = normalizeAccentHex(themeRaw.accentHex);
  if (accent === "custom" && !accentHex) {
    accent = "cins";
    accentHex = null;
  }

  const theme: ProfileThemeSlice = {
    accent,
    accentHex,
    applyToHome: themeRaw.applyToHome === true,
    background: {
      kind: "none",
      patternId: "none",
      imageId: null,
      dim: 0.35,
      position: { x: 0.5, y: 0.5 },
      devices: {},
    },
  };

  return resolveAuthorCardThemeDto(card, theme);
}

export type CardThemeCssVars = CSSProperties & {
  ["--j-card-accent"]?: string;
  ["--j-card-dim"]?: string;
  ["--j-card-overlay"]?: string;
  ["--j-card-image"]?: string;
  ["--j-card-image-pos"]?: string;
  ["--j-card-image-nx"]?: string;
  ["--j-card-image-ny"]?: string;
  ["--j-card-image-scale"]?: string;
  ["--j-card-image-rotate"]?: string;
  ["--j-card-pattern"]?: string;
  ["--j-card-pattern-size"]?: string;
  ["--j-card-pattern-pos"]?: string;
};

export function authorCardThemeStyle(
  dto: AuthorCardThemeDto | null | undefined,
): CardThemeCssVars | undefined {
  if (!dto) return undefined;
  const dim = clampCardDim(dto.dim);
  const pos = parseCardPosition(dto.position);
  const vars: CardThemeCssVars = {
    ["--j-card-dim"]: String(dim),
    ["--j-card-overlay"]: String(cardOverlayFromDim(dim)),
  };
  if (dto.accentHex) {
    vars["--j-card-accent"] = dto.accentHex;
  }
  if (dto.imageUrl) {
    vars["--j-card-image"] = `url("${dto.imageUrl}")`;
    vars["--j-card-image-pos"] = cardPositionToCss(pos);
    vars["--j-card-image-nx"] = String(pos.x);
    vars["--j-card-image-ny"] = String(pos.y);
    vars["--j-card-image-scale"] = String(clampCardImageScale(dto.scale));
    vars["--j-card-image-rotate"] = `${clampCardImageRotate(dto.rotate)}deg`;
  } else if (dto.patternId !== "none") {
    const def = getPatternDef(dto.patternId);
    if (def.image) {
      vars["--j-card-pattern"] = def.image;
      vars["--j-card-pattern-size"] = def.size ?? "auto";
      vars["--j-card-pattern-pos"] = def.position ?? "0 0";
    }
  }
  return vars;
}

export function cardsEqual(
  a: ProfileCardThemeSlice,
  b: ProfileCardThemeSlice,
): boolean {
  const pa = parseCardPosition(a.position);
  const pb = parseCardPosition(b.position);
  return (
    a.enabled === b.enabled &&
    a.mode === b.mode &&
    a.accent === b.accent &&
    a.accentHex === b.accentHex &&
    a.dim === b.dim &&
    a.imageId === b.imageId &&
    (a.patternId ?? "none") === (b.patternId ?? "none") &&
    pa.x === pb.x &&
    pa.y === pb.y &&
    Math.abs(clampCardImageScale(a.scale) - clampCardImageScale(b.scale)) <
      0.0005 &&
    Math.abs(clampCardImageRotate(a.rotate) - clampCardImageRotate(b.rotate)) <
      0.05
  );
}

/**
 * Datebar là dấu ấn công khai của tác giả (Journey + trang chủ).
 * Self + verified (bài của chính họ); không gắn lên bookmark / tagged / cộng đồng.
 */
export function milestoneTakesAuthorCardTheme(m: {
  variant: string;
  visibility?: string | null;
}): boolean {
  if (m.visibility === "cong-dong") return false;
  if (m.variant === "bookmark" || m.variant === "tagged") return false;
  return m.variant === "self" || m.variant === "verified";
}

/** Gắn DTO lên bài của chủ trang (không cong-dong / bookmark / tagged người khác). */
export function attachAuthorCardThemeToSelfMilestones<
  T extends {
    variant: string;
    visibility?: string | null;
    authorCardTheme?: AuthorCardThemeDto | null;
  },
>(milestones: T[], dto: AuthorCardThemeDto | null): T[] {
  return milestones.map((m) => {
    if (!milestoneTakesAuthorCardTheme(m)) return m;
    if (!dto) {
      if (m.authorCardTheme == null) return m;
      const { authorCardTheme: _drop, ...rest } = m;
      return rest as T;
    }
    return { ...m, authorCardTheme: dto };
  });
}
