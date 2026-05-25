import { config } from "dotenv";

config({ path: ".env.local" });

const { runAdminSql } = await import("../lib/admin/sql-runner");

const r0 = await runAdminSql(
  `SELECT COUNT(*) AS tong_chua_viet
FROM article_bai_viet
WHERE loai_bai_viet = 'phan_mem'
  AND (noi_dung IS NULL OR noi_dung = '')`,
  "read",
);
console.log("STEP0", JSON.stringify(r0.rows));

const r1 = await runAdminSql(
  `SELECT id, slug, tieu_de, tom_tat, meta
FROM article_bai_viet
WHERE loai_bai_viet = 'phan_mem'
  AND (noi_dung IS NULL OR noi_dung = '')
ORDER BY tieu_de ASC
LIMIT 5`,
  "read",
);
console.log("STEP1", JSON.stringify(r1.rows, null, 2));
