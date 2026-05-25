import { config } from "dotenv";

config({ path: ".env.local" });

const { runAdminSql } = await import("../lib/admin/sql-runner");

const r = await runAdminSql(
  `SELECT slug, tieu_de, LENGTH(noi_dung) AS do_dai, noi_dung
   FROM article_bai_viet
   WHERE loai_bai_viet = 'nghe'
     AND LENGTH(noi_dung) < 1000
   ORDER BY tieu_de ASC
   LIMIT 3`,
  "read",
);
for (const row of r.rows ?? []) {
  console.log(`── ${row.slug} (${row.do_dai} ký tự) ──`);
  console.log(row.noi_dung);
  console.log();
}
