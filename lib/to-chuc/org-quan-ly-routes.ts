import { coSoRootPath } from "@/lib/to-chuc/co-so-routes";
import { studioRootPath } from "@/lib/to-chuc/studio-routes";
import { truongRootPath } from "@/lib/truong/truong-routes";

/** Các loại org có dashboard `/quan-ly`. */
export type OrgQuanLyKind =
  | "co_so_dao_tao"
  | "truong_dai_hoc"
  | "studio"
  | "doanh_nghiep";

/**
 * Section dùng chung.
 * - co_so: `marketing` / `chi-nhanh` là alias legacy.
 * - studio: `marketing` là mục thật; `thong-tin` = thông tin studio.
 */
export type OrgQuanLySection =
  | "tong-quan"
  | "co-so"
  | "thong-tin"
  | "chi-nhanh"
  | "lop-hoc"
  | "giao-trinh"
  | "hoc-vien"
  | "diem-danh"
  | "doanh-thu"
  | "su-kien"
  | "tin-nhan"
  | "cai-dat"
  | "marketing";

/** chi-nhanh luôn alias; marketing chỉ alias trên cơ sở. */
export type OrgQuanLySectionResolved = Exclude<OrgQuanLySection, "chi-nhanh">;

export type OrgQuanLyNavItem = {
  id: Exclude<OrgQuanLySectionResolved, "tin-nhan" | "cai-dat">;
  label: string;
};

export type OrgQuanLyNavGroup = {
  id: string;
  items: OrgQuanLyNavItem[];
};

/** IA cơ sở: 4 cụm — Tổng quan | Thiết lập | Học | Tiền. */
const CO_SO_NAV_GROUPS: OrgQuanLyNavGroup[] = [
  {
    id: "tong-quan",
    items: [{ id: "tong-quan", label: "Tổng quan" }],
  },
  {
    id: "thiet-lap",
    items: [{ id: "co-so", label: "Cơ sở" }],
  },
  {
    id: "hoc",
    items: [
      { id: "lop-hoc", label: "Khóa & lớp" },
      { id: "giao-trinh", label: "Giáo trình" },
      { id: "hoc-vien", label: "Học viên" },
      { id: "diem-danh", label: "Điểm danh" },
    ],
  },
  {
    id: "tien",
    items: [{ id: "doanh-thu", label: "Doanh thu" }],
  },
];

/** Studio: Tổng quan | Studio + Marketing + Sự kiện (Tin nhắn / Cài đặt ở trail). */
const STUDIO_NAV_GROUPS: OrgQuanLyNavGroup[] = [
  {
    id: "tong-quan",
    items: [{ id: "tong-quan", label: "Tổng quan" }],
  },
  {
    id: "thiet-lap",
    items: [
      { id: "thong-tin", label: "Studio" },
      { id: "marketing", label: "Marketing" },
      { id: "su-kien", label: "Sự kiện" },
    ],
  },
];

/** Trường đợt này: vẫn chỉ tin nhắn (trail). */
const TIN_NHAN_ONLY_NAV: OrgQuanLyNavGroup[] = [];

export const ORG_QUAN_LY_NAV: Record<OrgQuanLyKind, OrgQuanLyNavGroup[]> = {
  co_so_dao_tao: CO_SO_NAV_GROUPS,
  truong_dai_hoc: TIN_NHAN_ONLY_NAV,
  studio: STUDIO_NAV_GROUPS,
  doanh_nghiep: STUDIO_NAV_GROUPS,
};

const STUDIO_SECTIONS = new Set<OrgQuanLySectionResolved>([
  "tong-quan",
  "thong-tin",
  "marketing",
  "su-kien",
  "tin-nhan",
  "cai-dat",
]);

/** Section mặc định khi vào `/quan-ly` (index redirect). */
export function orgQuanLyDefaultSection(
  kind: OrgQuanLyKind,
): OrgQuanLySectionResolved {
  if (kind === "truong_dai_hoc") return "tin-nhan";
  return "tong-quan";
}

/** Marketing → tong-quan · chi-nhanh → co-so (chỉ cơ sở). Studio giữ marketing. */
export function resolveOrgQuanLySection(
  kind: OrgQuanLyKind,
  section?: OrgQuanLySection | null,
): OrgQuanLySectionResolved {
  if (kind === "co_so_dao_tao") {
    if (!section || section === "tong-quan" || section === "marketing") {
      return "tong-quan";
    }
    if (section === "chi-nhanh") return "co-so";
    if (section === "thong-tin") return "co-so";
    return section;
  }

  if (kind === "studio" || kind === "doanh_nghiep") {
    if (!section) return "tong-quan";
    if (section === "chi-nhanh" || section === "co-so") return "thong-tin";
    if (STUDIO_SECTIONS.has(section as OrgQuanLySectionResolved)) {
      return section as OrgQuanLySectionResolved;
    }
    return "tong-quan";
  }

  /* Trường: mọi section lạ → tin-nhan. */
  if (section === "tin-nhan") return "tin-nhan";
  return "tin-nhan";
}

export function orgQuanLyBasePath(kind: OrgQuanLyKind, slug: string): string {
  if (kind === "co_so_dao_tao") return `${coSoRootPath(slug)}/quan-ly`;
  if (kind === "truong_dai_hoc") return `${truongRootPath(slug)}/quan-ly`;
  return `${studioRootPath(slug)}/quan-ly`;
}

export function orgQuanLyPath(
  kind: OrgQuanLyKind,
  slug: string,
  section?: OrgQuanLySection,
): string {
  const base = orgQuanLyBasePath(kind, slug);
  const resolved = resolveOrgQuanLySection(kind, section);
  return `${base}/${resolved}`;
}

/** Org kind có dashboard quản lý (ẩn nút «Mở» với cong_dong). */
export function isOrgQuanLyKind(value: string | null | undefined): value is OrgQuanLyKind {
  return (
    value === "co_so_dao_tao" ||
    value === "truong_dai_hoc" ||
    value === "studio" ||
    value === "doanh_nghiep"
  );
}

/** Trail: hiện milestone notify (chỉ cơ sở + trường). */
export function orgQuanLyShowsMilestoneNotify(kind: OrgQuanLyKind): boolean {
  return kind === "co_so_dao_tao" || kind === "truong_dai_hoc";
}

/** Trail: hiện Cài đặt tối cao (founder). */
export function orgQuanLyShowsCaiDat(kind: OrgQuanLyKind): boolean {
  return (
    kind === "co_so_dao_tao" ||
    kind === "studio" ||
    kind === "doanh_nghiep"
  );
}
