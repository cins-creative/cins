import { config } from "dotenv";

config({ path: ".env.local" });

const { runAdminSql } = await import("../lib/admin/sql-runner");

const limit = Number(process.argv[2] || 10);

const r = await runAdminSql(
  `SELECT id, slug, tieu_de, tom_tat, meta
FROM article_bai_viet
WHERE loai_bai_viet = 'phan_mem'
  AND (noi_dung IS NULL OR noi_dung = '')
ORDER BY tieu_de ASC
LIMIT ${limit}`,
  "read",
);

console.log(JSON.stringify(r.rows, null, 2));
