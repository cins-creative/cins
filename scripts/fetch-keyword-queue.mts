import { config } from "dotenv";

config({ path: ".env.local" });

const { runAdminSql } = await import("../lib/admin/sql-runner");

const limit = Number(process.argv[2] || 10);

const r0 = await runAdminSql(
  `SELECT COUNT(*) AS chua_viet_dot3
FROM article_bai_viet
WHERE loai_bai_viet = 'keyword'
  AND (noi_dung IS NULL OR noi_dung = '')
  AND tieu_de >= 'Q'`,
  "read",
);
console.log("STEP0", JSON.stringify(r0.rows));

const r1 = await runAdminSql(
  `SELECT id, slug, tieu_de, tieu_de_viet, tom_tat
FROM article_bai_viet
WHERE loai_bai_viet = 'keyword'
  AND (noi_dung IS NULL OR noi_dung = '')
  AND tieu_de >= 'Q'
ORDER BY tieu_de ASC
LIMIT ${limit}`,
  "read",
);
console.log("STEP1", JSON.stringify(r1.rows, null, 2));
