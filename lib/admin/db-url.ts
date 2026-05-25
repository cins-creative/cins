import {
  getAdminDbPassword,
  parsePostgresUrl,
} from "@/lib/admin/db-connection";

/** Postgres URI cho admin SQL (Supabase → Connect → pooler). Ưu tiên DATABASE_URL. */
export function getAdminDbUrl(): string | null {
  const url =
    process.env.DATABASE_URL?.trim() ||
    process.env.SUPABASE_DB_URL?.trim() ||
    null;
  return url || null;
}

export function hasAdminDbUrl(): boolean {
  const url = getAdminDbUrl();
  if (!url) return false;
  if (getAdminDbPassword()) return true;
  try {
    return !!parsePostgresUrl(url).password;
  } catch {
    return false;
  }
}