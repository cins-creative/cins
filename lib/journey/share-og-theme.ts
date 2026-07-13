import { getCfAccountHash } from "@/lib/cloudflare/account-hash";

/** Preset nền OG / thẻ share — thiên về pattern nền sáng, dễ đọc. */
export const SHARE_OG_PRESET_IDS = [
  "paper",
  "dots",
  "grid",
  "diagonal",
  "crosshatch",
  "confetti",
  "mint",
  "lavender",
  "sun",
  "blueprint",
] as const;

export type ShareOgPresetId = (typeof SHARE_OG_PRESET_IDS)[number];

export type ShareOgTheme =
  | { kind: "preset"; id: ShareOgPresetId }
  | { kind: "custom"; imageId: string };

export type ShareOgCustomEntry = {
  imageId: string;
  createdAt: string;
};

export type ShareOgThemeState = {
  active: ShareOgTheme;
  customs: ShareOgCustomEntry[];
};

export const SHARE_OG_CUSTOMS_MAX = 6;

export type ShareOgThemeTokens = {
  /** Màu nền cơ sở (backgroundColor). */
  surface: string;
  /** Lớp pattern (backgroundImage) — dùng chung DOM + Satori. */
  patternImage: string | null;
  /** backgroundSize cho pattern. */
  patternSize: string | null;
  ink: string;
  muted: string;
  accent: string;
  /** Nền panel/pill nổi trên surface. */
  panel: string;
  /** Ảnh nền custom (Cloudflare) — ưu tiên hơn pattern. */
  backgroundImage: string | null;
  lightInk: boolean;
  presetId: ShareOgPresetId | null;
  isCustom: boolean;
};

type PresetDef = {
  id: ShareOgPresetId;
  label: string;
  surface: string;
  patternImage: string | null;
  patternSize: string | null;
  ink: string;
  muted: string;
  accent: string;
  panel: string;
  lightInk: boolean;
};

