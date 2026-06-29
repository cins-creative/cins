/** Confirm the literal OLD account hash is fully gone from the DB. Read-only. */
import postgres from "postgres";
import { loadConfig } from "./lib.mjs";

const OLD_HASH = "PtnQ1mNuCedkboD0kJ2_4w";
const NEW_HASH = "uJ2XS8GFEXi_dIXASK1Fkw";
const cfg = loadConfig();
const sql = postgres(cfg.databaseUrl, { max: 1 });

try {
  const cols = await sql`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema='public'
      AND data_type IN ('text','character varying','jsonb','json','character')
  `;
  let oldTotal = 0;
  let newTotal = 0;
  for (const c of cols) {
    try {
      const r = await sql`
        SELECT
          count(*) FILTER (WHERE ${sql(c.column_name)}::text LIKE ${"%" + OLD_HASH + "%"})::int AS o,
          count(*) FILTER (WHERE ${sql(c.column_name)}::text LIKE ${"%" + NEW_HASH + "%"})::int AS n
        FROM ${sql(c.table_name)}
      `;
      if (r[0].o > 0) console.log(`OLD hash in ${c.table_name}.${c.column_name} = ${r[0].o}`);
      oldTotal += r[0].o;
      newTotal += r[0].n;
    } catch {
      /* skip */
    }
  }
  console.log(`\nLiteral OLD hash remaining: ${oldTotal}`);
  console.log(`Literal NEW hash present:   ${newTotal}`);
  console.log(oldTotal === 0 ? "PASS" : "FAIL");
} finally {
  await sql.end({ timeout: 5 });
}
