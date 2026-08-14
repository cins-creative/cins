/**
 * Preference bố cục trang chủ — parse / resolve / validate.
 * Cột DB: `user_nguoi_dung.home_layout` (jsonb).
 */

import {
  moduleMatchesCapabilities,
  type HomeCapability,
} from "@/lib/cins/home-adaptive/capability-types";
import {
  ALL_MODULE_IDS,
  CAPABILITY_DEFAULT_MODULES,
  MODULE_META,
  NON_HIDEABLE_MODULES,
  defaultSideForModule,
} from "@/lib/cins/home-adaptive/module-meta";
import {
  defaultModuleLayoutForGiaiDoan,
  moduleOrderForGiaiDoan,
  type GiaiDoan,
  type ModuleId,
  type Persona,
} from "@/lib/cins/home-adaptive/persona";
import {
  parseHomeLayoutTutorial,
  parseOnboardingIntents,
  parsePresetDaAp,
  type HomeLayoutTutorial,
  type OnboardingIntent,
  type PresetId,
} from "@/lib/cins/home-adaptive/presets";

export const HOME_LAYOUT_VERSION = 2;
export const HOME_LAYOUT_MAX_IDS = 40;
export const HOME_LAYOUT_ITEM_LIMIT_MIN = 1;
export const HOME_LAYOUT_ITEM_LIMIT_MAX = 10;
export const HOME_LAYOUT_ITEM_LIMIT_DEFAULT = 5;

export type HomeLayoutFeedPrefs = {
  promo_rail?: boolean;
  composer?: boolean;
};

export type HomeLayoutItemLimits = Partial<Record<ModuleId, number>>;

/** Breadcrumb bộ khối đã áp — không tham gia resolve layout. */
export type HomeLayoutPresetMeta = {
  da_ap: PresetId[];
  at?: string;
};

/** Shape lưu DB (sau chuẩn hoá). */
export type HomeLayoutStored = {
  v: number;
  left: ModuleId[];
  right: ModuleId[];
  hidden: ModuleId[];
  /** Số dòng nội dung mỗi khối (1–10). */
  limits?: HomeLayoutItemLimits;
  feed?: HomeLayoutFeedPrefs;
  /** Bộ khối đã áp (breadcrumb). */
  preset?: HomeLayoutPresetMeta;
  /** Tutorial mua/bán lần đầu — không tham gia resolve cột. */
  tutorial?: HomeLayoutTutorial;
  /** Chip onboarding — pre-select dropdown / auto-apply phone. */
  intent_hint?: OnboardingIntent[];
  at?: string;
};

/** Kết quả resolve để render. */
export type ResolvedHomeLayout = {
  left: ModuleId[];
  right: ModuleId[];
  hidden: ModuleId[];
  limits: HomeLayoutItemLimits;
  /** Module vừa được hệ thống chèn vì chưa từng nằm trong prefs (badge «Mới»). */
  newlyInjected: ModuleId[];
  /** true nếu prefs rỗng — đang dùng mặc định persona. */
  isDefault: boolean;
  feed: HomeLayoutFeedPrefs;
  /** Bộ khối đã áp (breadcrumb) — không ảnh hưởng cột. */
  presetDaAp: PresetId[];
  tutorial?: HomeLayoutTutorial;
  intentHint: OnboardingIntent[];
};

const MODULE_ID_SET = new Set<string>(ALL_MODULE_IDS);

export function isModuleId(value: unknown): value is ModuleId {
  return typeof value === "string" && MODULE_ID_SET.has(value);
}

function filterKnownIds(raw: unknown): ModuleId[] {
  if (!Array.isArray(raw)) return [];
  const out: ModuleId[] = [];
  const seen = new Set<ModuleId>();
  for (const item of raw) {
    if (!isModuleId(item) || seen.has(item)) continue;
    /* Gộp vào `theo_doi_org` — bỏ khỏi layout đã lưu. */
    if (item === "quay_cua_toi") continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

export function clampItemLimit(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(
    HOME_LAYOUT_ITEM_LIMIT_MAX,
    Math.max(HOME_LAYOUT_ITEM_LIMIT_MIN, Math.round(value)),
  );
}

function parseItemLimits(raw: unknown): HomeLayoutItemLimits {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: HomeLayoutItemLimits = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!isModuleId(key)) continue;
    const n = clampItemLimit(value);
    if (n == null) continue;
    out[key] = n;
  }
  return out;
}

