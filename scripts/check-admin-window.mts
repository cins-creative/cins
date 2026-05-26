import { config } from "dotenv";

config({ path: ".env.local" });

const { runAdminSql } = await import("../lib/admin/sql-runner");

const total = await runAdminSql(
  `SELECT COUNT(*) AS tong FROM article_bai_viet`,
  "read",
);
console.log(`Tổng article_bai_viet: ${total.rows?.[0]?.tong}`);

const top500 = await runAdminSql(
  `SELECT loai_bai_viet, COUNT(*) AS n
   FROM (
     SELECT loai_bai_viet
     FROM article_bai_viet
     ORDER BY cap_nhat_luc DESC NULLS LAST
     LIMIT 500
   ) s
   GROUP BY loai_bai_viet
   ORDER BY n DESC`,
  "read",
);
console.log("\n── Phân bố trong top 500 (admin đang load) ──");
console.table(top500.rows);

const all = await runAdminSql(
  `SELECT loai_bai_viet, COUNT(*) AS n FROM article_bai_viet GROUP BY loai_bai_viet ORDER BY n DESC`,
  "read",
);
console.log("\n── Phân bố toàn bộ DB ──");
console.table(all.rows);
