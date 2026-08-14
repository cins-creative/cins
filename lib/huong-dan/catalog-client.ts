import { createCachedResource } from "@/lib/client-cache";
import type { HuongDanCatalogPublic } from "@/lib/huong-dan/types";

const CATALOG_TTL_MS = 60_000;

function isNhom(value: unknown): value is HuongDanCatalogPublic["nhom"][number] {
  if (value == null || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.slug === "string" && Array.isArray(row.phien);
}

function validateCatalog(raw: unknown): HuongDanCatalogPublic | null {
  if (raw == null || typeof raw !== "object") return null;
  const nhom = (raw as { nhom?: unknown }).nhom;
  if (!Array.isArray(nhom)) return null;
  return { nhom: nhom.filter(isNhom) };
}

const catalogCache = createCachedResource<HuongDanCatalogPublic>({
  keyPrefix: "huong-dan-catalog",
  ttlMs: CATALOG_TTL_MS,
  fetcher: async () => {
    const res = await fetch("/api/guides");
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      nhom?: unknown;
    } | null;
    const catalog = validateCatalog(json);
    if (!catalog || json?.ok !== true) {
      throw new Error("Không tải được catalog hướng dẫn.");
    }
    return catalog;
  },
});

export function peekHuongDanCatalog(): HuongDanCatalogPublic | null {
  return catalogCache.peek();
}

export function prefetchHuongDanCatalog(): void {
  catalogCache.prefetch();
}

export function fetchHuongDanCatalog(): Promise<HuongDanCatalogPublic> {
  return catalogCache.fetch();
}
