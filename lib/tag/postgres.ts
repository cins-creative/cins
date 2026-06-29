import "server-only";

import postgres from "postgres";

import { resolveAdminDbCredentials } from "@/lib/admin/db-connection";
import { getAdminDbUrl } from "@/lib/admin/db-url";
import { isUsingHyperdrive } from "@/lib/db/hyperdrive";

export type TagSql = postgres.Sql;

/** Postgres pooler — dùng cho trigram / lower() exact match. Trả null nếu thiếu DATABASE_URL. */
export async function withTagPostgres<T>(
  fn: (sql: TagSql) => Promise<T>,
): Promise<T | null> {
  const url = getAdminDbUrl();
  if (!url) return null;

  const db = resolveAdminDbCredentials(url);
  const viaHyperdrive = isUsingHyperdrive();
  const sql = postgres({
    host: db.host,
    port: db.port,
    database: db.database,
    username: db.username,
    password: db.password,
    max: 1,
    connect_timeout: 15,
    idle_timeout: 5,
    /* Hyperdrive đã lo SSL tới origin; không bật SSL tới proxy. */
    ssl: db.host.includes("supabase.co") ? "require" : undefined,
    /* Hyperdrive khuyến nghị tắt fetch_types để giảm round-trip. */
    ...(viaHyperdrive ? { fetch_types: false } : {}),
  });

  try {
    return await fn(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }
}
