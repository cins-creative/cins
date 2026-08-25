import "server-only";

import postgres from "postgres";

import { resolveAdminDbCredentials } from "@/lib/admin/db-connection";
import { getAdminDbUrl } from "@/lib/admin/db-url";
import { isUsingHyperdrive } from "@/lib/db/hyperdrive";

export type TagSql = postgres.Sql;

const globalForTagSql = globalThis as unknown as { __cinsTagSql?: TagSql };

function createTagSql(viaHyperdrive: boolean): TagSql | null {
  const url = getAdminDbUrl();
  if (!url) return null;

  const db = resolveAdminDbCredentials(url);
  return postgres({
    host: db.host,
    port: db.port,
    database: db.database,
    username: db.username,
    password: db.password,
    // Workers: 1 client/request (đóng ngay sau). Node dev: pool nhỏ tái dùng.
    max: viaHyperdrive ? 1 : 3,
    connect_timeout: 15,
    idle_timeout: 20,
    ssl: db.host.includes("supabase.co") ? "require" : undefined,
    ...(viaHyperdrive ? { fetch_types: false } : {}),
  });
}

/**
 * Postgres pooler — dùng cho trigram / lower() exact match. Trả null nếu thiếu DATABASE_URL.
 *
 * Trên Cloudflare Workers (Hyperdrive): KHÔNG cache client across request — I/O của
 * postgres client gắn với IoContext của request tạo ra nó, tái dùng ở request khác sẽ
 * ném "Cannot perform I/O on behalf of a different request" + treo tới khi runtime kill.
 * Vì vậy tạo client mỗi lần gọi rồi đóng. Ngoài Workers (Node dev) mới cache global (HMR).
 */
export async function withTagPostgres<T>(
  fn: (sql: TagSql) => Promise<T>,
): Promise<T | null> {
  const viaHyperdrive = isUsingHyperdrive();

  if (viaHyperdrive) {
    const sql = createTagSql(true);
    if (!sql) return null;
    try {
      return await fn(sql);
    } finally {
      await sql.end({ timeout: 5 }).catch(() => {});
    }
  }

  if (!globalForTagSql.__cinsTagSql) {
    const sql = createTagSql(false);
    if (!sql) return null;
    globalForTagSql.__cinsTagSql = sql;
  }
  return fn(globalForTagSql.__cinsTagSql);
}
