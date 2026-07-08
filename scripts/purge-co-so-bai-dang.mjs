/**
 * Xóa toàn bộ org_bai_dang của cơ sở đào tạo + dọn ảnh Cloudflare.
 * Usage: node scripts/purge-co-so-bai-dang.mjs [--confirm]
 */
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const CF_UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

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

function collectCfFromPost(row) {
  const set = new Set();
  const cover = row.cover_id?.trim();
  if (cover && isCfImageUuid(cover)) set.add(cover);
  const text =
    typeof row.noi_dung_blocks === "string"
      ? row.noi_dung_blocks
      : JSON.stringify(row.noi_dung_blocks ?? "");
  for (const m of text.matchAll(CF_UUID_RE)) {
    if (isCfImageUuid(m[0])) set.add(m[0].toLowerCase());
  }
  const html = String(row.noi_dung ?? "");
  for (const m of html.matchAll(CF_UUID_RE)) {
    if (isCfImageUuid(m[0])) set.add(m[0].toLowerCase());
  }
  return set;
}

async function deleteCloudflareImage(imageId) {
  const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const cfToken = process.env.CLOUDFLARE_IMAGES_API_TOKEN?.trim();
  if (!cfAccount || !cfToken) return { ok: false, error: "Thiếu CF config" };
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cfAccount}/images/v1/${encodeURIComponent(imageId)}`,
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

async function isCloudflareImageReferenced(db, imageId) {
  const like = `%${imageId}%`;
  const [tpCover, tpBlocks, media, avatar, orgAvatar, orgBaiCover, orgBaiBlocks] =
    await Promise.all([
      db`SELECT COUNT(*)::int c FROM content_tac_pham WHERE cover_id = ${imageId}`,
      db`SELECT COUNT(*)::int c FROM content_tac_pham WHERE noi_dung_blocks::text ILIKE ${like}`,
      db`SELECT COUNT(*)::int c FROM content_media WHERE cloudflare_id = ${imageId}`,
      db`SELECT COUNT(*)::int c FROM user_nguoi_dung WHERE avatar_id = ${imageId}`,
      db`SELECT COUNT(*)::int c FROM org_to_chuc WHERE avatar_id = ${imageId} OR cover_id = ${imageId}`,
      db`SELECT COUNT(*)::int c FROM org_bai_dang WHERE cover_id = ${imageId}`,
      db`SELECT COUNT(*)::int c FROM org_bai_dang WHERE noi_dung_blocks::text ILIKE ${like} OR noi_dung ILIKE ${like}`,
    ]);
  return [tpCover, tpBlocks, media, avatar, orgAvatar, orgBaiCover, orgBaiBlocks].some(
    (r) => r[0].c > 0,
  );
}

loadEnv();
const confirm = process.argv.includes("--confirm");
const db = postgres(process.env.DATABASE_URL, { max: 1 });

const posts = await db`
  SELECT p.id, p.id_to_chuc, p.tieu_de, p.cover_id, p.noi_dung, p.noi_dung_blocks, p.trang_thai,
         o.slug AS org_slug, o.ten AS org_ten
  FROM org_bai_dang p
  JOIN org_to_chuc o ON o.id = p.id_to_chuc
  WHERE o.loai_to_chuc = 'co_so_dao_tao'
  ORDER BY p.tao_luc DESC
`;

const postIds = posts.map((p) => p.id);
const cfSet = new Set();
for (const p of posts) {
  for (const id of collectCfFromPost(p)) cfSet.add(id);
}

const orgCounts = await db`
  SELECT o.slug, o.ten, COUNT(p.id)::int AS posts
  FROM org_to_chuc o
  LEFT JOIN org_bai_dang p ON p.id_to_chuc = o.id
  WHERE o.loai_to_chuc = 'co_so_dao_tao'
  GROUP BY o.id, o.slug, o.ten
  HAVING COUNT(p.id) > 0
  ORDER BY posts DESC
`;

console.log(
  JSON.stringify(
    {
      orgsWithPosts: orgCounts,
      totalPosts: posts.length,
      cloudflareImages: [...cfSet],
      samplePosts: posts.slice(0, 5).map((p) => ({
        org: p.org_slug,
        tieu_de: p.tieu_de,
        trang_thai: p.trang_thai,
      })),
    },
    null,
    2,
  ),
);

if (!confirm) {
  console.log("\n[DRY-RUN] Thêm --confirm để xóa thật.");
  await db.end();
  process.exit(0);
}

if (postIds.length === 0) {
  console.log("Không có bài đăng cơ sở đào tạo để xóa.");
  await db.end();
  process.exit(0);
}

console.log("\nĐang xóa DB…");

await db.begin(async (tx) => {
  await tx`
    DELETE FROM social_reaction
    WHERE loai_doi_tuong = 'org_bai_dang'
      AND id_doi_tuong = ANY(${postIds}::uuid[])
  `;
  await tx`
    DELETE FROM social_luu
    WHERE loai_doi_tuong = 'org_bai_dang'
      AND id_doi_tuong = ANY(${postIds}::uuid[])
  `;
  await tx`
    DELETE FROM social_luot_xem
    WHERE loai_doi_tuong = 'org_bai_dang'
      AND id_doi_tuong = ANY(${postIds}::uuid[])
  `;
  await tx`
    DELETE FROM filter_gan
    WHERE loai_doi_tuong = 'org_bai_dang'
      AND id_doi_tuong = ANY(${postIds}::uuid[])
  `;
  await tx`
    DELETE FROM org_bai_dang_tag
    WHERE id_bai_dang = ANY(${postIds}::uuid[])
  `;
  await tx`
    DELETE FROM org_bai_dang
    WHERE id = ANY(${postIds}::uuid[])
  `;
});

console.log("DB xóa xong. Đang dọn Cloudflare…");

const purgeResults = [];
for (const imageId of cfSet) {
  if (await isCloudflareImageReferenced(db, imageId)) {
    purgeResults.push({ id: imageId, skipped: "still referenced" });
    continue;
  }
  purgeResults.push({ id: imageId, ...(await deleteCloudflareImage(imageId)) });
}

const deleted = purgeResults.filter((r) => r.ok).length;
const failed = purgeResults.filter((r) => !r.ok && !r.skipped).length;
const skipped = purgeResults.filter((r) => r.skipped).length;

console.log(
  JSON.stringify(
    {
      done: true,
      postsDeleted: postIds.length,
      cloudflare: { total: cfSet.size, deleted, failed, skipped },
      purgeResults,
    },
    null,
    2,
  ),
);

await db.end();
