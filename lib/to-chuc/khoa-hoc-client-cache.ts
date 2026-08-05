/**
 * Cache client danh sách khóa học org — dedup CoSoTabKhoaHoc / SanPham / badge.
 * @see docs/PLAN_client_cache.md B4
 */

import { createCachedResource } from "@/lib/client-cache";
import type { KhoaHocCardData } from "@/lib/to-chuc/khoa-hoc-types";

const khoaHocListCache = createCachedResource<KhoaHocCardData[], [string]>({
  keyPrefix: "co-so:khoa-hoc",
  ttlMs: 120_000,
  keyFromArgs: (orgId) => orgId,
  fetcher: async (orgId) => {
    const res = await fetch(`/api/co-so/${encodeURIComponent(orgId)}/khoa-hoc`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as {
      khoaHoc?: KhoaHocCardData[];
      error?: string;
    } | null;
    if (!res.ok) {
      throw new Error(data?.error ?? "Không tải được danh sách khóa học.");
    }
    return data?.khoaHoc ?? [];
  },
});

export function peekCoSoKhoaHocList(orgId: string) {
  return khoaHocListCache.peek(orgId);
}

export async function fetchCoSoKhoaHocListCached(
  orgId: string,
  opts?: { force?: boolean },
) {
  return khoaHocListCache.fetch(orgId, opts);
}

export function writeCoSoKhoaHocListCache(
  orgId: string,
  items: KhoaHocCardData[],
) {
  khoaHocListCache.write(items, orgId);
}

export function invalidateCoSoKhoaHocListCache(orgId?: string) {
  if (orgId) khoaHocListCache.invalidate(orgId);
  else khoaHocListCache.invalidateAll();
}

export function prefetchCoSoKhoaHocList(orgId: string) {
  khoaHocListCache.prefetch(orgId);
}
