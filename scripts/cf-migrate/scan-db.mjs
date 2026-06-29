/**
 * Scan every text / jsonb / char column in the public schema for the OLD
 * Cloudflare account hash. Reports which table.column has how many matching rows.
 * Read-only. Usage: node scripts/cf-migrate/scan-db.mjs
 */
import postgres from "postgres";
import { loadConfig } from "./lib.mjs";

const cfg = loadConfig();
if (!cfg.databaseUrl) {
  console.error("Missing DATABASE_URL in .env.local");
  process.exit(1);
}
const oldHash = cfg.old.hash;
const sql = postgres(cfg.databaseUrl, { max: 1 });

try {
  const cols = await sql`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type IN ('text','character varying','jsonb','json','character')
    ORDER BY table_name, column_name
  `;

  const hits = [];
  let totalRows = 0;
  for (const col of cols) {
    let rows;
    try {
      rows = await sql`
        SELECT count(*)::bigint AS n
        FROM ${sql(col.table_name)}
        WHERE ${sql(col.column_name)}::text LIKE ${"%" + oldHash + "%"}
      `;
    } catch (err) {
      console.warn(`skip ${col.table_name}.${col.column_name}: ${err.message}`);
      continue;
    }
    const n = Number(rows[0].n);
    if (n > 0) {
      hits.push({ table: col.table_name, column: col.column_name, type: col.data_type, rows: n });
      totalRows += n;
    }
  }

  console.log(`Old hash: ${oldHash}`);
  console.log(`Columns containing the old hash: ${hits.length}`);
  console.log("");
  for (const h of hits) {
    console.log(`  ${h.table}.${h.column} (${h.type})  -> ${h.rows} row(s)`);
  }
  console.log("");
  console.log(`Total matching rows (sum over columns): ${totalRows}`);
} finally {
  await sql.end({ timeout: 5 });
}
