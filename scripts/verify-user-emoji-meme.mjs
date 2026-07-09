import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const url =
  process.env.DATABASE_URL?.trim() || process.env.SUPABASE_DB_URL?.trim();
if (!url) process.exit(1);

const db = postgres(url, { max: 1, ssl: "require", prepare: false });
try {
  const rows = await db`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('user_emoji_bo', 'user_emoji_muc')
    ORDER BY 1
  `;
  console.log("Tables:", rows.map((r) => r.table_name).join(", ") || "(none)");
  await db.unsafe("NOTIFY pgrst, 'reload schema'");
  console.log("OK: schema cache reload notified");
} finally {
  await db.end({ timeout: 5 });
}
