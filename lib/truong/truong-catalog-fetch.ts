import type { MonThiCatalogItem } from "@/lib/truong/calc-draft";
import type { KhoiThiCatalogItem } from "@/lib/truong/mon-thi-catalog";

export type TruongCatalogBundle = {
  mon: MonThiCatalogItem[];
  khoi: KhoiThiCatalogItem[];
};

const catalogCache = new Map<string, Promise<TruongCatalogBundle>>();

async function fetchCatalogBundle(orgId: string): Promise<TruongCatalogBundle> {
  const id = encodeURIComponent(orgId.trim());
  const [monRes, khoiRes] = await Promise.all([
    fetch(`/api/truong/${id}/mon-thi-catalog`),
    fetch(`/api/truong/${id}/to-hop-mon-catalog`),
  ]);

  const monJson = monRes.ok
    ? ((await monRes.json()) as { items?: MonThiCatalogItem[] })
    : null;
  const khoiJson = khoiRes.ok
    ? ((await khoiRes.json()) as { items?: KhoiThiCatalogItem[] })
    : null;

  return {
    mon: monJson?.items ?? [],
    khoi: khoiJson?.items ?? [],
  };
}

const CATALOG_CACHE_VERSION = "v3-nang-khieu";

/** Cache in-memory theo org — tránh fetch lại mỗi lần mở modal. */
export function fetchTruongCatalogBundle(
  orgId: string,
): Promise<TruongCatalogBundle> {
  const key = `${CATALOG_CACHE_VERSION}:${orgId.trim()}`;
  if (!key) return Promise.resolve({ mon: [], khoi: [] });

  let pending = catalogCache.get(key);
  if (!pending) {
    pending = fetchCatalogBundle(key).catch((err) => {
      catalogCache.delete(key);
      throw err;
    });
    catalogCache.set(key, pending);
  }
  return pending;
}

export function invalidateTruongCatalogCache(orgId?: string): void {
  if (orgId?.trim()) {
    catalogCache.delete(orgId.trim());
    return;
  }
  catalogCache.clear();
}