/** `{}` / null / invalid → chưa tuỳ chỉnh. Layout tutorial pending (cột rỗng + cờ) không phải mặc định persona. */
export function isEmptyHomeLayout(raw: unknown): boolean {
  if (raw == null) return true;
  if (typeof raw !== "object" || Array.isArray(raw)) return true;
  const o = raw as Record<string, unknown>;
  if (parseHomeLayoutTutorial(o.tutorial)) return false;
  if (parseOnboardingIntents(o.intent_hint).length > 0) return false;
  const hasLists =
    (Array.isArray(o.left) && o.left.length > 0) ||
    (Array.isArray(o.right) && o.right.length > 0) ||
    (Array.isArray(o.hidden) && o.hidden.length > 0);
  return !hasLists;
}

/**
 * Parse raw jsonb → shape sạch (id lạ bỏ, trùng bỏ, non-hideable khỏi hidden).
 * Không inject module mới — việc đó thuộc `resolveHomeLayout`.
 */
export function parseHomeLayout(raw: unknown): HomeLayoutStored | null {
  if (isEmptyHomeLayout(raw)) return null;
  const o = raw as Record<string, unknown>;
  let left = filterKnownIds(o.left);
  let right = filterKnownIds(o.right);
  let hidden = filterKnownIds(o.hidden).filter(
    (id) => !NON_HIDEABLE_MODULES.has(id),
  );

  // Một id chỉ thuộc một bucket — ưu tiên left → right → hidden.
  const used = new Set<ModuleId>();
  left = left.filter((id) => {
    if (used.has(id)) return false;
    used.add(id);
    return true;
  });
  right = right.filter((id) => {
    if (used.has(id)) return false;
    used.add(id);
    return true;
  });
  hidden = hidden.filter((id) => {
    if (used.has(id)) return false;
    used.add(id);
    return true;
  });

  const feed: HomeLayoutFeedPrefs = {};
  if (o.feed && typeof o.feed === "object" && !Array.isArray(o.feed)) {
    const f = o.feed as Record<string, unknown>;
    if (typeof f.promo_rail === "boolean") feed.promo_rail = f.promo_rail;
    if (typeof f.composer === "boolean") feed.composer = f.composer;
  }

  let preset: HomeLayoutPresetMeta | undefined;
  if (o.preset && typeof o.preset === "object" && !Array.isArray(o.preset)) {
    const p = o.preset as Record<string, unknown>;
    const da_ap = parsePresetDaAp(p.da_ap);
    if (da_ap.length > 0) {
      preset = {
        da_ap,
        ...(typeof p.at === "string" ? { at: p.at } : {}),
      };
    }
  }

  const v =
    typeof o.v === "number" && Number.isFinite(o.v)
      ? o.v
      : HOME_LAYOUT_VERSION;
  const at = typeof o.at === "string" ? o.at : undefined;
  const limits = parseItemLimits(o.limits);
  const tutorial = parseHomeLayoutTutorial(o.tutorial);
  const intent_hint = parseOnboardingIntents(o.intent_hint);

  return {
    v,
    left,
    right,
    hidden,
    ...(Object.keys(limits).length > 0 ? { limits } : {}),
    ...(Object.keys(feed).length > 0 ? { feed } : {}),
    ...(preset ? { preset } : {}),
    ...(tutorial ? { tutorial } : {}),
    ...(intent_hint.length > 0 ? { intent_hint } : {}),
    ...(at ? { at } : {}),
  };
}

/** §7 seeking: đẩy `co_hoi` lên đầu cột phải. */
export function orderForSeeking(
  ids: ModuleId[],
  seeking: boolean,
): ModuleId[] {
  if (!seeking || !ids.includes("co_hoi")) return ids;
  return ["co_hoi", ...ids.filter((id) => id !== "co_hoi")];
}

/**
 * Chèn module mặc định của persona chưa từng xuất hiện trong prefs
 * (quy tắc §3.3 — badge «Mới»). Bỏ qua module thiếu capability.
 */
