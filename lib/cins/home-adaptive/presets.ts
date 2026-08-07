/**
 * Bộ khối (preset) sidebar — dữ liệu tĩnh + áp layout.
 * Client-safe: không import server-only.
 *
 * Preset = cú ghi một lần vào left/right. Không tham gia resolve layout.
 * Xem docs/PLAN_home_preset_bo_khoi.md.
 */

import {
  moduleMatchesCapabilities,
  type HomeCapability,
} from "@/lib/cins/home-adaptive/capability-types";
import { MODULE_META } from "@/lib/cins/home-adaptive/module-meta";
import type {
  GiaiDoan,
  ModuleId,
  Persona,
} from "@/lib/cins/home-adaptive/persona";

/** Tổng khối left+right sau khi áp — vượt → dialog chống tràn. */
export const PRESET_LAYOUT_MAX = 8;

/** Breadcrumb / whitelist — tối đa id lưu trong home_layout.preset.da_ap. */
export const PRESET_DA_AP_MAX = 20;

/** Khối gợi ý bị động — ưu tiên đề xuất bỏ khi tràn. */
export const PRESET_OVERFLOW_SUGGEST_REMOVE: readonly ModuleId[] = [
  "goi_y_theo_doi",
  "hang_feature",
  "kham_pha_linh_vuc",
];

export type PresetKind = "nen" | "goi";

export type PresetId =
  | "hoc_vien"
  | "kham_pha"
  | "di_lam"
  | "freelancer"
  | "chu_shop"
  | "nguoi_mua"
  | "giao_vien"
  | "van_hanh_to_chuc"
  | "ket_noi"
  | "mua_hang_su_kien"
  | "hoc_tap";

export type HomePreset = {
  id: PresetId;
  kind: PresetKind;
  label: string;
  /** Một dòng «cho ai». */
  forWhom: string;
  left: readonly ModuleId[];
  right: readonly ModuleId[];
  /**
   * AND — thiếu 1 → không hiện thẻ.
   * Gói «Kết nối» để rỗng = hiện mọi người.
   */
  requires?: readonly HomeCapability[];
  requiresAny?: readonly HomeCapability[];
  /** Bộ nền chỉ khớp giai đoạn này. */
  giaiDoan?: readonly GiaiDoan[];
};

export const PRESET_NEN: readonly HomePreset[] = [
  {
    id: "hoc_vien",
    kind: "nen",
    label: "Học viên",
    forWhom: "Đang theo khóa tại cơ sở đào tạo",
    left: ["khoa_hoc_goi_y", "kham_pha_linh_vuc"],
    right: ["lop_hoc_cua_ban", "tin_nhan_to_chuc", "theo_doi_org"],
    requires: ["dang_hoc_khoa"],
    giaiDoan: ["dang_hoc"],
  },
  {
    id: "kham_pha",
    kind: "nen",
    label: "Khám phá ngành",
    forWhom: "Mới vào, chưa ghi danh khóa",
    left: ["kham_pha_linh_vuc", "duong_toi_do", "khoa_hoc_goi_y"],
    right: ["theo_doi_org", "goi_y_theo_doi"],
    giaiDoan: ["dang_hoc"],
  },
  {
    id: "di_lam",
    kind: "nen",
    label: "Đi làm",
    forWhom: "In-house, đã đi làm",
    left: ["nguoi_cung_nganh", "goi_y_studio"],
    right: ["theo_doi_org", "tin_nhan_ban_be"],
    giaiDoan: ["dang_lam"],
  },
  {
    id: "freelancer",
    kind: "nen",
    label: "Freelancer / tìm việc",
    forWhom: "Nhận job, đang săn việc",
    left: ["ho_so_cua_ban", "goi_y_studio", "ung_tuyen_cua_toi"],
    right: ["co_hoi", "theo_doi_org"],
    giaiDoan: ["freelance", "tim_viec"],
  },
];

