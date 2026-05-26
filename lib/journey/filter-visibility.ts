/* ╔══════════════════════════════════════════════════════════════════╗
   ║ Journey filter visibility — per-loai_moc public/private flag.    ║
   ║                                                                  ║
   ║ Source of truth: `user_nguoi_dung.journey_loai_moc_visibility`   ║
   ║ JSONB. Keys = `loai_moc_enum` (`hoc / lam_viec / du_an / ...`).  ║
   ║ Missing key = public (default).                                  ║
   ║                                                                  ║
   ║ UI keys (FilterGroup) khác DB enum (`lam`, `du-an`, …) → cần map ║
   ║ 2 chiều: lúc render dropdown đọc theo UI key, lúc lưu DB ghi     ║
   ║ enum value.                                                      ║
   ╚══════════════════════════════════════════════════════════════════╝ */

import type { MilestoneType } from "@/components/journey/milestone-types";

/** Built-in loai_moc filter groups. KHÔNG bao gồm "all" / "verified" / "bookmark" — chúng không có visibility (luôn public). */
export type LoaiMocFilterKey = MilestoneType;

export type FilterVisibility = "public" | "private";

export type LoaiMocVisibilityMap = Partial<
  Record<LoaiMocFilterKey, FilterVisibility>
>;

/** UI key (kebab) → DB enum value (snake). Khớp `LOAI_MOC_TO_TYPE` trong `milestones-fetch.ts`. */
const UI_TO_DB: Record<LoaiMocFilterKey, string> = {
  hoc: "hoc",
  lam: "lam_viec",
  "du-an": "du_an",
  "su-kien": "su_kien",
  "thanh-tuu": "thanh_tuu",
  "ca-nhan": "ca_nhan",
  bookmark: "bookmark", // không phải loai_moc thật; sẽ bị filter ra ở loader
};

const DB_TO_UI: Record<string, LoaiMocFilterKey> = {
  hoc: "hoc",
  lam_viec: "lam",
  du_an: "du-an",
  su_kien: "su-kien",
  thanh_tuu: "thanh-tuu",
  ca_nhan: "ca-nhan",
};

export function uiKeyToDbEnum(key: LoaiMocFilterKey): string | null {
  if (key === "bookmark") return null;
  return UI_TO_DB[key] ?? null;
}

/** Parse JSONB raw → typed map (UI keys). Bỏ qua key không hợp lệ. */
export function normalizeLoaiMocVisibility(
  raw: unknown,
): LoaiMocVisibilityMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: LoaiMocVisibilityMap = {};
  for (const [dbKey, value] of Object.entries(raw as Record<string, unknown>)) {
    const uiKey = DB_TO_UI[dbKey];
    if (!uiKey) continue;
    if (value === "private") out[uiKey] = "private";
    else if (value === "public") out[uiKey] = "public";
    /* Other values ignored — fallback to default public. */
  }
  return out;
}

/** Filter mặc định = public nếu không có entry. */
export function getVisibility(
  map: LoaiMocVisibilityMap,
  key: LoaiMocFilterKey,
): FilterVisibility {
  return map[key] ?? "public";
}
