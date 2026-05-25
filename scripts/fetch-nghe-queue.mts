import { config } from "dotenv";

config({ path: ".env.local" });

const { runAdminSql } = await import("../lib/admin/sql-runner");

const limit = Number(process.argv[2] || 5);

const count = await runAdminSql(
  `SELECT COUNT(*) AS tong_chua_viet
FROM article_bai_viet
WHERE loai_bai_viet = 'nghe'
  AND (noi_dung IS NULL OR LENGTH(noi_dung) < 1000)`,
  "read",
);

const r = await runAdminSql(
  `SELECT id, slug, tieu_de, tieu_de_viet, tom_tat
FROM article_bai_viet
WHERE loai_bai_viet = 'nghe'
  AND (noi_dung IS NULL OR LENGTH(noi_dung) < 1000)
ORDER BY tieu_de ASC
LIMIT ${limit}`,
  "read",
);

console.log(`Còn lại: ${count.rows?.[0]?.tong_chua_viet ?? "?"}`);
console.log(JSON.stringify(r.rows, null, 2));
