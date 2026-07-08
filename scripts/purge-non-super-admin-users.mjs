/**
 * Xóa toàn bộ user trừ admin tối cao (SUPER_ADMIN_EMAIL / info.cins.vn@gmail.com).
 *
 * Usage:
 *   node scripts/purge-non-super-admin-users.mjs           # dry-run
 *   node scripts/purge-non-super-admin-users.mjs --confirm   # thực thi
 */
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

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
  const checks = await Promise.all([
    db`SELECT COUNT(*)::int c FROM user_nguoi_dung WHERE avatar_id = ${imageId}`,
    db`SELECT COUNT(*)::int c FROM org_to_chuc WHERE avatar_id = ${imageId} OR cover_id = ${imageId}`,
    db`SELECT COUNT(*)::int c FROM content_tac_pham WHERE cover_id = ${imageId}`,
  ]);
  return checks.some((r) => r[0].c > 0);
}

loadEnv();
const confirm = process.argv.includes("--confirm");
const SUPER = (process.env.SUPER_ADMIN_EMAIL || "info.cins.vn@gmail.com").toLowerCase().trim();

const db = postgres(process.env.DATABASE_URL, { max: 1 });

const [keep] = await db`
  SELECT nd.id, nd.slug, nd.ten_hien_thi, nd.auth_user_id, au.email AS auth_email
  FROM user_nguoi_dung nd
  JOIN auth.users au ON au.id = nd.auth_user_id
  WHERE lower(au.email) = ${SUPER}
`;

if (!keep) {
  console.error(`Không tìm thấy admin tối cao với email: ${SUPER}`);
  await db.end();
  process.exit(1);
}

const toDelete = await db`
  SELECT nd.id, nd.slug, nd.ten_hien_thi, nd.auth_user_id, nd.avatar_id,
         au.email AS auth_email, nd.email_lien_he, qh.vai_tro
  FROM user_nguoi_dung nd
  LEFT JOIN auth.users au ON au.id = nd.auth_user_id
  LEFT JOIN user_quyen_he_thong qh ON qh.id_nguoi_dung = nd.id
  WHERE nd.id <> ${keep.id}
  ORDER BY nd.tao_luc
`;

const deleteIds = toDelete.map((u) => u.id);
const authIds = toDelete.map((u) => u.auth_user_id).filter(Boolean);
const cfSet = new Set();
for (const u of toDelete) {
  if (u.avatar_id && isCfImageUuid(u.avatar_id)) cfSet.add(u.avatar_id);
}

const preDeleteCounts = {};
if (deleteIds.length > 0) {
  preDeleteCounts.user_theo_doi_target = (
    await db`
      SELECT COUNT(*)::int c FROM user_theo_doi
      WHERE loai_doi_tuong = 'nguoi_dung' AND id_doi_tuong = ANY(${deleteIds}::uuid[])
    `
  )[0].c;
  preDeleteCounts.user_thanh_vien_to_chuc = (
    await db`
      SELECT COUNT(*)::int c FROM user_thanh_vien_to_chuc
      WHERE id_nguoi_dung = ANY(${deleteIds}::uuid[])
    `
  )[0].c;
  preDeleteCounts.filter_nhan = (
    await db`
      SELECT COUNT(*)::int c FROM filter_nhan
      WHERE id_nguoi_dung = ANY(${deleteIds}::uuid[])
    `
  )[0].c;
  preDeleteCounts.social_thong_bao = (
    await db`
      SELECT COUNT(*)::int c FROM social_thong_bao
      WHERE nguoi_nhan = ANY(${deleteIds}::uuid[])
    `
  )[0].c;
}

console.log(
  JSON.stringify(
    {
      superAdminEmail: SUPER,
      keep: {
        slug: keep.slug,
        ten: keep.ten_hien_thi,
        email: keep.auth_email,
      },
      toDelete: toDelete.map((u) => ({
        slug: u.slug,
        email: u.auth_email ?? u.email_lien_he,
        vai_tro: u.vai_tro,
        hasAvatar: Boolean(u.avatar_id),
      })),
      totals: {
        profiles: toDelete.length,
        authUsers: authIds.length,
        cloudflareAvatars: cfSet.size,
      },
      preDeleteCounts,
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

if (deleteIds.length === 0) {
  console.log("Không có user nào cần xóa.");
  await db.end();
  process.exit(0);
}

console.log("\n=== Phase 1: DB profiles + auth ===");
const dbResult = await db.begin(async (tx) => {
  const followRemoved = await tx`
    DELETE FROM user_theo_doi
    WHERE loai_doi_tuong = 'nguoi_dung' AND id_doi_tuong = ANY(${deleteIds}::uuid[])
    RETURNING id
  `;

  const profiles = await tx`
    DELETE FROM user_nguoi_dung
    WHERE id = ANY(${deleteIds}::uuid[])
    RETURNING id, slug
  `;

  let authRemoved = [];
  if (authIds.length > 0) {
    authRemoved = await tx`
      DELETE FROM auth.users
      WHERE id = ANY(${authIds}::uuid[])
      RETURNING id, email
    `;
  }

  return {
    user_theo_doi_target: followRemoved.length,
    user_nguoi_dung: profiles.length,
    auth_users: authRemoved.length,
    deletedSlugs: profiles.map((p) => p.slug),
  };
});
console.log("DB xóa:", JSON.stringify(dbResult, null, 2));

console.log("\n=== Phase 2: Cloudflare avatars ===");
const purgeResults = [];
for (const imageId of cfSet) {
  if (await isCloudflareImageReferenced(db, imageId)) {
    purgeResults.push({ id: imageId, skipped: "still referenced" });
    continue;
  }
  purgeResults.push({ id: imageId, ...(await deleteCloudflareImage(imageId)) });
}

const remaining = (await db`SELECT COUNT(*)::int c FROM user_nguoi_dung`)[0].c;
const remainingAuth = (
  await db`SELECT COUNT(*)::int c FROM auth.users au JOIN user_nguoi_dung nd ON nd.auth_user_id = au.id`
)[0].c;

console.log(
  JSON.stringify(
    {
      done: true,
      cloudflare: {
        total: cfSet.size,
        deleted: purgeResults.filter((r) => r.ok).length,
        skipped: purgeResults.filter((r) => r.skipped).length,
        failed: purgeResults.filter((r) => !r.ok && !r.skipped).length,
      },
      purgeResults,
      verify: {
        user_nguoi_dung: remaining,
        linked_auth_users: remainingAuth,
      },
    },
    null,
    2,
  ),
);

await db.end();
