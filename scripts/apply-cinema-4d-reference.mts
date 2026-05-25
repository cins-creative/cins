import { readFileSync } from "node:fs";
import { config } from "dotenv";

config({ path: ".env.local" });

const { runAdminSql } = await import("../lib/admin/sql-runner");

const raw = readFileSync(
  "c:/Users/DELL/Downloads/update-noi-dung-cinema-4d.sql",
  "utf8",
);

const start = raw.indexOf("noi_dung = '") + "noi_dung = '".length;
const end = raw.lastIndexOf("'\n\nWHERE");
const html = raw.slice(start, end).replace(/''/g, "'");

const sql = `
UPDATE article_bai_viet SET
  noi_dung = $noidung$${html}$noidung$,
  cap_nhat_luc = now()
WHERE slug = 'cinema-4d' AND loai_bai_viet = 'phan_mem';

SELECT slug, LENGTH(noi_dung) AS do_dai FROM article_bai_viet WHERE slug = 'cinema-4d';
`;

const res = await runAdminSql(sql, "full");
console.log(JSON.stringify(res, null, 2));
