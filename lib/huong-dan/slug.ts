/** Slug kebab-case ASCII (bỏ dấu tiếng Việt) — dùng client + server. */
export function slugifyHuongDan(value: string, fallback = "muc"): string {
  const cleaned = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return cleaned || fallback;
}

export function isValidHuongDanSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.trim());
}

/**
 * Deep-link chỉ tới nhóm (tab sidebar). Phần nội dung trong nhóm không có URL riêng —
 * người dùng cuộn trong panel.
 */
export function huongDanHref(nhomSlug?: string | null): string {
  const nhom = nhomSlug?.trim();
  if (!nhom) return "/ho-tro/huong-dan";
  return `/ho-tro/huong-dan/${encodeURIComponent(nhom)}`;
}
