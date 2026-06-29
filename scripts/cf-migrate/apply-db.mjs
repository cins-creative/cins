/**
 * Rewrite the CINS DB to point at the NEW Cloudflare account:
 *   1. Replace every old image id with its new id (id-map.json) in the exact
 *      columns where it appears (referenced-ids.json locations).
 *   2. Replace the old account hash with the new account hash in any column
 *      that still contains a full imagedelivery.net URL.
 *
 * Runs inside a single transaction. Safe by default: prints planned changes
 * and ROLLS BACK unless you pass --apply.
 *
 * Usage:
 *   node scripts/cf-migrate/apply-db.mjs            # dry run (rollback)
 *   node scripts/cf-migrate/apply-db.mjs --apply    # commit
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { loadConfig } from "./lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAP_PATH = path.join(__dirname, "id-map.json");
const REF_PATH = path.join(__dirname, "referenced-ids.json");

class RollbackSignal extends Error {}

const apply = process.argv.includes("--apply");
const cfg = loadConfig();

if (!existsSync(MAP_PATH) || !existsSync(REF_PATH)) {
  console.error("Missing id-map.json or referenced-ids.json. Run mirror first.");
  process.exit(1);
}
const idMap = JSON.parse(readFileSync(MAP_PATH, "utf8"));
const { ids: refIds, locations } = JSON.parse(readFileSync(REF_PATH, "utf8"));

const missing = refIds.filter((id) => !idMap[id]);
if (missing.length) {
  console.error(`Refusing: ${missing.length} referenced ids are not mapped yet. Finish mirror first.`);
  process.exit(1);
}

// column -> [ [oldId,newId], ... ]
const perColumn = {};
for (const oldId of refIds) {
  const newId = idMap[oldId];
  for (const loc of locations[oldId]) {
    (perColumn[loc] ??= []).push([oldId, newId]);
  }
}

const sql = postgres(cfg.databaseUrl, { max: 1 });

function splitLoc(loc) {
  const dot = loc.indexOf(".");
  return [loc.slice(0, dot), loc.slice(dot + 1)];
}

/** Run a single replace UPDATE choosing the right cast for the column type. */
async function replaceInColumn(tx, table, column, dtype, from, to) {
  const like = "%" + from + "%";
  if (dtype === "jsonb") {
    return tx`
      UPDATE ${tx(table)}
      SET ${tx(column)} = replace(${tx(column)}::text, ${from}, ${to})::jsonb
      WHERE ${tx(column)}::text LIKE ${like}
    `;
  }
  if (dtype === "json") {
    return tx`
      UPDATE ${tx(table)}
      SET ${tx(column)} = replace(${tx(column)}::text, ${from}, ${to})::json
      WHERE ${tx(column)}::text LIKE ${like}
    `;
  }
  return tx`
    UPDATE ${tx(table)}
    SET ${tx(column)} = replace(${tx(column)}::text, ${from}, ${to})
    WHERE ${tx(column)}::text LIKE ${like}
  `;
}

try {
  const typeRows = await sql`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `;
  const typeOf = new Map();
  for (const r of typeRows) typeOf.set(`${r.table_name}.${r.column_name}`, r.data_type);

  let totalIdUpdates = 0;
  let totalHashUpdates = 0;

  await sql.begin(async (tx) => {
    // ---- 1. id remap, per column ----
    for (const [loc, pairs] of Object.entries(perColumn)) {
      const [table, column] = splitLoc(loc);
      const dtype = typeOf.get(loc) || "text";
      let colUpdates = 0;
      for (const [oldId, newId] of pairs) {
        const res = await replaceInColumn(tx, table, column, dtype, oldId, newId);
        colUpdates += res.count;
      }
      totalIdUpdates += colUpdates;
      console.log(`  id remap  ${loc} (${dtype}): ${pairs.length} ids, ${colUpdates} row-updates`);
    }

    // ---- 2. hash swap on any column still holding the old hash ----
    const hashCols = await tx`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND data_type IN ('text','character varying','jsonb','json','character')
    `;
    for (const c of hashCols) {
      const loc = `${c.table_name}.${c.column_name}`;
      let res;
      try {
        res = await replaceInColumn(
          tx,
          c.table_name,
          c.column_name,
          c.data_type,
          cfg.old.hash,
          cfg.new.hash,
        );
      } catch (err) {
        console.warn(`  hash swap skip ${loc}: ${err.message}`);
        continue;
      }
      if (res.count > 0) {
        totalHashUpdates += res.count;
        console.log(`  hash swap ${loc}: ${res.count} row-updates`);
      }
    }

    console.log("");
    console.log(`TOTAL id row-updates:   ${totalIdUpdates}`);
    console.log(`TOTAL hash row-updates: ${totalHashUpdates}`);

    if (!apply) {
      console.log("\nDRY RUN — rolling back (pass --apply to commit).");
      throw new RollbackSignal();
    }
    console.log("\n--apply set — committing.");
  });

  console.log(apply ? "Committed." : "Rolled back (no changes persisted).");
} catch (err) {
  if (err instanceof RollbackSignal) {
    // expected dry-run rollback
  } else {
    console.error("apply-db failed:", err.message ?? err);
    process.exitCode = 1;
  }
} finally {
  await sql.end({ timeout: 5 });
}
