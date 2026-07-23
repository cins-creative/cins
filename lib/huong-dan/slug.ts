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

export function huongDanHref(
  nhomSlug?: string | null,
  phienSlug?: string | null,
): string {
  const nhom = nhomSlug?.trim();
  if (!nhom) return "/ho-tro/huong-dan";
  const phien = phienSlug?.trim();
  if (!phien) return `/ho-tro/huong-dan/${encodeURIComponent(nhom)}`;
  return `/ho-tro/huong-dan/${encodeURIComponent(nhom)}/${encodeURIComponent(phien)}`;
}
