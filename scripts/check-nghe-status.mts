import { config } from "dotenv";

config({ path: ".env.local" });

const { runAdminSql } = await import("../lib/admin/sql-runner");

const r = await runAdminSql(
  `SELECT loai_bai_viet, COUNT(*) AS n,
          COUNT(*) FILTER (WHERE noi_dung IS NULL OR noi_dung = '') AS chua_viet
   FROM article_bai_viet
   GROUP BY loai_bai_viet
   ORDER BY loai_bai_viet`,
  "read",
);
console.log("── Phân bố loai_bai_viet ──");
console.table(r.rows);

const sample = await runAdminSql(
  `SELECT id, slug, tieu_de, tieu_de_viet,
          LENGTH(noi_dung) AS do_dai,
          trang_thai_noi_dung
   FROM article_bai_viet
   WHERE loai_bai_viet = 'nghe'
   ORDER BY tieu_de ASC
   LIMIT 20`,
  "read",
);
console.log("\n── 20 bài nghe đầu (theo tieu_de) ──");
console.table(sample.rows);
