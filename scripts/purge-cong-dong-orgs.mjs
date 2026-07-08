/**
 * Xóa toàn bộ cộng đồng (org_to_chuc loai cong_dong) + dọn ảnh Cloudflare.
 * Usage: node scripts/purge-cong-dong-orgs.mjs [--confirm]
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
    db`SELECT COUNT(*)::int c FROM content_tac_pham WHERE cover_id = ${imageId}`,
    db`SELECT COUNT(*)::int c FROM content_tac_pham WHERE noi_dung_blocks::text ILIKE ${like}`,
    db`SELECT COUNT(*)::int c FROM content_media WHERE cloudflare_id = ${imageId}`,
    db`SELECT COUNT(*)::int c FROM user_nguoi_dung WHERE avatar_id = ${imageId}`,
    db`SELECT COUNT(*)::int c FROM org_to_chuc WHERE avatar_id = ${imageId} OR cover_id = ${imageId}`,
    db`SELECT COUNT(*)::int c FROM org_bai_dang WHERE cover_id = ${imageId}`,
    db`SELECT COUNT(*)::int c FROM org_khoa_hoc WHERE avatar_id = ${imageId} OR cover_id = ${imageId}`,
    db`SELECT COUNT(*)::int c FROM org_hinh_anh WHERE cloudflare_id = ${imageId}`,
  ]);
  return checks.some((r) => r[0].c > 0);
}

loadEnv();
const confirm = process.argv.includes("--confirm");
const db = postgres(process.env.DATABASE_URL, { max: 1 });

const orgs = await db`
  SELECT id, slug, ten, avatar_id, cover_id
  FROM org_to_chuc WHERE loai_to_chuc = 'cong_dong' ORDER BY ten
`;
const orgIds = orgs.map((o) => o.id);

const mocIds =
  orgIds.length > 0
    ? (await db`SELECT id FROM content_cot_moc WHERE id_to_chuc = ANY(${orgIds}::uuid[])`).map(
        (r) => r.id,
      )
    : [];

const tacPhamIds =
  mocIds.length > 0
    ? (
        await db`
          SELECT DISTINCT id_tac_pham AS id FROM content_tac_pham_thuoc_moc
          WHERE id_cot_moc = ANY(${mocIds}::uuid[])
        `
      ).map((r) => r.id)
    : [];

const tacPhamRows =
  tacPhamIds.length > 0
    ? await db`
        SELECT id, cover_id, noi_dung_blocks FROM content_tac_pham
        WHERE id = ANY(${tacPhamIds}::uuid[])
      `
    : [];

const orgBaiDangIds =
  orgIds.length > 0
    ? (await db`SELECT id, cover_id, noi_dung_blocks FROM org_bai_dang WHERE id_to_chuc = ANY(${orgIds}::uuid[])`)
    : [];

const orgHinhAnh =
  orgIds.length > 0
    ? await db`SELECT cloudflare_id FROM org_hinh_anh WHERE id_to_chuc = ANY(${orgIds}::uuid[])`
    : [];

const cfSet = new Set();
for (const org of orgs) {
  for (const field of [org.avatar_id, org.cover_id]) {
    if (field && isCfImageUuid(field)) cfSet.add(field);
  }
}
for (const row of tacPhamRows) {
  if (row.cover_id && isCfImageUuid(row.cover_id)) cfSet.add(row.cover_id);
  for (const id of collectCfFromText(
    typeof row.noi_dung_blocks === "string"
      ? row.noi_dung_blocks
      : JSON.stringify(row.noi_dung_blocks ?? ""),
  )) {
    cfSet.add(id);
  }
}
for (const row of orgBaiDangIds) {
  if (row.cover_id && isCfImageUuid(row.cover_id)) cfSet.add(row.cover_id);
  for (const id of collectCfFromText(
    typeof row.noi_dung_blocks === "string"
      ? row.noi_dung_blocks
      : JSON.stringify(row.noi_dung_blocks ?? ""),
  )) {
    cfSet.add(id);
  }
}
for (const row of orgHinhAnh) {
  if (row.cloudflare_id && isCfImageUuid(row.cloudflare_id)) cfSet.add(row.cloudflare_id);
}

console.log(
  JSON.stringify(
    {
      communities: orgs.map((o) => ({ slug: o.slug, ten: o.ten })),
      related: {
        members: orgIds.length
          ? (await db`SELECT COUNT(*)::int c FROM user_thanh_vien_to_chuc WHERE id_to_chuc = ANY(${orgIds}::uuid[])`)[0].c
          : 0,
        filters: orgIds.length
          ? (await db`SELECT COUNT(*)::int c FROM cong_dong_filter WHERE id_context = ANY(${orgIds}::uuid[])`)[0].c
          : 0,
        cot_moc: mocIds.length,
        tac_pham: tacPhamIds.length,
        org_bai_dang: orgBaiDangIds.length,
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

if (orgIds.length === 0) {
  console.log("Không có cộng đồng để xóa.");
  await db.end();
  process.exit(0);
}

console.log("\nĐang xóa DB…");

const deleted = await db.begin(async (tx) => {
  const orgBaiIds = orgBaiDangIds.map((r) => r.id);

  if (mocIds.length > 0) {
    const commentIds = (
      await tx`
        SELECT id FROM social_binh_luan
        WHERE loai_doi_tuong = 'cot_moc' AND id_doi_tuong = ANY(${mocIds}::uuid[])
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
      WHERE loai_doi_tuong = 'cot_moc' AND id_doi_tuong = ANY(${mocIds}::uuid[])
    `;
    await tx`
      DELETE FROM social_thong_bao
      WHERE loai_doi_tuong = 'cot_moc' AND id_doi_tuong = ANY(${mocIds}::uuid[])
    `;
    await tx`
      DELETE FROM social_binh_luan
      WHERE loai_doi_tuong = 'cot_moc' AND id_doi_tuong = ANY(${mocIds}::uuid[])
    `;
    await tx`
      DELETE FROM social_luu
      WHERE loai_doi_tuong = 'cot_moc' AND id_doi_tuong = ANY(${mocIds}::uuid[])
    `;
    await tx`
      DELETE FROM filter_gan
      WHERE loai_doi_tuong = 'cot_moc' AND id_doi_tuong = ANY(${mocIds}::uuid[])
    `;
    await tx`
      DELETE FROM cong_dong_filter_gan WHERE id_cot_moc = ANY(${mocIds}::uuid[])
    `;
    await tx`
      DELETE FROM article_gan_cot_moc WHERE id_cot_moc = ANY(${mocIds}::uuid[])
    `;
    await tx`
      DELETE FROM verify_xac_nhan WHERE id_cot_moc = ANY(${mocIds}::uuid[])
    `;
    await tx`
      DELETE FROM verify_yeu_cau WHERE id_cot_moc = ANY(${mocIds}::uuid[])
    `;
    await tx`
      DELETE FROM content_tac_pham_thuoc_moc WHERE id_cot_moc = ANY(${mocIds}::uuid[])
    `;
    await tx`DELETE FROM content_cot_moc WHERE id = ANY(${mocIds}::uuid[])`;
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
    await tx`DELETE FROM content_tac_pham WHERE id = ANY(${tacPhamIds}::uuid[])`;
  }

  if (orgBaiIds.length > 0) {
    await tx`
      DELETE FROM social_reaction
      WHERE loai_doi_tuong = 'org_bai_dang' AND id_doi_tuong = ANY(${orgBaiIds}::uuid[])
    `;
    await tx`
      DELETE FROM social_luu
      WHERE loai_doi_tuong = 'org_bai_dang' AND id_doi_tuong = ANY(${orgBaiIds}::uuid[])
    `;
    await tx`
      DELETE FROM org_bai_dang_tag WHERE id_bai_dang = ANY(${orgBaiIds}::uuid[])
    `;
    await tx`
      DELETE FROM filter_gan
      WHERE loai_doi_tuong = 'org_bai_dang' AND id_doi_tuong = ANY(${orgBaiIds}::uuid[])
    `;
    await tx`DELETE FROM org_bai_dang WHERE id = ANY(${orgBaiIds}::uuid[])`;
  }

  await tx`DELETE FROM verify_yeu_cau WHERE id_to_chuc = ANY(${orgIds}::uuid[])`;
  await tx`DELETE FROM org_hinh_anh WHERE id_to_chuc = ANY(${orgIds}::uuid[])`;
  await tx`DELETE FROM chat_phong WHERE id_org_dai_dien = ANY(${orgIds}::uuid[])`;
  await tx`
    DELETE FROM cong_dong_filter WHERE id_context = ANY(${orgIds}::uuid[])
  `;

  const filterNhanIds = (
    await tx`SELECT id FROM filter_nhan WHERE id_to_chuc = ANY(${orgIds}::uuid[])`
  ).map((r) => r.id);
  if (filterNhanIds.length > 0) {
    await tx`
      DELETE FROM filter_gan WHERE id_filter = ANY(${filterNhanIds}::uuid[])
    `;
    await tx`DELETE FROM filter_nhan WHERE id = ANY(${filterNhanIds}::uuid[])`;
  }

  await tx`
    DELETE FROM user_theo_doi
    WHERE loai_doi_tuong = 'to_chuc' AND id_doi_tuong = ANY(${orgIds}::uuid[])
  `;
  const members = await tx`
    DELETE FROM user_thanh_vien_to_chuc WHERE id_to_chuc = ANY(${orgIds}::uuid[]) RETURNING id_nguoi_dung
  `;
  const orgsDeleted = await tx`
    DELETE FROM org_to_chuc WHERE id = ANY(${orgIds}::uuid[]) RETURNING id
  `;

  return {
    cot_moc: mocIds.length,
    tac_pham: tacPhamIds.length,
    org_bai_dang: orgBaiIds.length,
    members: members.length,
    orgs: orgsDeleted.length,
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