const PRESET_DEFS: Record<ShareOgPresetId, PresetDef> = {
  paper: {
    id: "paper",
    label: "Giấy",
    surface: "#f6f1e7",
    patternImage: null,
    patternSize: null,
    ink: "#292524",
    muted: "#78716c",
    accent: "#b45309",
    panel: "rgba(255, 255, 255, 0.72)",
    lightInk: false,
  },
  dots: {
    id: "dots",
    label: "Chấm",
    surface: "#f8fafc",
    patternImage:
      "radial-gradient(circle at center, rgba(15, 23, 42, 0.14) 1.5px, transparent 2px)",
    patternSize: "16px 16px",
    ink: "#0f172a",
    muted: "#64748b",
    accent: "#0284c7",
    panel: "rgba(255, 255, 255, 0.85)",
    lightInk: false,
  },
  grid: {
    id: "grid",
    label: "Lưới",
    surface: "#f1f5f9",
    patternImage:
      "repeating-linear-gradient(0deg, rgba(15, 23, 42, 0.07) 0 1px, transparent 1px 22px), repeating-linear-gradient(90deg, rgba(15, 23, 42, 0.07) 0 1px, transparent 1px 22px)",
    patternSize: null,
    ink: "#0f172a",
    muted: "#64748b",
    accent: "#0d9488",
    panel: "rgba(255, 255, 255, 0.85)",
    lightInk: false,
  },
  diagonal: {
    id: "diagonal",
    label: "Sọc chéo",
    surface: "#eff6ff",
    patternImage:
      "repeating-linear-gradient(45deg, rgba(37, 99, 235, 0.09) 0 10px, transparent 10px 20px)",
    patternSize: null,
    ink: "#0f172a",
    muted: "#475569",
    accent: "#2563eb",
    panel: "rgba(255, 255, 255, 0.85)",
    lightInk: false,
  },
  crosshatch: {
    id: "crosshatch",
    label: "Đan chéo",
    surface: "#fdf2f8",
    patternImage:
      "repeating-linear-gradient(45deg, rgba(190, 24, 93, 0.07) 0 8px, transparent 8px 16px), repeating-linear-gradient(-45deg, rgba(190, 24, 93, 0.07) 0 8px, transparent 8px 16px)",
    patternSize: null,
    ink: "#831843",
    muted: "#9d174d",
    accent: "#db2777",
    panel: "rgba(255, 255, 255, 0.82)",
    lightInk: false,
  },
  confetti: {
    id: "confetti",
    label: "Confetti",
    surface: "#ffffff",
    patternImage:
      "radial-gradient(circle at 20% 28%, rgba(59, 130, 246, 0.55) 0 6px, transparent 7px), radial-gradient(circle at 72% 18%, rgba(244, 63, 94, 0.5) 0 5px, transparent 6px), radial-gradient(circle at 86% 66%, rgba(234, 179, 8, 0.55) 0 6px, transparent 7px), radial-gradient(circle at 34% 82%, rgba(16, 185, 129, 0.5) 0 5px, transparent 6px)",
    patternSize: "220px 220px",
    ink: "#0f172a",
    muted: "#64748b",
    accent: "#7c3aed",
    panel: "rgba(255, 255, 255, 0.88)",
    lightInk: false,
  },
  mint: {
    id: "mint",
    label: "Mint",
    surface: "#ecfdf5",
    patternImage:
      "radial-gradient(circle at center, rgba(5, 150, 105, 0.16) 1.5px, transparent 2px)",
    patternSize: "15px 15px",
    ink: "#064e3b",
    muted: "#047857",
    accent: "#059669",
    panel: "rgba(255, 255, 255, 0.82)",
    lightInk: false,
  },
  lavender: {
    id: "lavender",
    label: "Lavender",
    surface: "#f5f3ff",
    patternImage:
      "repeating-linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0 12px, transparent 12px 24px)",
    patternSize: null,
    ink: "#3730a3",
    muted: "#6d28d9",
    accent: "#7c3aed",
    panel: "rgba(255, 255, 255, 0.84)",
    lightInk: false,
  },
  sun: {
    id: "sun",
    label: "Nắng",
    surface: "#fffbeb",
    patternImage:
      "radial-gradient(circle at center, rgba(217, 119, 6, 0.18) 1.5px, transparent 2px)",
    patternSize: "16px 16px",
    ink: "#7c2d12",
    muted: "#b45309",
    accent: "#ea580c",
    panel: "rgba(255, 255, 255, 0.82)",
    lightInk: false,
  },
  blueprint: {
    id: "blueprint",
    label: "Blueprint",
    surface: "#0e2a47",
    patternImage:
      "repeating-linear-gradient(0deg, rgba(186, 230, 253, 0.16) 0 1px, transparent 1px 24px), repeating-linear-gradient(90deg, rgba(186, 230, 253, 0.16) 0 1px, transparent 1px 24px)",
    patternSize: null,
    ink: "#e0f2fe",
    muted: "#7dd3fc",
    accent: "#38bdf8",
    panel: "rgba(8, 25, 45, 0.6)",
    lightInk: true,
  },
};

export const SHARE_OG_PRESETS: ReadonlyArray<{
  id: ShareOgPresetId;
  label: string;
}> = SHARE_OG_PRESET_IDS.map((id) => ({
  id,
  label: PRESET_DEFS[id].label,
}));

export function isShareOgPresetId(value: unknown): value is ShareOgPresetId {
  return (
    typeof value === "string" &&
    (SHARE_OG_PRESET_IDS as readonly string[]).includes(value)
  );
}

export function defaultShareOgTheme(seed: string): ShareOgTheme {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const id = SHARE_OG_PRESET_IDS[hash % SHARE_OG_PRESET_IDS.length]!;
  return { kind: "preset", id };
}

export function defaultShareOgThemeState(seed: string): ShareOgThemeState {
  return { active: defaultShareOgTheme(seed), customs: [] };
}

export function cfImagePublicUrl(imageId: string): string | null {
  const id = imageId.trim();
  if (!id) return null;
  const hash = getCfAccountHash();
  if (!hash) return null;
  return `https://imagedelivery.net/${hash}/${id}/public`;
}

export function parseShareOgTheme(raw: unknown): ShareOgTheme | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (obj.kind === "preset" && isShareOgPresetId(obj.id)) {
    return { kind: "preset", id: obj.id };
  }
  if (obj.kind === "custom" && typeof obj.imageId === "string" && obj.imageId.trim()) {
    return { kind: "custom", imageId: obj.imageId.trim() };
  }
  return null;
}