function injectMissingPersonaDefaults(
  left: ModuleId[],
  right: ModuleId[],
  hidden: ModuleId[],
  persona: Persona,
  capabilities: readonly HomeCapability[] | null | undefined,
  giaiDoan?: GiaiDoan | null,
): { left: ModuleId[]; right: ModuleId[]; newlyInjected: ModuleId[] } {
  const known = new Set<ModuleId>([...left, ...right, ...hidden]);
  const defaults = moduleOrderForGiaiDoan(giaiDoan, persona);
  const newlyInjected: ModuleId[] = [];
  const nextLeft = [...left];
  const nextRight = [...right];
  const caps = capabilities ?? [];

  for (const id of defaults) {
    if (known.has(id)) continue;
    const meta = MODULE_META[id];
    if (
      !moduleMatchesCapabilities(caps, {
        requires: meta.requires,
        requiresAny: meta.requiresAny,
      })
    ) {
      continue;
    }
    known.add(id);
    newlyInjected.push(id);
    const side = defaultSideForModule(id);
    const target = side === "right" ? nextRight : nextLeft;
    // Chèn theo thứ tự tương đối trong defaults cùng cột.
    const peers = defaults.filter((d) => defaultSideForModule(d) === side);
    const peerIdx = peers.indexOf(id);
    let insertAt = target.length;
    for (let i = peerIdx - 1; i >= 0; i--) {
      const prev = peers[i];
      const at = target.indexOf(prev);
      if (at >= 0) {
        insertAt = at + 1;
        break;
      }
    }
    if (insertAt === target.length) {
      for (let i = peerIdx + 1; i < peers.length; i++) {
        const next = peers[i];
        const at = target.indexOf(next);
        if (at >= 0) {
          insertAt = at;
          break;
        }
      }
    }
    target.splice(insertAt, 0, id);
  }

  return { left: nextLeft, right: nextRight, newlyInjected };
}

/** Loại module user không đủ capability — kể cả đã lưu trong prefs. */
function filterLayoutByCapabilities(
  left: ModuleId[],
  right: ModuleId[],
  capabilities: readonly HomeCapability[] | null | undefined,
): { left: ModuleId[]; right: ModuleId[] } {
  const caps = capabilities ?? [];
  const ok = (id: ModuleId) => {
    const meta = MODULE_META[id];
    return moduleMatchesCapabilities(caps, {
      requires: meta.requires,
      requiresAny: meta.requiresAny,
    });
  };
  return {
    left: left.filter(ok),
    right: right.filter(ok),
  };
}

/** Chèn module theo capability vào default layout (chưa tuỳ chỉnh). */
function appendCapabilityDefaults(
  left: ModuleId[],
  right: ModuleId[],
  hidden: readonly ModuleId[],
  capabilities: readonly HomeCapability[] | null | undefined,
): { left: ModuleId[]; right: ModuleId[] } {
  if (!capabilities || capabilities.length === 0) {
    return { left, right };
  }
  // Phải gồm `hidden` — user đã ẩn thì không tự gắn lại.
  const known = new Set<ModuleId>([...left, ...right, ...hidden]);
  const nextLeft = [...left];
  const nextRight = [...right];

  for (const entry of CAPABILITY_DEFAULT_MODULES) {
    if (known.has(entry.id)) continue;
    if (
      !moduleMatchesCapabilities(capabilities, {
        requires: entry.requires,
        requiresAny: entry.requiresAny,
      })
    ) {
      continue;
    }
    known.add(entry.id);
    const side = defaultSideForModule(entry.id);
    if (side === "right") nextRight.push(entry.id);
    else nextLeft.push(entry.id);
  }

  return { left: nextLeft, right: nextRight };
}

