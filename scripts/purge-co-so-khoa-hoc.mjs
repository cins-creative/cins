/**
 * Xóa toàn bộ org_khoa_hoc của cơ sở đào tạo + dọn ảnh Cloudflare.
 * Usage: node scripts/purge-co-so-khoa-hoc.mjs [--confirm]
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

function collectCfFromKhoa(row) {
  const set = new Set();
  for (const field of [row.avatar_id, row.cover_id]) {
    const id = field?.trim();
    if (id && isCfImageUuid(id)) set.add(id);
  }
  const blocks =
    typeof row.noi_dung_blocks === "string"
      ? row.noi_dung_blocks
      : JSON.stringify(row.noi_dung_blocks ?? "");
  for (const id of collectCfFromText(blocks)) set.add(id);
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
    db`SELECT COUNT(*)::int c FROM content_tac_pham WHERE cover_id = ${imageId}`,
    db`SELECT COUNT(*)::int c FROM content_tac_pham WHERE noi_dung_blocks::text ILIKE ${like}`,
    db`SELECT COUNT(*)::int c FROM content_media WHERE cloudflare_id = ${imageId}`,
    db`SELECT COUNT(*)::int c FROM user_nguoi_dung WHERE avatar_id = ${imageId}`,
    db`SELECT COUNT(*)::int c FROM org_to_chuc WHERE avatar_id = ${imageId} OR cover_id = ${imageId}`,
    db`SELECT COUNT(*)::int c FROM org_bai_dang WHERE cover_id = ${imageId}`,
    db`SELECT COUNT(*)::int c FROM org_bai_dang WHERE noi_dung_blocks::text ILIKE ${like}`,
    db`SELECT COUNT(*)::int c FROM org_khoa_hoc WHERE avatar_id = ${imageId} OR cover_id = ${imageId}`,
    db`SELECT COUNT(*)::int c FROM org_khoa_hoc WHERE noi_dung_blocks::text ILIKE ${like}`,
  ]);
  return checks.some((r) => r[0].c > 0);
}

loadEnv();
const confirm = process.argv.includes("--confirm");
const db = postgres(process.env.DATABASE_URL, { max: 1 });

const khoaRows = await db`
  SELECT k.id, k.slug, k.ten_khoa_hoc, k.avatar_id, k.cover_id, k.noi_dung_blocks,
         o.slug AS org_slug, o.ten AS org_ten
  FROM org_khoa_hoc k
  JOIN org_to_chuc o ON o.id = k.id_to_chuc
  WHERE o.loai_to_chuc = 'co_so_dao_tao'
  ORDER BY o.slug, k.ten_khoa_hoc
`;

const khoaIds = khoaRows.map((r) => r.id);
const lopIds =
  khoaIds.length > 0
    ? (await db`SELECT id FROM org_lop_hoc WHERE id_khoa_hoc = ANY(${khoaIds}::uuid[])`).map(
        (r) => r.id,
      )
    : [];

const cfSet = new Set();
for (const row of khoaRows) {
  for (const id of collectCfFromKhoa(row)) cfSet.add(id);
}

if (khoaIds.length > 0) {
  const baiTapThumbs = await db`
    SELECT thumbnail_url FROM org_bai_tap WHERE id_khoa_hoc = ANY(${khoaIds}::uuid[])
  `;
  for (const row of baiTapThumbs) {
    for (const id of collectCfFromText(row.thumbnail_url)) cfSet.add(id);
  }
}

const related =
  khoaIds.length > 0
    ? {
        org_lop_hoc: (
          await db`SELECT COUNT(*)::int c FROM org_lop_hoc WHERE id_khoa_hoc = ANY(${khoaIds}::uuid[])`
        )[0].c,
        user_hoc_vien_lop: (
          await db`SELECT COUNT(*)::int c FROM user_hoc_vien_lop WHERE id_khoa_hoc = ANY(${khoaIds}::uuid[])`
        )[0].c,
        org_bai_tap: (
          await db`SELECT COUNT(*)::int c FROM org_bai_tap WHERE id_khoa_hoc = ANY(${khoaIds}::uuid[])`
        )[0].c,
        org_giao_trinh: (
          await db`SELECT COUNT(*)::int c FROM org_giao_trinh WHERE id_khoa_hoc = ANY(${khoaIds}::uuid[])`
        )[0].c,
        content_cot_moc: (
          await db`SELECT COUNT(*)::int c FROM content_cot_moc WHERE id_khoa_hoc = ANY(${khoaIds}::uuid[]) OR id_lop_hoc = ANY(${lopIds}::uuid[])`
        )[0].c,
      }
    : {};

console.log(
  JSON.stringify(
    {
      totalKhoa: khoaRows.length,
      related,
      cloudflareImages: [...cfSet],
      khoa: khoaRows.map((r) => ({
        org: r.org_slug,
        slug: r.slug,
        ten: r.ten_khoa_hoc,
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

if (khoaIds.length === 0) {
  console.log("Không có khóa học cơ sở đào tạo để xóa.");
  await db.end();
  process.exit(0);
}

console.log("\nĐang xóa DB…");

const deleted = await db.begin(async (tx) => {
  if (lopIds.length > 0) {
    await tx`
      UPDATE content_cot_moc SET id_lop_hoc = NULL
      WHERE id_lop_hoc = ANY(${lopIds}::uuid[])
    `;
    await tx`
      DELETE FROM user_hoc_vien_lop
      WHERE id_lop_hoc = ANY(${lopIds}::uuid[])
    `;
  }

  await tx`
    UPDATE content_cot_moc SET id_khoa_hoc = NULL
    WHERE id_khoa_hoc = ANY(${khoaIds}::uuid[])
  `;
  await tx`
    DELETE FROM user_hoc_vien_lop
    WHERE id_khoa_hoc = ANY(${khoaIds}::uuid[])
  `;
  const baiTap = await tx`
    DELETE FROM org_bai_tap WHERE id_khoa_hoc = ANY(${khoaIds}::uuid[]) RETURNING id
  `;
  const giaoTrinh = await tx`
    DELETE FROM org_giao_trinh WHERE id_khoa_hoc = ANY(${khoaIds}::uuid[]) RETURNING id
  `;
  const lop = await tx`
    DELETE FROM org_lop_hoc WHERE id_khoa_hoc = ANY(${khoaIds}::uuid[]) RETURNING id
  `;
  const khoa = await tx`
    DELETE FROM org_khoa_hoc WHERE id = ANY(${khoaIds}::uuid[]) RETURNING id
  `;
  return {
    org_bai_tap: baiTap.length,
    org_giao_trinh: giaoTrinh.length,
    org_lop_hoc: lop.length,
    org_khoa_hoc: khoa.length,
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
