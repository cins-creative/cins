/**
 * Xóa toàn bộ tin tuyển dụng (org_tuyen_dung) mọi loại org.
 * Usage: node scripts/purge-org-tuyen-dung.mjs [--confirm]
 */
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

function loadEnv() {
  for (const line of fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
}

loadEnv();
const confirm = process.argv.includes("--confirm");
const db = postgres(process.env.DATABASE_URL, { max: 1 });

const rows = await db`
  SELECT j.id, j.tieu_de, j.trang_thai, o.slug, o.loai_to_chuc, o.ten
  FROM org_tuyen_dung j
  JOIN org_to_chuc o ON o.id = j.id_to_chuc
  ORDER BY j.tao_luc DESC
`;
const jobIds = rows.map((r) => r.id);

console.log(
  JSON.stringify(
    {
      total: rows.length,
      jobs: rows.map((r) => ({
        org: r.slug,
        loai: r.loai_to_chuc,
        tieu_de: r.tieu_de,
        trang_thai: r.trang_thai,
      })),
    },
    null,
    2,
  ),
);

if (!confirm) {
  console.log("\n[DRY-RUN] Thêm --confirm để xóa thật.");
  await db.end();
  process.exit(0);
}

if (jobIds.length === 0) {
  console.log("Không có tin tuyển dụng để xóa.");
  await db.end();
  process.exit(0);
}

const deleted = await db.begin(async (tx) => {
  const ungTuyen = await tx`
    DELETE FROM org_tuyen_dung_ung_tuyen
    WHERE id_tuyen_dung = ANY(${jobIds}::uuid[])
    RETURNING id_tuyen_dung
  `;
  await tx`
    DELETE FROM social_luu
    WHERE loai_doi_tuong = 'org_tuyen_dung' AND id_doi_tuong = ANY(${jobIds}::uuid[])
  `;
  await tx`
    DELETE FROM social_luot_xem
    WHERE loai_doi_tuong = 'org_tuyen_dung' AND id_doi_tuong = ANY(${jobIds}::uuid[])
  `;
  const jobs = await tx`
    DELETE FROM org_tuyen_dung WHERE id = ANY(${jobIds}::uuid[]) RETURNING id
  `;
  return { org_tuyen_dung: jobs.length, org_tuyen_dung_ung_tuyen: ungTuyen.length };
});

console.log("Đã xóa:", JSON.stringify(deleted, null, 2));
await db.end();