/** Resolve prefs + persona / giai đoạn → cột render. */
export function resolveHomeLayout(
  persona: Persona,
  seeking: boolean,
  raw: unknown,
  capabilities?: readonly HomeCapability[] | null,
  giaiDoan?: GiaiDoan | null,
): ResolvedHomeLayout {
  const parsed = parseHomeLayout(raw);

  if (!parsed) {
    const base = defaultModuleLayoutForGiaiDoan(giaiDoan ?? null);
    const withCaps = appendCapabilityDefaults(
      [...base.left],
      [...base.right],
      [],
      capabilities,
    );
    const filtered = filterLayoutByCapabilities(
      withCaps.left,
      withCaps.right,
      capabilities,
    );
    return {
      left: filtered.left,
      right: orderForSeeking(filtered.right, seeking),
      hidden: [],
      limits: {},
      newlyInjected: [],
      isDefault: true,
      feed: {},
      presetDaAp: [],
      intentHint: [],
    };
  }

  const skipPersonaInject =
    parsed.tutorial === "pending" ||
    parsed.tutorial === "done" ||
    parsed.tutorial === "skipped";

  if (
    parsed.tutorial === "pending" &&
    parsed.left.length === 0 &&
    parsed.right.length === 0
  ) {
    return {
      left: [],
      right: [],
      hidden: parsed.hidden,
      limits: parsed.limits ?? {},
      newlyInjected: [],
      isDefault: false,
      feed: parsed.feed ?? {},
      presetDaAp: parsed.preset?.da_ap ?? [],
      tutorial: parsed.tutorial,
      intentHint: parsed.intent_hint ?? [],
    };
  }

  const injected = skipPersonaInject
    ? {
        left: parsed.left,
        right: parsed.right,
        newlyInjected: [] as ModuleId[],
      }
    : injectMissingPersonaDefaults(
        parsed.left,
        parsed.right,
        parsed.hidden,
        persona,
        capabilities,
        giaiDoan,
      );
  const withCaps = appendCapabilityDefaults(
    injected.left,
    injected.right,
    parsed.hidden,
    capabilities,
  );
  const filtered = filterLayoutByCapabilities(
    withCaps.left,
    withCaps.right,
    capabilities,
  );
  const kept = new Set<ModuleId>([...filtered.left, ...filtered.right]);

  return {
    left: filtered.left,
    right: orderForSeeking(filtered.right, seeking),
    hidden: parsed.hidden,
    limits: parsed.limits ?? {},
    newlyInjected: injected.newlyInjected.filter((id) => kept.has(id)),
    isDefault: false,
    feed: parsed.feed ?? {},
    presetDaAp: parsed.preset?.da_ap ?? [],
    tutorial: parsed.tutorial,
    intentHint: parsed.intent_hint ?? [],
  };
}

export type ValidateHomeLayoutResult =
  | { ok: true; layout: HomeLayoutStored }
  | { ok: false; error: string };

/**
 * Validate body PUT từ client. Silent-correct: loại module non-hideable khỏi hidden.
 */
export function validateHomeLayoutBody(
  body: unknown,
): ValidateHomeLayoutResult {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Payload không hợp lệ." };
  }
  const o = body as Record<string, unknown>;

  if (!Array.isArray(o.left) || !Array.isArray(o.right) || !Array.isArray(o.hidden)) {
    return {
      ok: false,
      error: "Thiếu mảng left / right / hidden.",
    };
  }

  const total = o.left.length + o.right.length + o.hidden.length;
  if (total > HOME_LAYOUT_MAX_IDS) {
    return {
      ok: false,
      error: `Tối đa ${HOME_LAYOUT_MAX_IDS} module.`,
    };
  }

  for (const list of [o.left, o.right, o.hidden]) {
    for (const item of list) {
      if (!isModuleId(item)) {
        return { ok: false, error: `Module không hợp lệ: ${String(item)}` };
      }
    }
  }

  const parsed = parseHomeLayout({
    v: HOME_LAYOUT_VERSION,
    left: o.left,
    right: o.right,
    hidden: o.hidden,
    limits: o.limits,
    feed: o.feed,
    preset: o.preset,
    tutorial: o.tutorial,
    intent_hint: o.intent_hint,
  });

  if (!parsed) {
    return { ok: false, error: "Layout trống — dùng DELETE để khôi phục mặc định." };
  }

  // Non-hideable phải nằm ở left hoặc right.
  for (const id of NON_HIDEABLE_MODULES) {
    if (
      !parsed.left.includes(id) &&
      !parsed.right.includes(id) &&
      MODULE_META[id].defaultPersonas.length > 0
    ) {
      // Chỉ ép hiện nếu user đang có layout tuỳ chỉnh và module thuộc persona
      // của họ — không tự thêm cho mọi user. Client gửi đủ; nếu thiếu thì
      // thêm vào đầu cột trái.
      if (
        parsed.hidden.includes(id) ||
        (!parsed.left.includes(id) && !parsed.right.includes(id))
      ) {
        parsed.hidden = parsed.hidden.filter((x) => x !== id);
        if (!parsed.left.includes(id) && !parsed.right.includes(id)) {
          parsed.left = [id, ...parsed.left];
        }
      }
    }
  }

  return {
    ok: true,
    layout: {
      ...parsed,
      v: HOME_LAYOUT_VERSION,
      at: new Date().toISOString(),
      ...(parsed.preset
        ? {
            preset: {
              ...parsed.preset,
              at: parsed.preset.at ?? new Date().toISOString(),
            },
          }
        : {}),
    },
  };
}

/** Payload lưu DB khi khôi phục mặc định. */
export function emptyHomeLayout(): Record<string, never> {
  return {};
}
