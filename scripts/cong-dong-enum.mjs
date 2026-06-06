import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    const val = t.slice(i + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();
const db = postgres(process.env.DATABASE_URL, { max: 1 });

try {
  const labels = await db`
    SELECT e.enumlabel
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'loai_doi_tuong_social_enum'
    ORDER BY e.enumsortorder
  `;
  console.log("enum values:", labels.map((r) => r.enumlabel));

  if (!labels.some((r) => r.enumlabel === "thao_luan")) {
    console.log("Adding enum value thao_luan...");
    await db.unsafe(
      "ALTER TYPE public.loai_doi_tuong_social_enum ADD VALUE IF NOT EXISTS 'thao_luan'",
    );
    console.log("Done.");
  } else {
    console.log("thao_luan already in enum.");
  }

  const users = await db`
    SELECT id, slug, ten_hien_thi
    FROM user_nguoi_dung
    ORDER BY tao_luc ASC NULLS LAST
    LIMIT 8
  `;
  console.log("early users:", users);
} finally {
  await db.end();
}
