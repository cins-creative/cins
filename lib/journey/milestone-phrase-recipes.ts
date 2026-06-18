import type { LoaiMoc } from "@/lib/editor/types";
import type {
  MembershipMilestoneOrgLoai,
  MembershipMilestoneSlotMonthYear,
  MembershipMilestoneSlotValues,
} from "@/lib/journey/membership-milestone-types";

export type PhraseRecipeId = "bat_dau_hoc" | "bat_dau_lam" | "hoan_thanh_khoa";

export type PhraseCategoryId = "hoc" | "lam" | "xong";

export type PhraseFragment =
  | { kind: "text"; text: string }
  | { kind: "slot"; key: keyof MembershipMilestoneSlotValues };

export type SlotInputKind =
  | "enum"
  | "org_search"
  | "attach_option"
  | "role_text"
  | "month_year";

export type SlotDef = {
  key: keyof MembershipMilestoneSlotValues;
  label: string;
  input: SlotInputKind;
  required: boolean;
  dependsOn?: Array<keyof MembershipMilestoneSlotValues>;
  enumOptions?: ReadonlyArray<{ value: string; label: string }>;
  /** Nhãn slot `context` thay đổi theo loại org. */
  contextLabelForOrg?: Partial<Record<MembershipMilestoneOrgLoai, string>>;
};

export type PhraseRecipe = {
  id: PhraseRecipeId;
  category: PhraseCategoryId;
  categoryLabel: string;
  loaiMoc: LoaiMoc;
  fragments: ReadonlyArray<PhraseFragment>;
  slotOrder: ReadonlyArray<keyof MembershipMilestoneSlotValues>;
  slots: ReadonlyArray<SlotDef>;
  orgLoai: ReadonlyArray<MembershipMilestoneOrgLoai>;
  evidenceHint: string;
};

export const PHRASE_CATEGORIES: ReadonlyArray<{
  id: PhraseCategoryId;
  label: string;
  recipeId: PhraseRecipeId;
}> = [
  { id: "hoc", label: "Học tập", recipeId: "bat_dau_hoc" },
  { id: "lam", label: "Việc làm", recipeId: "bat_dau_lam" },
  { id: "xong", label: "Hoàn thành", recipeId: "hoan_thanh_khoa" },
];

const HANH_DONG_HOC: SlotDef["enumOptions"] = [
  { value: "bat_dau_hoc", label: "Bắt đầu học" },
  { value: "quay_lai_hoc", label: "Quay lại học" },
  { value: "hoan_thanh_khoa_hoc", label: "Hoàn thành khóa học" },
  { value: "tot_nghiep", label: "Tốt nghiệp" },
];

const HANH_DONG_LAM: SlotDef["enumOptions"] = [
  { value: "bat_dau_lam", label: "Bắt đầu làm" },
  { value: "quay_lai_lam", label: "Quay lại làm" },
  { value: "freelance_cho", label: "Freelance cho" },
];

const HANH_DONG_XONG: SlotDef["enumOptions"] = [
  { value: "hoan_thanh_khoa", label: "Hoàn thành khóa" },
  { value: "tot_nghiep_khoa", label: "Tốt nghiệp khóa" },
];

const VAI_TRO_HOC: SlotDef["enumOptions"] = [
  { value: "hoc_vien", label: "Học viên" },
  { value: "sinh_vien", label: "Sinh viên" },
  { value: "hoc_bong", label: "Học bổng" },
];

export const VITRI_SUGGESTIONS: ReadonlyArray<string> = [
  "Concept Artist",
  "3D Artist",
  "Animator",
  "UI/UX Designer",
  "Motion Designer",
  "VFX Artist",
  "Illustrator",
  "Art Director",
  "Game Designer",
  "Character Designer",
  "Environment Artist",
];