export function parseShareOgThemeState(
  raw: unknown,
  seed = "cins",
): ShareOgThemeState {
  const fallback = defaultShareOgThemeState(seed);

  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      return fallback;
    }
  }

  if (!parsed || typeof parsed !== "object") return fallback;
  const obj = parsed as Record<string, unknown>;

  const active = parseShareOgTheme(obj.active) ?? fallback.active;
  const customsRaw = Array.isArray(obj.customs) ? obj.customs : [];
  const customs: ShareOgCustomEntry[] = [];
  for (const item of customsRaw) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    const imageId =
      typeof entry.imageId === "string" ? entry.imageId.trim() : "";
    if (!imageId) continue;
    const createdAt =
      typeof entry.createdAt === "string" && entry.createdAt
        ? entry.createdAt
        : new Date(0).toISOString();
    customs.push({ imageId, createdAt });
    if (customs.length >= SHARE_OG_CUSTOMS_MAX) break;
  }

  if (active.kind === "custom") {
    const known = customs.some((c) => c.imageId === active.imageId);
    if (!known) {
      customs.unshift({
        imageId: active.imageId,
        createdAt: new Date().toISOString(),
      });
      while (customs.length > SHARE_OG_CUSTOMS_MAX) customs.pop();
    }
  }

  return { active, customs };
}

export function serializeShareOgThemeState(state: ShareOgThemeState): string {
  return JSON.stringify({
    active: state.active,
    customs: state.customs.slice(0, SHARE_OG_CUSTOMS_MAX),
  });
}

const DEFAULT_PRESET: ShareOgPresetId = "paper";

export function resolveShareOgThemeTokens(
  theme: ShareOgTheme | null | undefined,
  seed = "cins",
): ShareOgThemeTokens {
  const resolved = theme ?? defaultShareOgTheme(seed);

  if (resolved.kind === "custom") {
    const url = cfImagePublicUrl(resolved.imageId);
    return {
      surface: "#0f172a",
      patternImage: null,
      patternSize: null,
      ink: "#f8fafc",
      muted: "#cbd5e1",
      accent: "#38bdf8",
      panel: "rgba(15, 23, 42, 0.55)",
      backgroundImage: url,
      lightInk: true,
      presetId: null,
      isCustom: true,
    };
  }

  const preset = PRESET_DEFS[resolved.id] ?? PRESET_DEFS[DEFAULT_PRESET];
  return {
    surface: preset.surface,
    patternImage: preset.patternImage,
    patternSize: preset.patternSize,
    ink: preset.ink,
    muted: preset.muted,
    accent: preset.accent,
    panel: preset.panel,
    backgroundImage: null,
    lightInk: preset.lightInk,
    presetId: preset.id,
    isCustom: false,
  };
}

/** Style CSS cho swatch preset trong picker. */
export function shareOgSwatchStyle(id: ShareOgPresetId): {
  backgroundColor: string;
  backgroundImage?: string;
  backgroundSize?: string;
} {
  const preset = PRESET_DEFS[id] ?? PRESET_DEFS[DEFAULT_PRESET];
  return {
    backgroundColor: preset.surface,
    ...(preset.patternImage ? { backgroundImage: preset.patternImage } : {}),
    ...(preset.patternSize ? { backgroundSize: preset.patternSize } : {}),
  };
}

/** Background layers cho ImageResponse (OG) / DOM preview. */
export function shareOgBackgroundStyle(tokens: ShareOgThemeTokens): {
  backgroundColor: string;
  backgroundImage?: string;
  backgroundSize?: string;
} {
  if (tokens.backgroundImage) {
    return {
      backgroundColor: tokens.surface,
      backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.5) 0%, rgba(15,23,42,0.82) 100%), url(${tokens.backgroundImage})`,
      backgroundSize: "cover",
    };
  }
  return {
    backgroundColor: tokens.surface,
    ...(tokens.patternImage ? { backgroundImage: tokens.patternImage } : {}),
    ...(tokens.patternSize ? { backgroundSize: tokens.patternSize } : {}),
  };
}
