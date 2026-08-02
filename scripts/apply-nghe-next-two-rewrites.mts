/**
 * Apply rewrite mẫu: Concept Artist + UI Designer.
 * Usage: npx tsx scripts/apply-nghe-next-two-rewrites.mts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

type Job = {
  id: string;
  slug: string;
  file: string;
  tieuDeViet: string;
  tomTat: string;
  metaTitle: string;
  metaDescription: string;
};

const jobs: Job[] = [
  {
    id: "af47b90a-04ce-473d-82a9-1e626d009962",
    slug: "nghe-concept-artist",
    file: "scripts/nghe-content/nghe-concept-artist.html",
    tieuDeViet: "Họa sĩ ý tưởng",
    tomTat:
      "Người phác thảo và phát triển hình ảnh ban đầu cho nhân vật, bối cảnh, đạo cụ hoặc thế giới của dự án — giúp cả nhóm nhìn thấy ý tưởng trước khi làm bản cuối.",
    metaTitle:
      "Concept Artist là gì? Công việc, kỹ năng và lộ trình vào nghề | CINS",
    metaDescription:
      "Concept Artist làm gì, khác illustrator ra sao, cần kỹ năng nào và học sinh/sinh viên nên bắt đầu thế nào để theo nghề họa sĩ ý tưởng.",
  },
  {
    id: "ff337330-bfdf-450c-b71c-2f8676fe9acc",
    slug: "nghe-ui-designer",
    file: "scripts/nghe-content/nghe-ui-designer.html",
    tieuDeViet: "Nhà thiết kế giao diện",
    tomTat:
      "Người thiết kế phần người dùng nhìn thấy và bấm vào trong app, web, phần mềm hoặc game — từ bố cục màn hình, nút, chữ, màu đến hệ thống giao diện nhất quán.",
    metaTitle:
      "UI Designer là gì? Công việc, kỹ năng và lộ trình vào nghề | CINS",
    metaDescription:
      "UI Designer làm gì, khác UX Designer ra sao, cần học gì và học sinh/sinh viên nên bắt đầu thế nào để theo nghề thiết kế giao diện.",
  },
];

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false });

async function main() {
  for (const job of jobs) {
    const html = readFileSync(join(process.cwd(), job.file), "utf8").trim();
    const updated = await sql`
      UPDATE article_bai_viet SET
        tieu_de_viet = ${job.tieuDeViet},
        tom_tat = ${job.tomTat},
        meta_title = ${job.metaTitle},
        meta_description = ${job.metaDescription},
        trang_thai_noi_dung = 'published',
        noi_dung = ${html},
        cap_nhat_luc = now()
      WHERE id = ${job.id}::uuid
        AND loai_bai_viet = 'nghe'
      RETURNING slug, length(noi_dung)::int AS len, left(tom_tat, 80) AS tom_tat
    `;
    if (!updated.length) {
      console.error("No row updated", job.slug);
      process.exit(1);
    }
    console.log("OK", updated[0]);
  }

  const verify = await sql`
    SELECT a.slug, a.tieu_de_eng, a.tieu_de_viet,
      length(a.noi_dung)::int AS len,
      (a.noi_dung LIKE '%Xuất hiện ở đâu%') AS has_fields_box,
      (
        SELECT string_agg(lv.ten, ' · ' ORDER BY g.la_chinh DESC)
        FROM article_gan_linh_vuc g
        JOIN linh_vuc lv ON lv.id = g.id_linh_vuc
        WHERE g.id_bai_viet = a.id
      ) AS lvs
    FROM article_bai_viet a
    WHERE a.id = ANY(${jobs.map((j) => j.id)}::uuid[])
    ORDER BY a.slug
  `;
  console.table(verify);
  await sql.end({ timeout: 5 });
}

main().catch(async (e) => {
  console.error(e);
  await sql.end({ timeout: 5 });
  process.exit(1);
});