const BAT_DAU_HOC_SLOTS_START: PhraseRecipe["slots"] = [
  {
    key: "hanh_dong",
    label: "Hành động",
    input: "enum",
    required: true,
    enumOptions: HANH_DONG_HOC,
  },
  {
    key: "to_chuc",
    label: "Tổ chức",
    input: "org_search",
    required: true,
    dependsOn: ["hanh_dong"],
  },
  {
    key: "vai_tro",
    label: "Vai trò",
    input: "enum",
    required: true,
    dependsOn: ["to_chuc"],
    enumOptions: VAI_TRO_HOC,
  },
  {
    key: "context",
    label: "Ngành / khóa",
    input: "attach_option",
    required: true,
    dependsOn: ["to_chuc"],
    contextLabelForOrg: {
      truong_dai_hoc: "ngành",
      co_so_dao_tao: "khóa",
    },
  },
  {
    key: "thoi_diem",
    label: "Thời điểm",
    input: "month_year",
    required: true,
    dependsOn: ["context"],
  },
];

const BAT_DAU_HOC_SLOTS_COMPLETE: PhraseRecipe["slots"] = [
  {
    key: "hanh_dong",
    label: "Hành động",
    input: "enum",
    required: true,
    enumOptions: HANH_DONG_HOC,
  },
  {
    key: "to_chuc",
    label: "Tổ chức",
    input: "org_search",
    required: true,
    dependsOn: ["hanh_dong"],
  },
  {
    key: "context",
    label: "Ngành / khóa",
    input: "attach_option",
    required: true,
    dependsOn: ["to_chuc"],
    contextLabelForOrg: {
      truong_dai_hoc: "ngành",
      co_so_dao_tao: "khóa",
    },
  },
  {
    key: "thoi_diem",
    label: "Thời điểm",
    input: "month_year",
    required: true,
    dependsOn: ["context"],
  },
];

export const MILESTONE_PHRASE_RECIPES: Record<PhraseRecipeId, PhraseRecipe> = {
  bat_dau_hoc: {
    id: "bat_dau_hoc",
    category: "hoc",
    categoryLabel: "Học tập",
    loaiMoc: "hoc",
    orgLoai: ["truong_dai_hoc", "co_so_dao_tao"],
    evidenceHint:
      "Thẻ học viên, email ghi danh hoặc ảnh chụp portal đăng ký.",
    fragments: [
      { kind: "slot", key: "hanh_dong" },
      { kind: "text", text: " tại " },
      { kind: "slot", key: "to_chuc" },
      { kind: "text", text: " với vai trò " },
      { kind: "slot", key: "vai_tro" },
      { kind: "text", text: " · " },
      { kind: "slot", key: "context" },
      { kind: "text", text: " · từ " },
      { kind: "slot", key: "thoi_diem" },
    ],
    slotOrder: ["hanh_dong", "to_chuc", "vai_tro", "context", "thoi_diem"],
    slots: BAT_DAU_HOC_SLOTS_START,
  },
  bat_dau_lam: {
    id: "bat_dau_lam",
    category: "lam",
    categoryLabel: "Việc làm",
    loaiMoc: "lam_viec",
    orgLoai: ["studio"],
    evidenceHint:
      "Email offer, hợp đồng (che thông tin nhạy cảm) hoặc xác nhận từ HR.",
    fragments: [
      { kind: "slot", key: "hanh_dong" },
      { kind: "text", text: " tại " },
      { kind: "slot", key: "to_chuc" },
      { kind: "text", text: " với vai trò " },
      { kind: "slot", key: "vi_tri" },
      { kind: "text", text: " · từ " },
      { kind: "slot", key: "thoi_diem" },
    ],
    slotOrder: ["hanh_dong", "to_chuc", "vi_tri", "thoi_diem"],
    slots: [
      {
        key: "hanh_dong",
        label: "Hành động",
        input: "enum",
        required: true,
        enumOptions: HANH_DONG_LAM,
      },
      {
        key: "to_chuc",
        label: "Studio",
        input: "org_search",
        required: true,
        dependsOn: ["hanh_dong"],
      },
      {
        key: "vi_tri",
        label: "Vị trí",
        input: "role_text",
        required: true,
        dependsOn: ["to_chuc"],
      },
      {
        key: "thoi_diem",
        label: "Thời điểm",
        input: "month_year",
        required: true,
        dependsOn: ["vi_tri"],
      },
    ],
  },
  hoan_thanh_khoa: {
    id: "hoan_thanh_khoa",
    category: "xong",
    categoryLabel: "Hoàn thành",
    loaiMoc: "thanh_tuu",
    orgLoai: ["co_so_dao_tao"],
    evidenceHint: "Chứng chỉ hoàn thành hoặc ảnh lễ tốt nghiệp lớp.",
    fragments: [
      { kind: "slot", key: "hanh_dong" },
      { kind: "text", text: " khóa " },
      { kind: "slot", key: "context" },
      { kind: "text", text: " tại " },
      { kind: "slot", key: "to_chuc" },
      { kind: "text", text: " · " },
      { kind: "slot", key: "thoi_diem" },
    ],
    slotOrder: ["hanh_dong", "to_chuc", "context", "thoi_diem"],
    slots: [
      {
        key: "hanh_dong",
        label: "Hành động",
        input: "enum",
        required: true,
        enumOptions: HANH_DONG_XONG,
      },
      {
        key: "to_chuc",
        label: "Cơ sở đào tạo",
        input: "org_search",
        required: true,
        dependsOn: ["hanh_dong"],
      },
      {
        key: "context",
        label: "Khóa học",
        input: "attach_option",
        required: true,
        dependsOn: ["to_chuc"],
      },
      {
        key: "thoi_diem",
        label: "Thời điểm",
        input: "month_year",
        required: true,
        dependsOn: ["context"],
      },
    ],
  },
};

