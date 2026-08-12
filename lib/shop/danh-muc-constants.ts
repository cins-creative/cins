/**
 * Hằng số taxonomy client-safe (hub URL + Kho).
 * Plan: docs/PLAN_shop_danh_muc_rev3.md
 */

/** Slug cũ → slug lá sau khi gộp. Hub `?danhMuc=` vẫn lọc được. */
export const SHOP_DANH_MUC_SLUG_ALIAS: Record<string, string> = {
  "charm-coaster": "charm-keychain",
  keychain: "charm-keychain",
};

export function canonicalizeDanhMucSlug(slug: string): string {
  const s = slug.trim();
  return SHOP_DANH_MUC_SLUG_ALIAS[s] ?? s;
}

export function canonicalizeDanhMucSlugs(slugs: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of slugs) {
    const s = canonicalizeDanhMucSlug(raw);
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}
