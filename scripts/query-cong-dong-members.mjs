import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const envPath = path.join(process.cwd(), ".env.local");
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

const slug = process.argv[2] || "motion-designer-viet-nam";
const db = postgres(process.env.DATABASE_URL, { max: 1 });

const rows = await db`
  SELECT o.ten, o.slug, m.vai_tro, u.slug AS user_slug, u.ten_hien_thi
  FROM org_to_chuc o
  JOIN user_thanh_vien_to_chuc m ON m.id_to_chuc = o.id
  JOIN user_nguoi_dung u ON u.id = m.id_nguoi_dung
  WHERE o.loai_to_chuc = 'cong_dong' AND o.slug = ${slug}
  ORDER BY m.vai_tro, u.slug
`;

console.log(JSON.stringify(rows, null, 2));
await db.end();