export const PRESET_GOI: readonly HomePreset[] = [
  {
    id: "chu_shop",
    kind: "goi",
    label: "Chủ shop",
    forWhom: "Cho người bán",
    left: ["don_can_xu_ly", "quan_ly_kho"],
    right: ["tin_nhan_mua_ban", "theo_doi_org"],
    requires: ["co_shop"],
  },
  {
    id: "nguoi_mua",
    kind: "goi",
    label: "Người mua hàng",
    forWhom: "Cho người hay mua",
    left: ["don_mua_cua_toi"],
    right: ["tin_nhan_mua_ban", "hang_feature"],
    requires: ["da_mua_hang"],
  },
  {
    id: "giao_vien",
    kind: "goi",
    label: "Giáo viên",
    forWhom: "Dạy tại cơ sở",
    left: ["lop_hoc_cua_ban", "hoc_vien_cua_ban", "scout_tai_nang"],
    right: ["cho_ban_duyet", "org_inbox"],
    requires: ["org_staff"],
  },
  {
    id: "van_hanh_to_chuc",
    kind: "goi",
    label: "Vận hành tổ chức",
    forWhom: "Quản lý org, tuyển người, sự kiện",
    left: ["to_chuc_cua_ban", "ung_vien_moi"],
    right: ["org_inbox", "quan_ly_su_kien"],
    requiresAny: [
      "org_thanh_vien",
      "org_staff",
      "su_kien_admin",
      "studio_tuyen_dung",
    ],
  },
  {
    id: "ket_noi",
    kind: "goi",
    label: "Kết nối bạn bè",
    forWhom: "Tin nhắn & lời mời",
    left: ["goi_y_theo_doi"],
    right: ["tin_nhan_ban_be", "loi_moi_ket_ban"],
  },
  {
    id: "mua_hang_su_kien",
    kind: "goi",
    label: "Mua sắm",
    forWhom: "Shop bạn bè, giỏ hàng, đơn đang theo dõi",
    left: ["hang_feature", "don_mua_cua_toi"],
    right: ["gio_hang_cua_ban", "tin_nhan_mua_ban"],
  },
  {
    id: "hoc_tap",
    kind: "goi",
    label: "Học tập",
    forWhom: "Khám phá ngành, khóa học, cơ sở đào tạo",
    left: ["kham_pha_linh_vuc", "khoa_hoc_goi_y", "duong_toi_do"],
    right: ["theo_doi_org", "tin_nhan_to_chuc"],
  },
];

export const ALL_PRESETS: readonly HomePreset[] = [
  ...PRESET_NEN,
  ...PRESET_GOI,
];

const PRESET_BY_ID: ReadonlyMap<PresetId, HomePreset> = new Map(
  ALL_PRESETS.map((p) => [p.id, p]),
);

const PRESET_ID_SET = new Set<string>(ALL_PRESETS.map((p) => p.id));

export function isPresetId(value: unknown): value is PresetId {
  return typeof value === "string" && PRESET_ID_SET.has(value);
}

export function getPreset(id: PresetId): HomePreset | undefined {
  return PRESET_BY_ID.get(id);
}

