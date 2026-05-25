/** Slug URL cho bài `nganh_dao_tao`. */
export function slugifyNganhTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function uniqueNganhArticleSlug(
  checkSlugTaken: (slug: string) => Promise<boolean>,
  base: string,
): Promise<string> {
  const root = base || "nganh-moi";
  let candidate = root;
  let n = 2;
  while (n < 60) {
    if (!(await checkSlugTaken(candidate))) return candidate;
    candidate = `${root.slice(0, 72)}-${n}`;
    n += 1;
  }
  return `${root.slice(0, 64)}-${Date.now()}`;
}
