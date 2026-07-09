import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });
const url = process.env.DATABASE_URL?.trim() || process.env.SUPABASE_DB_URL?.trim();
const db = postgres(url, { max: 1, ssl: "require", prepare: false });
try {
  const cols = await db`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chat_tin_nhan'
      AND column_name = 'loai_tin'
  `;
  console.log("column:", cols);
  const checks = await db.unsafe(`
    SELECT conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conrelid = 'public.chat_tin_nhan'::regclass
  `);
  console.log("constraints:", checks);
  const enums = await db.unsafe(`
    SELECT e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'loai_tin_nhan_enum'
    ORDER BY e.enumsortorder
  `);
  console.log("enum values:", enums);
} finally {
  await db.end({ timeout: 5 });
}
