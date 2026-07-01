import type { GiaiDoan } from "@/lib/cins/home-adaptive/persona";
import { giaiDoanLabel } from "@/lib/cins/home-adaptive/labels";

/** Các `giai_doan` có thể chọn khi phân phối tin tuyển dụng. */
export const TUYEN_DUNG_GIAI_DOAN_OPTIONS: ReadonlyArray<{
  value: GiaiDoan;
  label: string;
  hint: string;
}> = [
  {
    value: "moi_bat_dau",
    label: "Mới bắt đầu",
    hint: "Người mới vào ngành sáng tạo",
  },
  {
    value: "dang_hoc",
    label: "Đang học",
    hint: "Sinh viên / đang đào tạo",
  },
  {
    value: "dang_lam",
    label: "Đang đi làm",
    hint: "Đã có việc, có thể open to switch",
  },
  {
    value: "tim_viec",
    label: "Đang tìm việc",
    hint: "Ưu tiên cao trên module Cơ hội",
  },
  {
    value: "freelance",
    label: "Freelance",
    hint: "Nhận dự án / hợp đồng ngắn hạn",
  },
  {
    value: "dang_day",
    label: "Giáo viên",
    hint: "Có thể quan tâm vị trí part-time / mentor",
  },
] as const;

/** Mặc định khi org không chọn — cụm LÀM (brief §6). */
export const TUYEN_DUNG_GIAI_DOAN_DEFAULT: GiaiDoan[] = [
  "dang_lam",
  "tim_viec",
  "freelance",
];

const GIAI_DOAN_SET = new Set<string>(
  TUYEN_DUNG_GIAI_DOAN_OPTIONS.map((o) => o.value),
);

export function normalizeGiaiDoanMucTieu(
  raw: string[] | null | undefined,
): GiaiDoan[] {
  if (!raw?.length) return [...TUYEN_DUNG_GIAI_DOAN_DEFAULT];
  const out: GiaiDoan[] = [];
  for (const item of raw) {
    const key = item?.trim();
    if (key && GIAI_DOAN_SET.has(key) && !out.includes(key as GiaiDoan)) {
      out.push(key as GiaiDoan);
    }
  }
  return out.length > 0 ? out : [...TUYEN_DUNG_GIAI_DOAN_DEFAULT];
}

export function giaiDoanMucTieuLabels(values: GiaiDoan[]): string[] {
  return values.map((v) => giaiDoanLabel(v));
}

/** Tin có hiển thị cho viewer theo `giai_doan` không. */
export function jobMatchesViewerGiaiDoan(
  jobTargets: GiaiDoan[] | null | undefined,
  viewerGiaiDoan: GiaiDoan | null | undefined,
): boolean {
  const targets = normalizeGiaiDoanMucTieu(jobTargets ?? undefined);
  if (!viewerGiaiDoan) return false;
  return targets.includes(viewerGiaiDoan);
}

export const STUDIO_JOB_CAP_DO_OPTIONS = [
  { value: "", label: "— Chưa chọn —" },
  { value: "intern", label: "Intern / Thực tập" },
  { value: "fresher", label: "Fresher / Mới ra trường" },
  { value: "junior", label: "Junior" },
  { value: "middle", label: "Middle" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead" },
  { value: "director", label: "Director trở lên" },
] as const;
