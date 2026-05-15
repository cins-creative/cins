import type { LoaiBaiViet } from "@/lib/articles/types";

export const LOAI_LABELS: Record<LoaiBaiViet, string> = {
  nghe: "Nghề",
  nganh_dao_tao: "Ngành ĐT",
  mon_hoc: "Môn học",
  keyword: "Keyword",
  phan_mem: "Phần mềm",
  linh_vuc: "Lĩnh vực",
  blog: "Blog",
  event: "Sự kiện",
};

/** Class Tailwind cho badge loại (khớp brief admin) */
export const LOAI_BADGE_CLASS: Record<LoaiBaiViet, string> = {
  nghe: "bg-blue-100 text-blue-800",
  nganh_dao_tao: "bg-purple-100 text-purple-800",
  mon_hoc: "bg-green-100 text-green-800",
  keyword: "bg-orange-100 text-orange-800",
  phan_mem: "bg-red-100 text-red-800",
  linh_vuc: "bg-teal-100 text-teal-800",
  blog: "bg-zinc-100 text-zinc-700",
  event: "bg-yellow-100 text-yellow-800",
};
