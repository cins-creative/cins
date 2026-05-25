import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });

const { runAdminSql } = await import("../lib/admin/sql-runner");

type ManifestItem = {
  id: string;
  slug: string;
  tieu_de_viet: string;
  tom_tat: string;
  meta_title: string;
  meta_description: string;
  video_url?: string;
  nhom_slugs: string[];
};

const dir = join(import.meta.dirname, "nghe-content");
const manifestPath = join(dir, process.argv[2] || "manifest-batch1.json");
const onlySlug = process.argv[3]?.trim();

const items = JSON.parse(readFileSync(manifestPath, "utf8")) as ManifestItem[];
const results: { slug: string; ok: boolean; len?: number; groups?: number; msg?: string }[] = [];

for (const job of items) {
  if (onlySlug && job.slug !== onlySlug) continue;

  const path = join(dir, `${job.slug}.html`);
  let html: string;
  try {
    html = readFileSync(path, "utf8").trim();
  } catch {
    console.log(`⏭ Bỏ qua ${job.slug} — chưa có ${job.slug}.html`);
    results.push({ slug: job.slug, ok: false, msg: "missing html" });
    continue;
  }

  const videoUrl = (job.video_url ?? "").replace(/'/g, "''");
  const groupSlugList = (job.nhom_slugs ?? [])
    .map((s) => `'${s.replace(/'/g, "''")}'`)
    .join(", ");

  const updateSql = `
UPDATE article_bai_viet SET
  tieu_de_viet = '${job.tieu_de_viet.replace(/'/g, "''")}',
  tom_tat = '${job.tom_tat.replace(/'/g, "''")}',
  meta = jsonb_build_object('video_url', '${videoUrl}'),
  meta_title = '${job.meta_title.replace(/'/g, "''")}',
  meta_description = '${job.meta_description.replace(/'/g, "''")}',
  trang_thai_noi_dung = 'published',
  cap_nhat_luc = now(),
  noi_dung = $noidung$${html}$noidung$
WHERE id = '${job.id}'
  AND loai_bai_viet = 'nghe'
  AND (noi_dung IS NULL OR LENGTH(noi_dung) < 1000);

SELECT slug, tieu_de_viet, LENGTH(noi_dung) AS do_dai FROM article_bai_viet WHERE id = '${job.id}';
`;

  try {
    const res = await runAdminSql(updateSql, "full");
    const row = res.rows?.find(
      (r) => r && typeof r === "object" && "do_dai" in r,
    ) as { do_dai?: string } | undefined;
    const len = row?.do_dai ? Number(row.do_dai) : html.length;
    const ok = len > 1000;

    let groups = 0;
    if (ok && groupSlugList) {
      const groupSql = `
INSERT INTO article_gan_nhom (id_bai_viet, id_nhom)
SELECT b.id, n.id
FROM article_bai_viet b, article_nhom n
WHERE b.id = '${job.id}'
  AND n.slug IN (${groupSlugList})
ON CONFLICT DO NOTHING
RETURNING id_nhom;
`;
      try {
        const gres = await runAdminSql(groupSql, "full");
        groups = gres.rows?.length ?? 0;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`  ⚠ gán nhóm thất bại ${job.slug}: ${msg}`);
      }
    }

    results.push({ slug: job.slug, ok, len, groups });
    console.log(
      ok
        ? `✓ ${job.slug} — ${len} ký tự, +${groups} nhóm`
        : `✗ ${job.slug} — ${len} ký tự (ngắn?)`,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    results.push({ slug: job.slug, ok: false, msg });
    console.error(`✗ ${job.slug}:`, msg);
  }
}

const remain = await runAdminSql(
  `SELECT COUNT(*) AS con_lai FROM article_bai_viet
   WHERE loai_bai_viet = 'nghe' AND (noi_dung IS NULL OR LENGTH(noi_dung) < 1000)`,
  "read",
);

console.log("\n── Kết quả ──");
for (const r of results) {
  console.log(
    r.ok
      ? `✓ ${r.slug} — ${r.len} ký tự, +${r.groups} nhóm`
      : `✗ ${r.slug} — ${r.msg ?? r.len}`,
  );
}
console.log(`\nCòn lại: ${remain.rows?.[0]?.con_lai ?? "?"} bài chưa có nội dung.`);
