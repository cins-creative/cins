import type { ArticleCard, LoaiBaiViet } from "@/lib/articles/types";
import { labelLoaiQuanHe } from "@/lib/articles/quan-he-labels";

export const REL_GRADIENTS = [
  "linear-gradient(135deg,#3F8DFD,#0C50B8)",
  "linear-gradient(135deg,#6EFEC0,#0E5C3B)",
  "linear-gradient(135deg,#FE7745,#B53711)",
  "linear-gradient(135deg,#BB89F8,#5C2BB6)",
  "linear-gradient(135deg,#F0D94A,#9A6E00)",
  "linear-gradient(135deg,#F5792A,#E87B16)",
  "linear-gradient(135deg,#0696D7,#005AAB)",
  "linear-gradient(135deg,#A41F1F,#691010)",
  "linear-gradient(135deg,#FF8400,#E55D00)",
  "linear-gradient(135deg,#1E88E5,#0D47A1)",
  "linear-gradient(135deg,#0EA47A,#064A2E)",
] as const;

export function relGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return REL_GRADIENTS[Math.abs(h) % REL_GRADIENTS.length]!;
}

export function relInitials(title: string): string {
  const w = title.trim().split(/\s+/).filter(Boolean);
  if (w.length >= 2)
    return `${w[0]!.slice(0, 1)}${w[1]!.slice(0, 1)}`.toUpperCase();
  const t = title.trim();
  if (t.length >= 2) return t.slice(0, 2).toUpperCase();
  return t.slice(0, 1).toUpperCase() || "?";
}

export function relLoaiKind(loai: string): string {
  const map: Record<string, string> = {
    nghe: "Nghề",
    keyword: "Keyword",
    phan_mem: "Phần mềm",
    nganh_dao_tao: "Ngành ĐT",
    mon_hoc: "Môn học",
    linh_vuc: "Lĩnh vực",
    blog: "Blog",
    event: "Sự kiện",
  };
  return map[loai] ?? loai.replace(/_/g, " ");
}

export type RelTagVariant = "blue" | "mint" | "violet" | "orange" | "yellow";

export function relTagForCard(card: ArticleCard): {
  className: string;
  label: string;
} {
  const loai = String(card.loai_bai_viet);
  if (loai === "keyword")
    return { className: "rel-tag tag-mint", label: "Kỹ thuật" };
  if (loai === "nganh_dao_tao")
    return { className: "rel-tag tag-yellow", label: "Ngành ĐT" };
  if (loai === "phan_mem")
    return { className: "rel-tag tag-orange", label: "Phần mềm" };
  if (loai === "nghe") {
    const q = (card.loai_quan_he ?? "").toUpperCase();
    if (q.includes("TIEN_QUYET") || q.includes("TIEN"))
      return { className: "rel-tag tag-orange", label: "Tiền kỳ" };
    return { className: "rel-tag tag-blue", label: "Cùng mảng" };
  }
  const label = labelLoaiQuanHe(card.loai_quan_he);
  return { className: "rel-tag", label };
}

export function partitionNganhRelated(items: ArticleCard[]) {
  const monHoc = items.filter((i) => String(i.loai_bai_viet) === "mon_hoc");
  const nganhCompare = items.filter(
    (i) => String(i.loai_bai_viet) === "nganh_dao_tao",
  );
  const nghe = items.filter((i) => String(i.loai_bai_viet) === "nghe");
  const keywords = items.filter((i) => String(i.loai_bai_viet) === "keyword");
  const phanMem = items.filter((i) => String(i.loai_bai_viet) === "phan_mem");
  const other = items.filter((i) => {
    const l = String(i.loai_bai_viet);
    return !["mon_hoc", "nganh_dao_tao", "nghe", "keyword", "phan_mem"].includes(
      l,
    );
  });
  return { monHoc, nganhCompare, nghe, keywords, phanMem, other };
}

export function partitionNgheRelated(items: ArticleCard[]) {
  const keywords = items.filter((i) => String(i.loai_bai_viet) === "keyword");
  const nghe = items.filter((i) => String(i.loai_bai_viet) === "nghe");
  const nganh = items.filter(
    (i) => String(i.loai_bai_viet) === "nganh_dao_tao",
  );
  const phanMem = items.filter((i) => String(i.loai_bai_viet) === "phan_mem");
  const other = items.filter((i) => {
    const l = String(i.loai_bai_viet);
    return !["keyword", "nghe", "nganh_dao_tao", "phan_mem"].includes(l);
  });
  return { keywords, nghe, nganh, phanMem, other };
}

export function buildNgheKicker(
  related: ArticleCard[],
  articleTitle: string,
): string {
  const parts = ["Nghề nghiệp"];
  const fields = related
    .filter((r) => ["linh_vuc", "nganh_dao_tao", "keyword"].includes(String(r.loai_bai_viet)))
    .slice(0, 2)
    .map((r) => r.tieu_de.trim())
    .filter(Boolean);
  if (fields.length) return `${parts[0]} · ${fields.join(" · ")}`;
  const short = articleTitle.split(/\s+/).slice(0, 2).join(" ");
  return short ? `${parts[0]} · ${short}` : parts[0]!;
}

const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii"] as const;

export function romanIndex(i: number): string {
  return ROMAN[i] ?? String(i + 1);
}

export function splitSectionTitle(title: string): {
  main: string;
  em: string | null;
} {
  const m = title.match(/^(.+?)\s*[—–-]\s*(.+)$/);
  if (m) return { main: m[1]!.trim(), em: m[2]!.trim() };
  return { main: title.trim(), em: null };
}

export function isSkillSection(title: string): boolean {
  const t = title.toLowerCase();
  return (
    t.includes("giỏi") ||
    t.includes("gioi") ||
    t.includes("kỹ năng") ||
    t.includes("ky nang") ||
    t.includes("cần có") ||
    t.includes("can co")
  );
}

export type LoaiBaiVietOrString = LoaiBaiViet | string;