export function isHocStartAction(hanhDongValue: string | undefined): boolean {
  return (
    !hanhDongValue ||
    hanhDongValue === "bat_dau_hoc" ||
    hanhDongValue === "quay_lai_hoc"
  );
}

/** Recipe hiệu lực — `bat_dau_hoc` đổi cấu trúc câu theo hành động đã chọn. */
export function getEffectivePhraseRecipe(
  recipeId: PhraseRecipeId,
  values: MembershipMilestoneSlotValues,
): PhraseRecipe {
  const base = MILESTONE_PHRASE_RECIPES[recipeId];
  if (recipeId !== "bat_dau_hoc") return base;

  const hd = values.hanh_dong?.value;
  if (isHocStartAction(hd)) return base;

  if (hd === "hoan_thanh_khoa_hoc") {
    return {
      ...base,
      loaiMoc: "thanh_tuu",
      evidenceHint: "Chứng chỉ hoàn thành hoặc ảnh lễ tốt nghiệp lớp.",
      fragments: [
        { kind: "slot", key: "hanh_dong" },
        { kind: "text", text: " " },
        { kind: "slot", key: "context" },
        { kind: "text", text: " tại " },
        { kind: "slot", key: "to_chuc" },
        { kind: "text", text: " · từ " },
        { kind: "slot", key: "thoi_diem" },
      ],
      slotOrder: ["hanh_dong", "to_chuc", "context", "thoi_diem"],
      slots: BAT_DAU_HOC_SLOTS_COMPLETE,
    };
  }

  if (hd === "tot_nghiep") {
    return {
      ...base,
      loaiMoc: "thanh_tuu",
      evidenceHint: "Bằng tốt nghiệp, giấy chứng nhận hoặc ảnh lễ tốt nghiệp.",
      fragments: [
        { kind: "slot", key: "hanh_dong" },
        { kind: "text", text: " tại " },
        { kind: "slot", key: "to_chuc" },
        { kind: "text", text: " · " },
        { kind: "slot", key: "context" },
        { kind: "text", text: " · từ " },
        { kind: "slot", key: "thoi_diem" },
      ],
      slotOrder: ["hanh_dong", "to_chuc", "context", "thoi_diem"],
      slots: BAT_DAU_HOC_SLOTS_COMPLETE,
    };
  }

  return base;
}

