import type { LoaiBaiViet } from "@/lib/articles/types";

/** URL công khai theo loại bài — khớp route App Router. */
export function articlePublicHref(
  loai: LoaiBaiViet | string,
  slug: string,
): string {
  const s = encodeURIComponent(slug);
  if (loai === "nghe") return `/nghe-nghiep/${s}`;
  if (loai === "keyword") return `/keyword/${s}`;
  if (loai === "phan_mem") return `/software/${s}`;
  if (loai === "nganh_dao_tao") return `/nganh-hoc/${s}`;
  return `/bai-viet/${s}`;
}
