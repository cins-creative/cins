import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);

const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const tableProbe = await sb.from("org_bai_tap").select("id").limit(1);
const colProbe = await sb
  .from("org_khoa_hoc")
  .select("bai_tap_hien_thi")
  .limit(1);
const { count, error: countError } = await sb
  .from("org_bai_tap")
  .select("id", { count: "exact", head: true });

const sample = tableProbe.error
  ? null
  : await sb.from("org_bai_tap").select("*").limit(3);

console.log(
  JSON.stringify(
    {
      org_bai_tap_table: {
        exists: !tableProbe.error,
        probe_error: tableProbe.error?.message ?? null,
        row_count: countError ? null : count,
        count_error: countError?.message ?? null,
        sample_rows: sample?.data ?? null,
        sample_error: sample?.error?.message ?? null,
      },
      org_khoa_hoc_bai_tap_hien_thi_column: {
        exists: !colProbe.error,
        probe_error: colProbe.error?.message ?? null,
      },
      migration_needed: {
        create_org_bai_tap: Boolean(tableProbe.error),
        add_bai_tap_hien_thi: Boolean(colProbe.error),
        run_full_migration_safe: Boolean(tableProbe.error || colProbe.error),
      },
    },
    null,
    2,
  ),
);
