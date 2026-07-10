import "server-only";

import postgres from "postgres";

import { resolveAdminDbCredentials } from "@/lib/admin/db-connection";
import { getAdminDbUrl } from "@/lib/admin/db-url";
import { isUsingHyperdrive } from "@/lib/db/hyperdrive";

export type TagSql = postgres.Sql;

const globalForTagSql = globalThis as unknown as { __cinsTagSql?: TagSql };

/** Postgres pooler tái sử dụng — tránh connect/disconnect mỗi request dedup. */
function getTagSql(): TagSql | null {
  if (globalForTagSql.__cinsTagSql) {
    return globalForTagSql.__cinsTagSql;
  }

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
    max: 3,
    connect_timeout: 15,
    idle_timeout: 20,
    ssl: db.host.includes("supabase.co") ? "require" : undefined,
    ...(viaHyperdrive ? { fetch_types: false } : {}),
  });

  globalForTagSql.__cinsTagSql = sql;
  return sql;
}

/** Postgres pooler — dùng cho trigram / lower() exact match. Trả null nếu thiếu DATABASE_URL. */
export async function withTagPostgres<T>(
  fn: (sql: TagSql) => Promise<T>,
): Promise<T | null> {
  const sql = getTagSql();
  if (!sql) return null;
  return fn(sql);
}
