/**
 * Apply rewrite mẫu: Art Director (multi-lĩnh vực).
 * Usage: npx tsx scripts/apply-nghe-art-director-rewrite.mts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const ID = "10c683a5-8b08-455a-a66d-ee3e43aef58b";
const html = readFileSync(
  join(process.cwd(), "scripts/nghe-content/nghe-art-director.html"),
  "utf8",
).trim();

const tomTat =
  "Người giữ phong cách hình ảnh nhất quán của dự án — chiến dịch, game, phim hay bộ sưu tập — và dẫn team art thực thi đúng look đó đến khi sản phẩm ra mắt.";

const metaTitle =
  "Art Director là gì? Công việc, kỹ năng và lộ trình vào nghề | CINS";

const metaDescription =
  "Art Director làm gì, khác Creative Director ra sao, kỹ năng cần có và lộ trình từ designer/concept lên giám đốc mỹ thuật — xuyên game, phim, agency và thời trang.";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false });

async function main() {
  const updated = await sql`
    UPDATE article_bai_viet SET
      tieu_de_viet = 'Giám đốc mỹ thuật',
      tom_tat = ${tomTat},
      meta_title = ${metaTitle},
      meta_description = ${metaDescription},
      trang_thai_noi_dung = 'published',
      noi_dung = ${html},
      cap_nhat_luc = now()
    WHERE id = ${ID}::uuid
      AND loai_bai_viet = 'nghe'
    RETURNING slug, length(noi_dung)::int AS len, left(tom_tat, 80) AS tom_tat
  `;
  if (!updated.length) {
    console.error("No row updated");
    process.exit(1);
  }
  console.log("OK", updated[0]);

  const verify = await sql`
    SELECT a.slug, a.tieu_de_eng, a.meta_title,
      length(a.noi_dung)::int AS len,
      (a.noi_dung LIKE '%Xuất hiện ở đâu%') AS has_fields_box,
      (a.noi_dung LIKE '%phim hoạt hình là ai%') AS still_animation_only,
      (
        SELECT string_agg(lv.ten, ' · ' ORDER BY g.la_chinh DESC)
        FROM article_gan_linh_vuc g
        JOIN linh_vuc lv ON lv.id = g.id_linh_vuc
        WHERE g.id_bai_viet = a.id
      ) AS lvs
    FROM article_bai_viet a
    WHERE a.id = ${ID}::uuid
  `;
  console.table(verify);
  await sql.end({ timeout: 5 });
}

main().catch(async (e) => {
  console.error(e);
  await sql.end({ timeout: 5 });
  process.exit(1);
});
