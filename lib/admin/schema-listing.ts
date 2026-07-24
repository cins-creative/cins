import "server-only";

import postgres from "postgres";

import { resolveAdminDbCredentials } from "@/lib/admin/db-connection";
import { getAdminDbUrl } from "@/lib/admin/db-url";
import {
  schemaDomainOf,
  type SchemaDomainId,
  type SchemaListing,
  type SchemaTable,
} from "@/lib/admin/schema-types";
import { isUsingHyperdrive } from "@/lib/db/hyperdrive";

function truncateDefault(value: string | null): string | null {
  if (value == null) return null;
  const s = String(value);
  return s.length > 80 ? `${s.slice(0, 77)}…` : s;
}

function openAdminSql() {
  const url = getAdminDbUrl();
  if (!url) {
    throw new Error(
      "Thiếu DATABASE_URL trên server. Lấy URI từ Supabase → Connect → pooler.",
    );
  }
  const db = resolveAdminDbCredentials(url);
  const viaHyperdrive = isUsingHyperdrive();
  return postgres({
    host: db.host,
    port: db.port,
    database: db.database,
    username: db.username,
    password: db.password,
    max: 1,
    connect_timeout: 15,
    idle_timeout: 5,
    ssl: db.host.includes("supabase.co") ? "require" : undefined,
    ...(viaHyperdrive ? { fetch_types: false } : {}),
  });
}

export type SchemaListingResult =
  | { ok: true; data: SchemaListing }
  | { ok: false; message: string };

export async function fetchAdminSchemaListing(): Promise<SchemaListingResult> {
  let sql: ReturnType<typeof openAdminSql> | null = null;
  try {
    sql = openAdminSql();

    const tables = await sql`
      SELECT c.relname AS table_name, c.relkind
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind IN ('r', 'p')
        AND NOT c.relispartition
        AND c.relname NOT LIKE 'pg_%'
      ORDER BY c.relname
    `;

    const partitions = await sql`
      SELECT c.relname AS table_name, p.relname AS parent
      FROM pg_class c
      JOIN pg_inherits i ON i.inhrelid = c.oid
      JOIN pg_class p ON p.oid = i.inhparent
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relispartition
      ORDER BY p.relname, c.relname
    `;

    const cols = await sql`
      SELECT table_name, column_name, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `;

    const pks = await sql`
      SELECT tc.table_name, kcu.column_name, kcu.ordinal_position
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.ordinal_position
    `;

    const fks = await sql`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table,
        ccu.column_name AS foreign_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
       AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name
    `;

    const enums = await sql`
      SELECT t.typname AS enum_name, e.enumlabel AS value, e.enumsortorder
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.typname, e.enumsortorder
    `;

    const byTable = new Map<string, SchemaTable>();
    for (const t of tables) {
      const name = String(t.table_name);
      byTable.set(name, {
        name,
        domain: schemaDomainOf(name),
        kind: t.relkind === "p" ? "partitioned" : "table",
        pk: [],
        columns: [],
        fks: [],
      });
    }

    for (const c of cols) {
      const table = byTable.get(String(c.table_name));
      if (!table) continue;
      table.columns.push({
        name: String(c.column_name),
        type: String(c.udt_name),
        nullable: c.is_nullable === "YES",
        default: truncateDefault(
          c.column_default == null ? null : String(c.column_default),
        ),
      });
    }

    for (const pk of pks) {
      const table = byTable.get(String(pk.table_name));
      if (!table) continue;
      table.pk.push(String(pk.column_name));
    }

    for (const fk of fks) {
      const table = byTable.get(String(fk.table_name));
      if (!table) continue;
      table.fks.push({
        column: String(fk.column_name),
        refTable: String(fk.foreign_table),
        refColumn: String(fk.foreign_column),
      });
    }

    const enumMap = new Map<string, string[]>();
    for (const e of enums) {
      const name = String(e.enum_name);
      const list = enumMap.get(name) ?? [];
      list.push(String(e.value));
      enumMap.set(name, list);
    }

    const tableList = [...byTable.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    const countMap = new Map<SchemaDomainId, number>();
    for (const t of tableList) {
      countMap.set(t.domain, (countMap.get(t.domain) ?? 0) + 1);
    }
    const domainCounts = [...countMap.entries()]
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain));

    return {
      ok: true,
      data: {
        queriedAt: new Date().toISOString(),
        tables: tableList,
        enums: [...enumMap.entries()].map(([name, values]) => ({ name, values })),
        partitions: partitions.map((p) => ({
          name: String(p.table_name),
          parent: String(p.parent),
        })),
        domainCounts,
      },
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Không đọc được schema từ DB.";
    return { ok: false, message };
  } finally {
    if (sql) await sql.end({ timeout: 3 });
  }
}
