import { config } from "dotenv";

config({ path: ".env.local" });

const { runAdminSql } = await import("../lib/admin/sql-runner");

const r = await runAdminSql(
  `SELECT loai_nhom, slug, ten
   FROM article_nhom
   ORDER BY loai_nhom, slug`,
  "read",
);
console.log(`── Tổng số nhóm: ${r.rows?.length ?? 0} ──`);
console.table(r.rows);

const used = await runAdminSql(
  `SELECT n.loai_nhom, n.slug, n.ten, COUNT(*) AS so_bai
   FROM article_gan_nhom g
   JOIN article_nhom n ON n.id = g.id_nhom
   JOIN article_bai_viet b ON b.id = g.id_bai_viet
   WHERE b.loai_bai_viet = 'nghe'
   GROUP BY n.loai_nhom, n.slug, n.ten
   ORDER BY n.loai_nhom, COUNT(*) DESC`,
  "read",
);
console.log(`\n── Nhóm gán cho nghe (đang dùng) ──`);
console.table(used.rows);

const sample = await runAdminSql(
  `SELECT b.slug, array_agg(n.slug ORDER BY n.slug) AS nhom_slugs
   FROM article_bai_viet b
   JOIN article_gan_nhom g ON g.id_bai_viet = b.id
   JOIN article_nhom n ON n.id = g.id_nhom
   WHERE b.loai_bai_viet = 'nghe'
     AND b.slug IN ('nghe-game-2d-artist', 'nghe-game-3d-modeler', 'ai-programmer')
   GROUP BY b.slug`,
  "read",
);
console.log(`\n── Mẫu các bài đã có nội dung đầy đủ ──`);
console.table(sample.rows);
