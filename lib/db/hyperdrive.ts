import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Chuỗi kết nối Postgres qua Hyperdrive (chỉ có trên Cloudflare Workers).
 *
 * Hyperdrive proxy gom connection + giấu credential gốc. Khi chạy ngoài Workers
 * (vd. `next dev` trên Node) hoặc lúc build, không có binding → trả `null` để
 * caller fallback về `DATABASE_URL`.
 */
export function getHyperdriveConnectionString(): string | null {
  try {
    const ctx = getCloudflareContext();
    const hyperdrive = (ctx?.env as { HYPERDRIVE?: { connectionString?: string } })
      ?.HYPERDRIVE;
    return hyperdrive?.connectionString?.trim() || null;
  } catch {
    return null;
  }
}

/** True khi đang chạy với binding Hyperdrive (Workers production/preview). */
export function isUsingHyperdrive(): boolean {
  return getHyperdriveConnectionString() !== null;
}
