/** Client-side helper — lọc milestone/gallery theo slug nhãn cá nhân. */

export function matchesPersonalFilterSlug(
  itemSlugs: ReadonlyArray<string> | undefined,
  activeSlug: string | null,
): boolean {
  if (!activeSlug) return true;
  return (itemSlugs ?? []).includes(activeSlug);
}

export function personalFilterSlugFromSearch(search: string): string | null {
  const raw = new URLSearchParams(search).get("filter");
  const slug = raw?.trim();
  return slug || null;
}

export function buildPersonalFilterSearchUrl(
  pathname: string,
  search: string,
  filterSlug: string | null,
): string {
  const params = new URLSearchParams(search);
  if (filterSlug) params.set("filter", filterSlug);
  else params.delete("filter");
  const q = params.toString();
  return q ? `${pathname}?${q}` : pathname;
}
