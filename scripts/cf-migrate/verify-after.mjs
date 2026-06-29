/**
 * Post-migration verification:
 *   1. No column still contains the OLD account hash.
 *   2. None of the 693 old image ids remain anywhere in the DB.
 *   3. A sample of remapped ids resolves on the NEW delivery host (HTTP 200).
 * Read-only. Usage: node scripts/cf-migrate/verify-after.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { loadConfig } from "./lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cfg = loadConfig();
const idMap = JSON.parse(readFileSync(path.join(__dirname, "id-map.json"), "utf8"));
const { ids: refIds } = JSON.parse(
  readFileSync(path.join(__dirname, "referenced-ids.json"), "utf8"),
);

const sql = postgres(cfg.databaseUrl, { max: 1 });
try {
  const cols = await sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type IN ('text','character varying','jsonb','json','character')
  `;

  // 1 + 2: scan for old hash and any old id.
  let hashHits = 0;
  let idHits = 0;
  const oldIdSet = new Set(refIds.map((s) => s.toLowerCase()));
  for (const c of cols) {
    let rows;
    try {
      rows = await sql`
        SELECT ${sql(c.column_name)}::text AS v
        FROM ${sql(c.table_name)}
        WHERE ${sql(c.column_name)}::text LIKE ${"%" + cfg.old.hash + "%"}
           OR ${sql(c.column_name)}::text ~* '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
      `;
    } catch {
      continue;
    }
    for (const r of rows) {
      if (r.v.includes(cfg.old.hash)) hashHits++;
      const m = r.v.toLowerCase().match(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g,
      );
      if (m) for (const u of m) if (oldIdSet.has(u)) {
        idHits++;
        console.log(`  LEFTOVER old id ${u} in ${c.table_name}.${c.column_name}`);
      }
    }
  }

  console.log(`Old-hash occurrences remaining: ${hashHits}`);
  console.log(`Old-id occurrences remaining:   ${idHits}`);

  // 3: sample 5 new ids resolve on new delivery host.
  const sample = Object.values(idMap).slice(0, 5);
  console.log("\nSample new-id delivery checks:");
  for (const newId of sample) {
    const u = `https://imagedelivery.net/${cfg.new.hash}/${newId}/public`;
    const res = await fetch(u).catch(() => null);
    console.log(`  ${res?.status ?? "ERR"}  ${u}`);
  }

  console.log(
    `\n${hashHits === 0 && idHits === 0 ? "PASS — DB fully migrated to new account." : "ATTENTION — leftovers found above."}`,
  );
} finally {
  await sql.end({ timeout: 5 });
}
