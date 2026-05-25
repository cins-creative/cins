import { config } from "dotenv";

config({ path: ".env.local" });

const { runAdminSql } = await import("../lib/admin/sql-runner");

const r = await runAdminSql(
  `SELECT loai_nhom, slug, ten
   FROM article_nhom
   WHERE slug LIKE 'lv-%' OR slug LIKE 'bp-%' OR slug LIKE 'kt-%' OR slug LIKE 'nn-%'
   ORDER BY loai_nhom, slug`,
  "read",
);
console.table(r.rows);

const sample = await runAdminSql(
  `SELECT b.slug AS bai, COUNT(g.id_nhom) AS so_nhom
   FROM article_bai_viet b
   LEFT JOIN article_gan_nhom g ON g.id_bai_viet = b.id
   WHERE b.loai_bai_viet = 'nghe'
     AND b.slug IN (
       'nghe-game-2d-artist',
       'nghe-game-3d-modeler',
       'ai-programmer',
       'nghe-phim-1st-assistant-camera-1st-ac'
     )
   GROUP BY b.slug`,
  "read",
);
console.log("\n── số nhóm đã gán ──");
console.table(sample.rows);
