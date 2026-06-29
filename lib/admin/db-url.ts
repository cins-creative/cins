import {
  getAdminDbPassword,
  parsePostgresUrl,
} from "@/lib/admin/db-connection";
import { getHyperdriveConnectionString } from "@/lib/db/hyperdrive";

/**
 * Postgres URI cho admin SQL / tag search.
 * Ưu tiên Hyperdrive (Cloudflare Workers), fallback `DATABASE_URL` (local/Node).
 */
export function getAdminDbUrl(): string | null {
  const hyperdrive = getHyperdriveConnectionString();
  if (hyperdrive) return hyperdrive;

  const url =
    process.env.DATABASE_URL?.trim() ||
    process.env.SUPABASE_DB_URL?.trim() ||
    null;
  return url || null;
}

export function hasAdminDbUrl(): boolean {
  /* Hyperdrive đã chứa sẵn credential → không cần password riêng. */
  if (getHyperdriveConnectionString()) return true;

  const url = getAdminDbUrl();
  if (!url) return false;
  if (getAdminDbPassword()) return true;
  try {
    return !!parsePostgresUrl(url).password;
  } catch {
    return false;
  }
}