import { config } from "dotenv";

config({ path: ".env.local" });

const { runAdminSql } = await import("../lib/admin/sql-runner");

const r = await runAdminSql(
  `SELECT
     id, slug, tieu_de, tieu_de_viet, tom_tat,
     meta, meta_title, meta_description,
     trang_thai_noi_dung,
     LENGTH(noi_dung) AS do_dai,
     noi_dung
   FROM article_bai_viet
   WHERE id = 'ca29ae36-7c65-449e-9136-cae5122a4c14'`,
  "read",
);
const row = r.rows?.[0];
if (!row) {
  console.log("Không tìm thấy");
  process.exit(0);
}
console.log("── BÀI HIỆN TẠI TRONG DB ──");
console.log("slug:", row.slug);
console.log("tieu_de:", row.tieu_de);
console.log("tieu_de_viet:", row.tieu_de_viet);
console.log("tom_tat:", row.tom_tat);
console.log("meta_title:", row.meta_title);
console.log("meta_description:", row.meta_description);
console.log("meta:", JSON.stringify(row.meta));
console.log("trang_thai_noi_dung:", row.trang_thai_noi_dung);
console.log("LENGTH(noi_dung):", row.do_dai);
console.log("\n── NOI_DUNG HIỆN TẠI ──");
console.log(row.noi_dung || "(NULL)");