/** Module ids trong bộ (trái rồi phải), unique. */
export function presetModuleIds(preset: HomePreset): ModuleId[] {
  const seen = new Set<ModuleId>();
  const out: ModuleId[] = [];
  for (const id of [...preset.left, ...preset.right]) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** Nhãn tiếng Việt các khối trong bộ (sau lọc capability). */
export function presetModuleLabels(
  preset: HomePreset,
  caps: readonly HomeCapability[] | ReadonlySet<HomeCapability>,
): string[] {
  return filterPresetModules(preset, caps).map((id) => MODULE_META[id].label);
}

function presetMatchesUser(
  preset: HomePreset,
  giaiDoan: GiaiDoan | null | undefined,
  caps: readonly HomeCapability[] | ReadonlySet<HomeCapability>,
): boolean {
  if (preset.giaiDoan && preset.giaiDoan.length > 0) {
    if (!giaiDoan || !preset.giaiDoan.includes(giaiDoan)) return false;
  }
  if (
    !moduleMatchesCapabilities(caps, {
      requires: preset.requires,
      requiresAny: preset.requiresAny,
    })
  ) {
    return false;
  }
  /* Bộ «Khám phá»: chỉ khi chưa ghi danh. */
  if (preset.id === "kham_pha") {
    const set = caps instanceof Set ? caps : new Set(caps);
    if (set.has("dang_hoc_khoa")) return false;
  }
  return filterPresetModules(preset, caps).length > 0;
}

/** Khối trong bộ còn khớp capability. */
export function filterPresetModules(
  preset: HomePreset,
  caps: readonly HomeCapability[] | ReadonlySet<HomeCapability>,
): ModuleId[] {
  return presetModuleIds(preset).filter((id) => {
    const meta = MODULE_META[id];
    return moduleMatchesCapabilities(caps, {
      requires: meta.requires,
      requiresAny: meta.requiresAny,
    });
  });
}

/**
 * Bộ hiện cho user — nền khớp giai đoạn trước, rồi gói.
 * Persona chỉ dùng để ưu tiên sắp (gói gần persona trước).
 */
export function presetsForUser(
  persona: Persona,
  giaiDoan: GiaiDoan | null | undefined,
  caps: readonly HomeCapability[] | ReadonlySet<HomeCapability>,
): HomePreset[] {
  const nen = PRESET_NEN.filter((p) =>
    presetMatchesUser(p, giaiDoan, caps),
  );
  const goi = PRESET_GOI.filter((p) =>
    presetMatchesUser(p, giaiDoan, caps),
  );

  /* Ưu tiên gói gần persona. */
  const goiScore = (p: HomePreset): number => {
    if (persona === "day" && (p.id === "giao_vien" || p.id === "van_hanh_to_chuc")) {
      return 0;
    }
    if (persona === "lam" && (p.id === "chu_shop" || p.id === "mua_hang_su_kien")) {
      return 0;
    }
    if (persona === "hoc" && p.id === "hoc_tap") return 0;
    if (p.id === "hoc_tap" || p.id === "mua_hang_su_kien") return 1;
    if (p.id === "ket_noi") return 2;
    return 1;
  };
  goi.sort((a, b) => goiScore(a) - goiScore(b));

  return [...nen, ...goi];
}

export type ApplyPresetMode = "merge" | "replace";

export type LayoutColumns = {
  left: ModuleId[];
  right: ModuleId[];
  hidden: ModuleId[];
};

export type ApplyPresetResult = {
  layout: LayoutColumns;
  /** Khối mới được chèn (không tính đã có sẵn). */
  added: ModuleId[];
  /** Đã có trên layout — bỏ qua. */
  alreadyPresent: ModuleId[];
  /** Thiếu capability — bỏ. */
  skippedCap: ModuleId[];
  /** Tổng left+right sau áp (trước khi user bỏ để chống tràn). */
  totalAfter: number;
  overflow: boolean;
  /** Số khối cần bỏ để ≤ PRESET_LAYOUT_MAX. */
  needRemove: number;
};

function sideOfInPreset(preset: HomePreset, id: ModuleId): "left" | "right" {
  if (preset.right.includes(id)) return "right";
  return "left";
}

/**
 * Áp bộ vào layout. Idempotent: id đã có → bỏ qua, không nhân bản.
 * Khối đang `hidden` → gỡ hidden và chèn lại khi nằm trong bộ.
 *
 * `merge` (mặc định): chỉ thêm khối thiếu.
 * `replace`: thay hẳn left/right bằng bộ (khối cũ không thuộc bộ → hidden).
 *
 * `ignoreCapabilities`: onboarding intent — ghi đủ khối trong bộ; resolve
 * sau này vẫn ẩn khối thiếu capability cho tới khi user có quyền thật.
 */
export function applyPreset(
  layout: LayoutColumns,
  preset: HomePreset,
  caps: readonly HomeCapability[] | ReadonlySet<HomeCapability>,
  mode: ApplyPresetMode = "merge",
  opts?: { ignoreCapabilities?: boolean },
): ApplyPresetResult {
  const allowed = new Set(
    opts?.ignoreCapabilities
      ? presetModuleIds(preset)
      : filterPresetModules(preset, caps),
  );
  const allInPreset = presetModuleIds(preset);
  const skippedCap = allInPreset.filter((id) => !allowed.has(id));

  if (mode === "replace") {
    const nextLeft: ModuleId[] = [];
    const nextRight: ModuleId[] = [];
    for (const id of preset.left) {
      if (!allowed.has(id)) continue;
      if (!nextLeft.includes(id) && !nextRight.includes(id)) nextLeft.push(id);
    }
    for (const id of preset.right) {
      if (!allowed.has(id)) continue;
      if (!nextLeft.includes(id) && !nextRight.includes(id)) nextRight.push(id);
    }
    const kept = new Set<ModuleId>([...nextLeft, ...nextRight]);
    const prevVisible = [...layout.left, ...layout.right];
    const alreadyPresent = prevVisible.filter((id) => kept.has(id));
    const added = [...kept].filter((id) => !prevVisible.includes(id));
    const hidden = [
      ...layout.hidden.filter((id) => !kept.has(id)),
      ...prevVisible.filter((id) => !kept.has(id)),
    ].filter((id, i, arr) => arr.indexOf(id) === i);

    const totalAfter = nextLeft.length + nextRight.length;
    const needRemove = Math.max(0, totalAfter - PRESET_LAYOUT_MAX);
    return {
      layout: { left: nextLeft, right: nextRight, hidden },
      added,
      alreadyPresent,
      skippedCap,
      totalAfter,
      overflow: needRemove > 0,
      needRemove,
    };
  }

  /* merge */
  const present = new Set<ModuleId>([...layout.left, ...layout.right]);
  const alreadyPresent: ModuleId[] = [];
  const toAdd: ModuleId[] = [];
  for (const id of allInPreset) {
    if (!allowed.has(id)) continue;
    if (present.has(id)) {
      alreadyPresent.push(id);
      continue;
    }
    toAdd.push(id);
  }

  const nextLeft = [...layout.left];
  const nextRight = [...layout.right];
  /* Gỡ khỏi hidden mọi khối thuộc bộ (ý định thắng lần ẩn trước). */
  const nextHidden = layout.hidden.filter((id) => !allowed.has(id));

  for (const id of toAdd) {
    const side = sideOfInPreset(preset, id);
    if (side === "right") nextRight.push(id);
    else nextLeft.push(id);
  }

  const totalAfter = nextLeft.length + nextRight.length;
  const needRemove = Math.max(0, totalAfter - PRESET_LAYOUT_MAX);
  return {
    layout: { left: nextLeft, right: nextRight, hidden: nextHidden },
    added: toAdd,
    alreadyPresent,
    skippedCap,
    totalAfter,
    overflow: needRemove > 0,
    needRemove,
  };
}

/** Gợi ý id nên bỏ khi tràn — passive trước, rồi khối cuối cột. */
export function suggestRemoveForOverflow(
  layout: LayoutColumns,
  needRemove: number,
  protect: ReadonlySet<ModuleId>,
): ModuleId[] {
  if (needRemove <= 0) return [];
  const visible = [...layout.left, ...layout.right];
  const out: ModuleId[] = [];
  const used = new Set<ModuleId>();

  for (const id of PRESET_OVERFLOW_SUGGEST_REMOVE) {
    if (out.length >= needRemove) break;
    if (!visible.includes(id) || protect.has(id) || used.has(id)) continue;
    out.push(id);
    used.add(id);
  }

  for (let i = visible.length - 1; i >= 0 && out.length < needRemove; i--) {
    const id = visible[i];
    if (protect.has(id) || used.has(id)) continue;
    out.push(id);
    used.add(id);
  }

  return out;
}

/** Bỏ các id khỏi left/right → hidden. */
export function removeModulesFromLayout(
  layout: LayoutColumns,
  removeIds: readonly ModuleId[],
): LayoutColumns {
  const drop = new Set(removeIds);
  const left = layout.left.filter((id) => !drop.has(id));
  const right = layout.right.filter((id) => !drop.has(id));
  const hidden = [
    ...layout.hidden.filter((id) => !drop.has(id)),
    ...removeIds.filter((id) => !layout.hidden.includes(id)),
  ];
  return { left, right, hidden };
}

/** Chuẩn hoá mảng da_ap từ jsonb client. */
export function parsePresetDaAp(raw: unknown): PresetId[] {
  if (!Array.isArray(raw)) return [];
  const out: PresetId[] = [];
  const seen = new Set<PresetId>();
  for (const item of raw) {
    if (!isPresetId(item) || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
    if (out.length >= PRESET_DA_AP_MAX) break;
  }
  return out;
}

export function mergePresetDaAp(
  current: readonly PresetId[],
  applied: PresetId,
): PresetId[] {
  if (current.includes(applied)) return [...current];
  const next = [...current, applied];
  return next.slice(-PRESET_DA_AP_MAX);
}

/** Intent tự khai lúc onboarding — map sang gói bổ sung. */
export type OnboardingIntent =
  | "ban_hang"
  | "mua_do"
  | "day_hoc"
  | "van_hanh";

export const ONBOARDING_INTENT_OPTIONS: readonly {
  id: OnboardingIntent;
  label: string;
  hint: string;
  accent: "yellow" | "mint" | "orange" | "violet" | "blue";
  presetId: PresetId;
}[] = [
  {
    id: "ban_hang",
    label: "Bán hàng",
    hint: "Mình có / sẽ mở shop trên CINs.",
    accent: "orange",
    presetId: "chu_shop",
  },
  {
    id: "mua_do",
    label: "Mua đồ",
    hint: "Mình hay đặt hàng / preorder từ shop bạn bè.",
    accent: "mint",
    presetId: "nguoi_mua",
  },
  {
    id: "day_hoc",
    label: "Dạy học",
    hint: "Mình dạy lớp, mentor, hoặc chấm bài.",
    accent: "blue",
    presetId: "giao_vien",
  },
  {
    id: "van_hanh",
    label: "Vận hành tổ chức",
    hint: "Mình quản lý cơ sở / studio / cộng đồng / sự kiện.",
    accent: "violet",
    presetId: "van_hanh_to_chuc",
  },
];

const INTENT_SET = new Set<string>(
  ONBOARDING_INTENT_OPTIONS.map((o) => o.id),
);

export function isOnboardingIntent(v: unknown): v is OnboardingIntent {
  return typeof v === "string" && INTENT_SET.has(v);
}

export function parseOnboardingIntents(raw: unknown): OnboardingIntent[] {
  if (!Array.isArray(raw)) return [];
  const out: OnboardingIntent[] = [];
  const seen = new Set<OnboardingIntent>();
  for (const item of raw) {
    if (!isOnboardingIntent(item) || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

/** Bộ nền theo giai đoạn — học viên mới → Khám phá (chưa ghi danh). */
export function nenPresetIdForGiaiDoan(
  giaiDoan: GiaiDoan,
): PresetId | null {
  switch (giaiDoan) {
    case "dang_hoc":
      return "kham_pha";
    case "dang_lam":
      return "di_lam";
    case "freelance":
    case "tim_viec":
      return "freelancer";
    case "dang_day":
      return null;
    default:
      return "kham_pha";
  }
}

/**
 * Dựng home_layout từ giai đoạn + intent onboarding.
 * Không lọc capability — khối gắn quyền sẽ hiện khi user có quyền thật.
 * Cắt về ≤ PRESET_LAYOUT_MAX bằng cách bỏ khối passive trước.
 */
export function buildOnboardingHomeLayout(
  giaiDoan: GiaiDoan,
  intents: readonly OnboardingIntent[],
): {
  v: number;
  left: ModuleId[];
  right: ModuleId[];
  hidden: ModuleId[];
  preset: { da_ap: PresetId[]; at: string };
  at: string;
} {
  const da_ap: PresetId[] = [];
  let layout: LayoutColumns = { left: [], right: [], hidden: [] };

  const nenId = nenPresetIdForGiaiDoan(giaiDoan);
  if (nenId) {
    const nen = getPreset(nenId);
    if (nen) {
      layout = applyPreset(layout, nen, [], "replace", {
        ignoreCapabilities: true,
      }).layout;
      da_ap.push(nenId);
    }
  }

  for (const intent of intents) {
    const opt = ONBOARDING_INTENT_OPTIONS.find((o) => o.id === intent);
    if (!opt) continue;
    const goi = getPreset(opt.presetId);
    if (!goi) continue;
    layout = applyPreset(layout, goi, [], "merge", {
      ignoreCapabilities: true,
    }).layout;
    if (!da_ap.includes(opt.presetId)) da_ap.push(opt.presetId);
  }

  /* Chống tràn — bỏ passive trước, rồi khối cuối. */
  let total = layout.left.length + layout.right.length;
  if (total > PRESET_LAYOUT_MAX) {
    const need = total - PRESET_LAYOUT_MAX;
    const protect = new Set<ModuleId>();
    /* Bảo vệ khối vận hành quan trọng nếu có trong layout. */
    for (const id of [
      "don_can_xu_ly",
      "lop_hoc_cua_ban",
      "cho_ban_duyet",
      "co_hoi",
      "ho_so_cua_ban",
    ] as ModuleId[]) {
      if (
        layout.left.includes(id) ||
        layout.right.includes(id)
      ) {
        protect.add(id);
      }
    }
    const remove = suggestRemoveForOverflow(layout, need, protect);
    layout = removeModulesFromLayout(layout, remove);
  }

  const at = new Date().toISOString();
  return {
    v: 2,
    left: layout.left,
    right: layout.right,
    hidden: layout.hidden,
    preset: { da_ap, at },
    at,
  };
}
