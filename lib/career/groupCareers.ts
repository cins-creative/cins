import { boPhanTen } from "@/lib/career/boPhanDisplay";
import type { NgheNghiepHubItem } from "@/lib/career/types";

export type BoPhanGroup = {
  id: string;
  boPhan: string;
  /** Mô tả bộ phận từ `nn_bo_phan.mo_ta` (khi join CSDL) */
  mo_ta: string | null;
  careers: NgheNghiepHubItem[];
};

/**
 * Thứ tự hiển thị bộ phận trên hub: gần với quy trình sản xuất sáng tạo
 * (quản lý → tiền kỳ → sản xuất → hậu kỳ → kỹ thuật/QA/…).
 * Mỗi tầng là danh sách chuỗi con (không phân biệt hoa thường);
 * tầng đầu tiên khớp được dùng. Nhãn không khớp tầng nào xếp cuối (theo locale vi).
 */
const BO_PHAN_PIPELINE: readonly (readonly string[])[] = [
  // Quản lý, điều hành, producer cấp dự án / studio
  [
    "quản lý",
    "điều hành",
    "management",
    "executive",
    "leadership",
    "nhân sự",
    "human resources",
    "giám đốc điều hành",
    "executive producer",
    "line producer",
    "studio head",
    "head of production",
    "production manager",
    "project manager",
    "producer",
    "product owner",
  ],
  // Tiền sản xuất: ý tưởng, kịch bản, concept, thiết kế đầu kỳ (tránh từ "character" đơn độc — dễ trùng animator)
  [
    "tiền sản xuất",
    "tiền kỳ",
    "pre-production",
    "preproduction",
    "storyboard",
    "kịch bản",
    "screenplay",
    "writer",
    "concept art",
    "character concept",
    "environment concept",
    "worldbuilding",
    "development art",
    "visual development",
    "art direction", // đôi khi giai đoạn đầu; nếu CSDL dùng khác có thể tinh chỉnh
    "creative direction",
  ],
  // Sản xuất trung tâm: asset, hoạt hình, dựng hình, FX trong pipeline chính
  [
    "sản xuất",
    "production",
    "animation",
    "animator",
    "modeling",
    "modelling",
    "rigging",
    "lighting artist",
    "texturing",
    "layout",
    "effects artist",
    "simulation",
    "character animation",
    "3d artist",
    "2d artist",
  ],
  // Hậu kỳ: chỉnh sửa, hợp thành, âm thanh, hoàn thiện
  [
    "hậu kỳ",
    "post-production",
    "postproduction",
    "post production",
    "compositing",
    "editing",
    "color grading",
    "sound design",
    "mastering",
    "finishing",
    "online edit",
  ],
  // Kỹ thuật: pipeline, công cụ, kỹ thuật dựng
  [
    "kỹ thuật",
    "technical director",
    "pipeline",
    "tools",
    "tooling",
    "td",
    "r&d",
    "engineering",
    "shader",
    "programming",
    "developer",
  ],
  ["qa", "quality assurance", "testing", "đảm bảo chất lượng"],
  ["marketing", "community", "brand", "growth"],
  ["education", "training", "instructor", "đào tạo"],
];

const OTHER_LABEL = "Khác";

function normalizeForMatch(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

function boPhanPipelineIndex(label: string): number | null {
  const norm = normalizeForMatch(label);
  for (let tier = 0; tier < BO_PHAN_PIPELINE.length; tier++) {
    const patterns = BO_PHAN_PIPELINE[tier];
    for (const p of patterns) {
      if (norm.includes(normalizeForMatch(p))) return tier;
    }
  }
  return null;
}

/** 0 = quản lý… → 7 = đào tạo; `null` = không khớp pipeline */
export function boPhanPipelineTier(label: string): number | null {
  return boPhanPipelineIndex(label);
}

function compareBoPhanLabelOrder(a: string, b: string): number {
  const unknownRank = 999;
  const lastRank = 10_000;
  const rank = (label: string) => {
    if (label === OTHER_LABEL) return lastRank;
    return boPhanPipelineIndex(label) ?? unknownRank;
  };
  const ra = rank(a);
  const rb = rank(b);
  if (ra !== rb) return ra - rb;
  return a.localeCompare(b, "vi");
}

function clusterKey(item: NgheNghiepHubItem): string {
  if (item.nn_bo_phan_id) return `id:${item.nn_bo_phan_id}`;
  const label = boPhanTen(item) ?? OTHER_LABEL;
  return `legacy:${label}`;
}

function moTaFromGroup(careers: NgheNghiepHubItem[]): string | null {
  for (const it of careers) {
    const m = it.nn_bo_phan?.mo_ta?.trim();
    if (m) return m;
  }
  return null;
}

/** Nhóm nghề theo bộ phận (heading section trong hub) */
export function groupCareersByBoPhan(
  items: NgheNghiepHubItem[],
): BoPhanGroup[] {
  const map = new Map<string, NgheNghiepHubItem[]>();
  for (const item of items) {
    const key = clusterKey(item);
    const arr = map.get(key) ?? [];
    arr.push(item);
    map.set(key, arr);
  }

  const sorted = Array.from(map.entries())
    .map(([_, careers]) => {
      const label = boPhanTen(careers[0]!) ?? OTHER_LABEL;
      return {
        sortLabel: label,
        boPhan: label,
        mo_ta: moTaFromGroup(careers),
        careers,
      };
    })
    .sort((a, b) => compareBoPhanLabelOrder(a.sortLabel, b.sortLabel));

  return sorted.map((g, i) => ({
    id: `career-sec-${i}`,
    boPhan: g.boPhan,
    mo_ta: g.mo_ta,
    careers: g.careers,
  }));
}