function slotLabel(
  recipe: PhraseRecipe,
  key: keyof MembershipMilestoneSlotValues,
  values: MembershipMilestoneSlotValues,
): string {
  const def = recipe.slots.find((s) => s.key === key);
  if (key === "context" && def?.contextLabelForOrg && values.to_chuc) {
    const orgLabel = def.contextLabelForOrg[values.to_chuc.loaiToChuc];
    if (orgLabel) return orgLabel;
  }
  return def?.label ?? String(key);
}

function formatMonthYear(my: MembershipMilestoneSlotValues["thoi_diem"]): string {
  if (!my) return "…";
  return `${my.month}/${my.year}`;
}

function resolveSlotText(
  recipe: PhraseRecipe,
  key: keyof MembershipMilestoneSlotValues,
  values: MembershipMilestoneSlotValues,
): string | null {
  const v = values[key];
  if (!v) return null;
  if ("label" in v && "value" in v && typeof v.label === "string") {
    return v.label;
  }
  if ("ten" in v && typeof v.ten === "string") return v.ten;
  if ("value" in v && typeof v.value === "string" && !("label" in v)) {
    return v.value;
  }
  if ("month" in v && "year" in v) return formatMonthYear(v);
  if ("id" in v && "label" in v && typeof v.label === "string") return v.label;
  return null;
}

export function assembleMilestoneTitle(
  recipe: PhraseRecipe,
  values: MembershipMilestoneSlotValues,
): string {
  let out = "";
  for (const frag of recipe.fragments) {
    if (frag.kind === "text") {
      out += frag.text;
      continue;
    }
    const text = resolveSlotText(recipe, frag.key, values);
    out += text ?? slotLabel(recipe, frag.key, values);
  }
  return out.replace(/\s+/g, " ").trim();
}

export function assembleMilestoneMoTa(
  recipe: PhraseRecipe,
  values: MembershipMilestoneSlotValues,
): string {
  const org = values.to_chuc?.ten;
  const parts = [recipe.categoryLabel];
  if (org) parts.push(org);
  parts.push("Chờ xác nhận");
  return parts.join(" · ");
}

export function defaultMonthYear(): MembershipMilestoneSlotMonthYear {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export function isSlotEnabled(
  recipe: PhraseRecipe,
  key: keyof MembershipMilestoneSlotValues,
  values: MembershipMilestoneSlotValues,
): boolean {
  const def = recipe.slots.find((s) => s.key === key);
  if (!def) return false;
  if (!def.dependsOn?.length) return true;
  return def.dependsOn.every((dep) => Boolean(values[dep]));
}

export function isRecipeComplete(
  recipe: PhraseRecipe,
  values: MembershipMilestoneSlotValues,
): boolean {
  return recipe.slots
    .filter((s) => s.required)
    .every((s) => {
      if (!isSlotEnabled(recipe, s.key, values)) return false;
      return Boolean(values[s.key]);
    });
}

export function slotPlaceholder(
  recipe: PhraseRecipe,
  key: keyof MembershipMilestoneSlotValues,
  values: MembershipMilestoneSlotValues,
): string {
  const label = slotLabel(recipe, key, values);
  if (key === "to_chuc") return "chọn tổ chức";
  if (key === "vi_tri") return "vị trí";
  if (key === "thoi_diem") return "tháng/năm";
  return label.toLowerCase();
}

export function dependentsOf(
  recipe: PhraseRecipe,
  changedKey: keyof MembershipMilestoneSlotValues,
): Array<keyof MembershipMilestoneSlotValues> {
  const out: Array<keyof MembershipMilestoneSlotValues> = [];
  for (const slot of recipe.slots) {
    if (slot.dependsOn?.includes(changedKey)) {
      out.push(slot.key);
      out.push(...dependentsOf(recipe, slot.key));
    }
  }
  return [...new Set(out)];
}

export function thoiDiemIsoFromSlot(my: MembershipMilestoneSlotMonthYear): string {
  const month = String(my.month).padStart(2, "0");
  return `${my.year}-${month}-01`;
}
