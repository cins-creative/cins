/**
 * Xóa toàn bộ bài đăng Journey của 1 user + dọn ảnh Cloudflare / video Bunny.
 *
 * Usage:
 *   node scripts/purge-user-journey.mjs <user-slug>           # dry-run
 *   node scripts/purge-user-journey.mjs <user-slug> --confirm # thực thi
 */
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const CF_UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const BUNNY_ID_RE = /"bunnyVideoId"\s*:\s*"([0-9a-f-]{36})"/gi;

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
}

function isCfImageUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(value ?? "").trim(),
  );
}

function collectAssetsFromBlocks(raw) {
  const cf = new Set();
  const bunny = new Set();
  if (!raw) return { cf, bunny };

  const text =
    typeof raw === "string" ? raw : JSON.stringify(raw);

  for (const m of text.matchAll(CF_UUID_RE)) {
    if (isCfImageUuid(m[0])) cf.add(m[0].toLowerCase());
  }
  for (const m of text.matchAll(BUNNY_ID_RE)) {
    bunny.add(m[1]);
  }
  return { cf, bunny };
}

async function deleteCloudflareImage(imageId) {
  const id = imageId.trim();
  const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const cfToken = process.env.CLOUDFLARE_IMAGES_API_TOKEN?.trim();
  if (!id || !cfAccount || !cfToken) {
    return { ok: false, error: "Thiếu cấu hình Cloudflare." };
  }
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cfAccount}/images/v1/${encodeURIComponent(id)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${cfToken}` } },
    );
    if (res.ok) return { ok: true };
    const json = await res.json().catch(() => null);
    const notFound = json?.errors?.some((e) => e.code === 10003);
    if (res.status === 404 || notFound) return { ok: true };
    return { ok: false, error: json?.errors?.[0]?.message ?? `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function deleteBunnyStreamVideo(videoId) {
  const id = videoId.trim();
  const libraryId = process.env.BUNNY_LIBRARY_ID?.trim();
  const apiKey = process.env.BUNNY_STREAM_API_KEY?.trim();
  if (!id || !libraryId || !apiKey) {
    return { ok: false, error: "Thiếu cấu hình Bunny." };
  }
  try {
    const res = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: { AccessKey: apiKey, Accept: "application/json" },
      },
    );
    if (res.ok || res.status === 404) return { ok: true };
    return { ok: false, error: `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function isCloudflareImageReferenced(db, imageId) {
  const [cover, media, avatar, org, blocks] = await Promise.all([
    db`SELECT COUNT(*)::int c FROM content_tac_pham WHERE cover_id = ${imageId}`,
    db`SELECT COUNT(*)::int c FROM content_media WHERE cloudflare_id = ${imageId}`,
    db`SELECT COUNT(*)::int c FROM user_nguoi_dung WHERE avatar_id = ${imageId}`,
    db`SELECT COUNT(*)::int c FROM org_to_chuc WHERE avatar_id = ${imageId} OR cover_id = ${imageId}`,
    db`SELECT COUNT(*)::int c FROM content_tac_pham WHERE noi_dung_blocks::text ILIKE ${"%" + imageId + "%"}`,
  ]);
  return [cover, media, avatar, org, blocks].some((r) => r[0].c > 0);
}

async function isBunnyVideoReferenced(db, videoId) {
  const [{ c }] =
    await db`SELECT COUNT(*)::int c FROM content_tac_pham WHERE noi_dung_blocks::text ILIKE ${"%" + videoId + "%"}`;
  return c > 0;
}

loadEnv();

const slug = process.argv[2]?.trim();
const confirm = process.argv.includes("--confirm");

if (!slug || slug.startsWith("--")) {
  console.error("Usage: node scripts/purge-user-journey.mjs <user-slug> [--confirm]");
  process.exit(1);
}

const db = postgres(process.env.DATABASE_URL, { max: 1 });

const [user] = await db`
  SELECT id, slug, ten_hien_thi FROM user_nguoi_dung WHERE slug = ${slug}
`;
if (!user) {
  console.error("Không tìm thấy user:", slug);
  await db.end();
  process.exit(1);
}

const milestones = await db`
  SELECT id, tieu_de, nguon_goc, che_do_hien_thi
  FROM content_cot_moc
  WHERE id_nguoi_dung = ${user.id}
  ORDER BY tao_luc DESC
`;
const milestoneIds = milestones.map((m) => m.id);

const tacPhamRows = await db`
  SELECT id, slug, cover_id, noi_dung_blocks
  FROM content_tac_pham
  WHERE id_nguoi_dung = ${user.id}
`;
const tacPhamIds = tacPhamRows.map((r) => r.id);

const mediaRows =
  tacPhamIds.length > 0
    ? await db`
        SELECT cloudflare_id FROM content_media
        WHERE id_tac_pham = ANY(${tacPhamIds}::uuid[])
      `
    : [];

const cfSet = new Set();
const bunnySet = new Set();

for (const row of tacPhamRows) {
  if (row.cover_id && isCfImageUuid(row.cover_id)) cfSet.add(row.cover_id);
  const fromBlocks = collectAssetsFromBlocks(row.noi_dung_blocks);
  for (const id of fromBlocks.bunny) bunnySet.add(id);
  for (const id of fromBlocks.cf) {
    if (!bunnySet.has(id)) cfSet.add(id);
  }
}
for (const row of mediaRows) {
  if (row.cloudflare_id && isCfImageUuid(row.cloudflare_id)) {
    cfSet.add(row.cloudflare_id);
  }
}

const relatedCounts = {};
if (milestoneIds.length > 0) {
  relatedCounts.social_reaction_cot_moc = (
    await db`
      SELECT COUNT(*)::int c FROM social_reaction
      WHERE loai_doi_tuong = 'cot_moc' AND id_doi_tuong = ANY(${milestoneIds}::uuid[])
    `
  )[0].c;
  relatedCounts.social_luu = (
    await db`
      SELECT COUNT(*)::int c FROM social_luu
      WHERE loai_doi_tuong = 'cot_moc' AND id_doi_tuong = ANY(${milestoneIds}::uuid[])
    `
  )[0].c;
  relatedCounts.social_binh_luan = (
    await db`
      SELECT COUNT(*)::int c FROM social_binh_luan
      WHERE loai_doi_tuong = 'cot_moc' AND id_doi_tuong = ANY(${milestoneIds}::uuid[])
    `
  )[0].c;
  relatedCounts.filter_gan = (
    await db`
      SELECT COUNT(*)::int c FROM filter_gan
      WHERE loai_doi_tuong = 'cot_moc' AND id_doi_tuong = ANY(${milestoneIds}::uuid[])
    `
  )[0].c;
  relatedCounts.cong_dong_filter_gan = (
    await db`
      SELECT COUNT(*)::int c FROM cong_dong_filter_gan
      WHERE id_cot_moc = ANY(${milestoneIds}::uuid[])
    `
  )[0].c;
}

const summary = {
  user,
  milestones: milestones.length,
  tacPham: tacPhamRows.length,
  cloudflareImages: [...cfSet],
  bunnyVideos: [...bunnySet],
  relatedCounts,
  sampleMilestones: milestones.slice(0, 5).map((m) => ({
    tieu_de: m.tieu_de,
    nguon_goc: m.nguon_goc,
    che_do_hien_thi: m.che_do_hien_thi,
  })),
};

console.log(JSON.stringify(summary, null, 2));

if (!confirm) {
  console.log("\n[DRY-RUN] Thêm --confirm để xóa thật.");
  await db.end();
  process.exit(0);
}

if (milestoneIds.length === 0 && tacPhamIds.length === 0) {
  console.log("Không có gì để xóa.");
  await db.end();
  process.exit(0);
}

console.log("\nĐang xóa DB…");

await db.begin(async (tx) => {
  if (milestoneIds.length > 0) {
    const commentIds = (
      await tx`
        SELECT id FROM social_binh_luan
        WHERE loai_doi_tuong = 'cot_moc' AND id_doi_tuong = ANY(${milestoneIds}::uuid[])
      `
    ).map((r) => r.id);

    if (commentIds.length > 0) {
      await tx`
        DELETE FROM social_reaction
        WHERE loai_doi_tuong = 'binh_luan' AND id_doi_tuong = ANY(${commentIds}::uuid[])
      `;
      await tx`
        DELETE FROM social_thong_bao
        WHERE loai_doi_tuong IN ('cot_moc_comment', 'binh_luan_tra_loi', 'mention_binh_luan')
          AND id_doi_tuong = ANY(${commentIds}::uuid[])
      `;
    }

    await tx`
      DELETE FROM social_reaction
      WHERE loai_doi_tuong = 'cot_moc' AND id_doi_tuong = ANY(${milestoneIds}::uuid[])
    `;
    await tx`
      DELETE FROM social_thong_bao
      WHERE loai_doi_tuong = 'cot_moc' AND id_doi_tuong = ANY(${milestoneIds}::uuid[])
    `;
    await tx`
      DELETE FROM social_binh_luan
      WHERE loai_doi_tuong = 'cot_moc' AND id_doi_tuong = ANY(${milestoneIds}::uuid[])
    `;
    await tx`
      DELETE FROM social_luu
      WHERE loai_doi_tuong = 'cot_moc' AND id_doi_tuong = ANY(${milestoneIds}::uuid[])
    `;
    await tx`
      DELETE FROM filter_gan
      WHERE loai_doi_tuong = 'cot_moc' AND id_doi_tuong = ANY(${milestoneIds}::uuid[])
    `;
    await tx`
      DELETE FROM article_gan_cot_moc
      WHERE id_cot_moc = ANY(${milestoneIds}::uuid[])
    `;
    await tx`
      DELETE FROM verify_yeu_cau WHERE id_cot_moc = ANY(${milestoneIds}::uuid[])
    `;
    await tx`
      DELETE FROM verify_xac_nhan WHERE id_cot_moc = ANY(${milestoneIds}::uuid[])
    `;
    await tx`
      DELETE FROM content_tac_pham_thuoc_moc
      WHERE id_cot_moc = ANY(${milestoneIds}::uuid[])
    `;
    await tx`
      DELETE FROM content_cot_moc WHERE id = ANY(${milestoneIds}::uuid[])
    `;
  }

  if (tacPhamIds.length > 0) {
    await tx`
      DELETE FROM article_gan_tac_pham WHERE id_tac_pham = ANY(${tacPhamIds}::uuid[])
    `;
    await tx`
      DELETE FROM content_tac_pham_tac_gia WHERE id_tac_pham = ANY(${tacPhamIds}::uuid[])
    `;
    await tx`
      DELETE FROM content_media WHERE id_tac_pham = ANY(${tacPhamIds}::uuid[])
    `;
    await tx`
      DELETE FROM content_tac_pham WHERE id = ANY(${tacPhamIds}::uuid[])
    `;
  }
});

console.log("DB xóa xong. Đang dọn hosting…");

const purgeResults = { cloudflare: [], bunny: [] };

for (const imageId of cfSet) {
  if (await isCloudflareImageReferenced(db, imageId)) {
    purgeResults.cloudflare.push({ id: imageId, skipped: "still referenced" });
    continue;
  }
  const res = await deleteCloudflareImage(imageId);
  purgeResults.cloudflare.push({ id: imageId, ...res });
}

for (const videoId of bunnySet) {
  if (await isBunnyVideoReferenced(db, videoId)) {
    purgeResults.bunny.push({ id: videoId, skipped: "still referenced" });
    continue;
  }
  const res = await deleteBunnyStreamVideo(videoId);
  purgeResults.bunny.push({ id: videoId, ...res });
}

const cfOk = purgeResults.cloudflare.filter((r) => r.ok).length;
const cfFail = purgeResults.cloudflare.filter((r) => !r.ok && !r.skipped).length;
const bunnyOk = purgeResults.bunny.filter((r) => r.ok).length;
const bunnyFail = purgeResults.bunny.filter((r) => !r.ok && !r.skipped).length;

console.log(
  JSON.stringify(
    {
      done: true,
      hosting: {
        cloudflare: { total: cfSet.size, deleted: cfOk, failed: cfFail },
        bunny: { total: bunnySet.size, deleted: bunnyOk, failed: bunnyFail },
      },
      purgeResults,
    },
    null,
    2,
  ),
);

await db.end();
