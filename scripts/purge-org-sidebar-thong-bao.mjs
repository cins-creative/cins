/**
 * Xóa "thông báo" sidebar: Studio (org_tuyen_dung + bài thong_bao/su_kien)
 * và CSDT (org_su_kien) + dọn ảnh Cloudflare.
 * Usage: node scripts/purge-org-sidebar-thong-bao.mjs [--confirm]
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

function collectCfFromText(text) {
  const set = new Set();
  for (const m of String(text ?? "").matchAll(CF_UUID_RE)) {
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
  const checks = await Promise.all([
    db`SELECT COUNT(*)::int c FROM org_su_kien WHERE cover_id = ${imageId}`,
    db`SELECT COUNT(*)::int c FROM org_bai_dang WHERE cover_id = ${imageId}`,
    db`SELECT COUNT(*)::int c FROM org_bai_dang WHERE noi_dung_blocks::text ILIKE ${like}`,
    db`SELECT COUNT(*)::int c FROM org_to_chuc WHERE avatar_id = ${imageId} OR cover_id = ${imageId}`,
    db`SELECT COUNT(*)::int c FROM content_tac_pham WHERE cover_id = ${imageId}`,
  ]);
  return checks.some((r) => r[0].c > 0);
}

loadEnv();
const confirm = process.argv.includes("--confirm");
const db = postgres(process.env.DATABASE_URL, { max: 1 });

const studioOrgIds = (
  await db`SELECT id FROM org_to_chuc WHERE loai_to_chuc = 'studio'`
).map((r) => r.id);
const csdtOrgIds = (
  await db`SELECT id FROM org_to_chuc WHERE loai_to_chuc = 'co_so_dao_tao'`
).map((r) => r.id);

const jobRows =
  studioOrgIds.length > 0
    ? await db`
        SELECT j.id, j.tieu_de, o.slug AS org_slug
        FROM org_tuyen_dung j
        JOIN org_to_chuc o ON o.id = j.id_to_chuc
        WHERE j.id_to_chuc = ANY(${studioOrgIds}::uuid[])
      `
    : [];

const studioPostRows =
  studioOrgIds.length > 0
    ? await db`
        SELECT p.id, p.tieu_de, p.loai_bai_dang, p.cover_id, p.noi_dung_blocks, o.slug AS org_slug
        FROM org_bai_dang p
        JOIN org_to_chuc o ON o.id = p.id_to_chuc
        WHERE p.id_to_chuc = ANY(${studioOrgIds}::uuid[])
          AND p.loai_bai_dang IN ('thong_bao', 'su_kien')
      `
    : [];

const suKienRows =
  csdtOrgIds.length > 0
    ? await db`
        SELECT s.id, s.ten, s.cover_id, s.noi_dung, o.slug AS org_slug
        FROM org_su_kien s
        JOIN org_to_chuc o ON o.id = s.id_to_chuc
        WHERE s.id_to_chuc = ANY(${csdtOrgIds}::uuid[])
      `
    : [];

const jobIds = jobRows.map((r) => r.id);
const postIds = studioPostRows.map((r) => r.id);
const suKienIds = suKienRows.map((r) => r.id);

const cfSet = new Set();
for (const row of studioPostRows) {
  if (row.cover_id && isCfImageUuid(row.cover_id)) cfSet.add(row.cover_id);
  for (const id of collectCfFromText(
    typeof row.noi_dung_blocks === "string"
      ? row.noi_dung_blocks
      : JSON.stringify(row.noi_dung_blocks ?? ""),
  )) {
    cfSet.add(id);
  }
}
for (const row of suKienRows) {
  if (row.cover_id && isCfImageUuid(row.cover_id)) cfSet.add(row.cover_id);
  for (const id of collectCfFromText(row.noi_dung)) cfSet.add(id);
}

console.log(
  JSON.stringify(
    {
      studio: {
        jobs: jobRows.map((r) => ({ org: r.org_slug, tieu_de: r.tieu_de })),
        posts: studioPostRows.map((r) => ({
          org: r.org_slug,
          loai: r.loai_bai_dang,
          tieu_de: r.tieu_de,
        })),
      },
      coSoDaoTao: {
        suKien: suKienRows.map((r) => ({ org: r.org_slug, ten: r.ten })),
      },
      cloudflareImages: [...cfSet],
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

if (jobIds.length === 0 && postIds.length === 0 && suKienIds.length === 0) {
  console.log("Không có thông báo để xóa.");
  await db.end();
  process.exit(0);
}

console.log("\nĐang xóa DB…");

const deleted = await db.begin(async (tx) => {
  if (jobIds.length > 0) {
    await tx`
      DELETE FROM social_luu
      WHERE loai_doi_tuong = 'org_tuyen_dung' AND id_doi_tuong = ANY(${jobIds}::uuid[])
    `;
    await tx`
      DELETE FROM social_luot_xem
      WHERE loai_doi_tuong = 'org_tuyen_dung' AND id_doi_tuong = ANY(${jobIds}::uuid[])
    `;
    await tx`
      DELETE FROM org_tuyen_dung WHERE id = ANY(${jobIds}::uuid[])
    `;
  }

  if (postIds.length > 0) {
    await tx`
      DELETE FROM social_reaction
      WHERE loai_doi_tuong = 'org_bai_dang' AND id_doi_tuong = ANY(${postIds}::uuid[])
    `;
    await tx`
      DELETE FROM social_luu
      WHERE loai_doi_tuong = 'org_bai_dang' AND id_doi_tuong = ANY(${postIds}::uuid[])
    `;
    await tx`
      DELETE FROM social_luot_xem
      WHERE loai_doi_tuong = 'org_bai_dang' AND id_doi_tuong = ANY(${postIds}::uuid[])
    `;
    await tx`
      DELETE FROM org_bai_dang_tag WHERE id_bai_dang = ANY(${postIds}::uuid[])
    `;
    await tx`
      DELETE FROM filter_gan
      WHERE loai_doi_tuong = 'org_bai_dang' AND id_doi_tuong = ANY(${postIds}::uuid[])
    `;
    await tx`DELETE FROM org_bai_dang WHERE id = ANY(${postIds}::uuid[])`;
  }

  if (suKienIds.length > 0) {
    await tx`
      UPDATE content_cot_moc SET id_su_kien = NULL
      WHERE id_su_kien = ANY(${suKienIds}::uuid[])
    `;
    await tx`
      DELETE FROM verify_tham_du_su_kien WHERE id_su_kien = ANY(${suKienIds}::uuid[])
    `;
    await tx`
      DELETE FROM org_dang_ky_su_kien WHERE id_su_kien = ANY(${suKienIds}::uuid[])
    `;
    await tx`
      DELETE FROM social_luot_xem
      WHERE loai_doi_tuong = 'su_kien' AND id_doi_tuong = ANY(${suKienIds}::uuid[])
    `;
    await tx`
      DELETE FROM social_luu
      WHERE loai_doi_tuong = 'su_kien' AND id_doi_tuong = ANY(${suKienIds}::uuid[])
    `;
    await tx`DELETE FROM org_su_kien WHERE id = ANY(${suKienIds}::uuid[])`;
  }

  return {
    org_tuyen_dung: jobIds.length,
    studio_org_bai_dang: postIds.length,
    org_su_kien: suKienIds.length,
  };
});

console.log("DB xóa xong:", JSON.stringify(deleted, null, 2));
console.log("Đang dọn Cloudflare…");

const purgeResults = [];
for (const imageId of cfSet) {
  if (await isCloudflareImageReferenced(db, imageId)) {
    purgeResults.push({ id: imageId, skipped: "still referenced" });
    continue;
  }
  purgeResults.push({ id: imageId, ...(await deleteCloudflareImage(imageId)) });
}

console.log(
  JSON.stringify(
    {
      done: true,
      cloudflare: {
        total: cfSet.size,
        deleted: purgeResults.filter((r) => r.ok).length,
        failed: purgeResults.filter((r) => !r.ok && !r.skipped).length,
        skipped: purgeResults.filter((r) => r.skipped).length,
      },
      purgeResults,
    },
    null,
    2,
  ),
);

await db.end();
