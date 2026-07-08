/**
 * 1) Xóa toàn bộ nội dung chat
 * 2) Xóa org studio + co_so_dao_tao (không đụng truong_dai_hoc)
 *
 * Usage: node scripts/purge-chat-and-orgs.mjs [--confirm]
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
    db`SELECT COUNT(*)::int c FROM org_to_chuc WHERE avatar_id = ${imageId} OR cover_id = ${imageId}`,
    db`SELECT COUNT(*)::int c FROM org_bai_dang WHERE cover_id = ${imageId}`,
    db`SELECT COUNT(*)::int c FROM org_hinh_anh WHERE cloudflare_id = ${imageId}`,
    db`SELECT COUNT(*)::int c FROM org_khoa_hoc WHERE avatar_id = ${imageId} OR cover_id = ${imageId}`,
    db`SELECT COUNT(*)::int c FROM org_su_kien WHERE cover_id = ${imageId}`,
    db`SELECT COUNT(*)::int c FROM user_nguoi_dung WHERE avatar_id = ${imageId}`,
    db`SELECT COUNT(*)::int c FROM content_tac_pham WHERE cover_id = ${imageId}`,
  ]);
  return checks.some((r) => r[0].c > 0);
}

loadEnv();
const confirm = process.argv.includes("--confirm");
const db = postgres(process.env.DATABASE_URL, { max: 1 });

const chatBefore = {
  chat_tin_nhan: (await db`SELECT COUNT(*)::int c FROM chat_tin_nhan`)[0].c,
  chat_phong: (await db`SELECT COUNT(*)::int c FROM chat_phong`)[0].c,
  chat_thanh_vien: (await db`SELECT COUNT(*)::int c FROM chat_thanh_vien`)[0].c,
  chat_da_doc: (await db`SELECT COUNT(*)::int c FROM chat_da_doc`)[0].c,
  chat_ghim: (await db`SELECT COUNT(*)::int c FROM chat_ghim`)[0].c,
};

const orgs = await db`
  SELECT id, slug, ten, loai_to_chuc, avatar_id, cover_id
  FROM org_to_chuc
  WHERE loai_to_chuc IN ('studio', 'co_so_dao_tao')
  ORDER BY loai_to_chuc, slug
`;
const orgIds = orgs.map((o) => o.id);

const cfSet = new Set();
for (const org of orgs) {
  for (const field of [org.avatar_id, org.cover_id]) {
    if (field && isCfImageUuid(field)) cfSet.add(field);
  }
}

if (orgIds.length > 0) {
  const hinhAnh = await db`
    SELECT cloudflare_id FROM org_hinh_anh WHERE id_to_chuc = ANY(${orgIds}::uuid[])
  `;
  for (const row of hinhAnh) {
    if (row.cloudflare_id && isCfImageUuid(row.cloudflare_id)) cfSet.add(row.cloudflare_id);
  }
  const baiDang = await db`
    SELECT cover_id, noi_dung_blocks FROM org_bai_dang WHERE id_to_chuc = ANY(${orgIds}::uuid[])
  `;
  for (const row of baiDang) {
    if (row.cover_id && isCfImageUuid(row.cover_id)) cfSet.add(row.cover_id);
    for (const id of collectCfFromText(
      typeof row.noi_dung_blocks === "string"
        ? row.noi_dung_blocks
        : JSON.stringify(row.noi_dung_blocks ?? ""),
    )) {
      cfSet.add(id);
    }
  }
}

console.log(
  JSON.stringify(
    {
      chatBefore,
      orgs: orgs.map((o) => ({ loai: o.loai_to_chuc, slug: o.slug, ten: o.ten })),
      truongDaiHocKept: (
        await db`SELECT COUNT(*)::int c FROM org_to_chuc WHERE loai_to_chuc = 'truong_dai_hoc'`
      )[0].c,
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

console.log("\n=== Phase 1: Chat ===");
const chatDeleted = await db.begin(async (tx) => {
  const msgIds = (await tx`SELECT id FROM chat_tin_nhan`).map((r) => r.id);
  let reactions = 0;
  if (msgIds.length > 0) {
    const r = await tx`
      DELETE FROM social_reaction
      WHERE loai_doi_tuong = 'chat_tin_nhan' AND id_doi_tuong = ANY(${msgIds}::uuid[])
      RETURNING id_doi_tuong
    `;
    reactions = r.length;
  }
  const ghim = await tx`DELETE FROM chat_ghim RETURNING id_phong`;
  const daDoc = await tx`DELETE FROM chat_da_doc RETURNING id_phong`;
  await tx`UPDATE chat_tin_nhan SET id_tin_tra_loi = NULL, id_dinh_kem = NULL`;
  const msgs = await tx`DELETE FROM chat_tin_nhan RETURNING id`;
  const members = await tx`DELETE FROM chat_thanh_vien RETURNING id_phong`;
  const rooms = await tx`DELETE FROM chat_phong RETURNING id`;
  return {
    social_reaction: reactions,
    chat_ghim: ghim.length,
    chat_da_doc: daDoc.length,
    chat_tin_nhan: msgs.length,
    chat_thanh_vien: members.length,
    chat_phong: rooms.length,
  };
});
console.log("Chat xóa:", JSON.stringify(chatDeleted, null, 2));

console.log("\n=== Phase 2: Studio + CSDT orgs ===");
let orgDeleted = { orgs: 0 };
if (orgIds.length > 0) {
  orgDeleted = await db.begin(async (tx) => {
    const mocIds = (await tx`SELECT id FROM content_cot_moc WHERE id_to_chuc = ANY(${orgIds}::uuid[])`).map(
      (r) => r.id,
    );
    const tacPhamIds =
      mocIds.length > 0
        ? (
            await tx`
              SELECT DISTINCT id_tac_pham AS id FROM content_tac_pham_thuoc_moc
              WHERE id_cot_moc = ANY(${mocIds}::uuid[])
            `
          ).map((r) => r.id)
        : [];

    const postIds = (
      await tx`SELECT id FROM org_bai_dang WHERE id_to_chuc = ANY(${orgIds}::uuid[])`
    ).map((r) => r.id);
    const khoaIds = (
      await tx`SELECT id FROM org_khoa_hoc WHERE id_to_chuc = ANY(${orgIds}::uuid[])`
    ).map((r) => r.id);
    const lopIds =
      khoaIds.length > 0
        ? (await tx`SELECT id FROM org_lop_hoc WHERE id_khoa_hoc = ANY(${khoaIds}::uuid[])`).map((r) => r.id)
        : [];
    const suKienIds = (
      await tx`SELECT id FROM org_su_kien WHERE id_to_chuc = ANY(${orgIds}::uuid[])`
    ).map((r) => r.id);
    const jobIds = (
      await tx`SELECT id FROM org_tuyen_dung WHERE id_to_chuc = ANY(${orgIds}::uuid[])`
    ).map((r) => r.id);

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
      }
      await tx`DELETE FROM social_reaction WHERE loai_doi_tuong = 'cot_moc' AND id_doi_tuong = ANY(${mocIds}::uuid[])`;
      await tx`DELETE FROM social_binh_luan WHERE loai_doi_tuong = 'cot_moc' AND id_doi_tuong = ANY(${mocIds}::uuid[])`;
      await tx`DELETE FROM social_luu WHERE loai_doi_tuong = 'cot_moc' AND id_doi_tuong = ANY(${mocIds}::uuid[])`;
      await tx`DELETE FROM filter_gan WHERE loai_doi_tuong = 'cot_moc' AND id_doi_tuong = ANY(${mocIds}::uuid[])`;
      await tx`DELETE FROM cong_dong_filter_gan WHERE id_cot_moc = ANY(${mocIds}::uuid[])`;
      await tx`DELETE FROM article_gan_cot_moc WHERE id_cot_moc = ANY(${mocIds}::uuid[])`;
      await tx`DELETE FROM verify_xac_nhan WHERE id_cot_moc = ANY(${mocIds}::uuid[])`;
      await tx`DELETE FROM verify_yeu_cau WHERE id_cot_moc = ANY(${mocIds}::uuid[])`;
      await tx`DELETE FROM content_tac_pham_thuoc_moc WHERE id_cot_moc = ANY(${mocIds}::uuid[])`;
      await tx`DELETE FROM content_cot_moc WHERE id = ANY(${mocIds}::uuid[])`;
    }

    if (tacPhamIds.length > 0) {
      await tx`DELETE FROM article_gan_tac_pham WHERE id_tac_pham = ANY(${tacPhamIds}::uuid[])`;
      await tx`DELETE FROM content_tac_pham_tac_gia WHERE id_tac_pham = ANY(${tacPhamIds}::uuid[])`;
      await tx`DELETE FROM content_media WHERE id_tac_pham = ANY(${tacPhamIds}::uuid[])`;
      await tx`DELETE FROM content_tac_pham WHERE id = ANY(${tacPhamIds}::uuid[])`;
    }

    if (postIds.length > 0) {
      await tx`DELETE FROM social_reaction WHERE loai_doi_tuong = 'org_bai_dang' AND id_doi_tuong = ANY(${postIds}::uuid[])`;
      await tx`DELETE FROM social_luu WHERE loai_doi_tuong = 'org_bai_dang' AND id_doi_tuong = ANY(${postIds}::uuid[])`;
      await tx`DELETE FROM org_bai_dang_tag WHERE id_bai_dang = ANY(${postIds}::uuid[])`;
      await tx`DELETE FROM filter_gan WHERE loai_doi_tuong = 'org_bai_dang' AND id_doi_tuong = ANY(${postIds}::uuid[])`;
      await tx`DELETE FROM org_bai_dang WHERE id = ANY(${postIds}::uuid[])`;
    }

    if (khoaIds.length > 0) {
      if (lopIds.length > 0) {
        await tx`UPDATE content_cot_moc SET id_lop_hoc = NULL WHERE id_lop_hoc = ANY(${lopIds}::uuid[])`;
        await tx`DELETE FROM user_hoc_vien_lop WHERE id_lop_hoc = ANY(${lopIds}::uuid[])`;
      }
      await tx`UPDATE content_cot_moc SET id_khoa_hoc = NULL WHERE id_khoa_hoc = ANY(${khoaIds}::uuid[])`;
      await tx`DELETE FROM user_hoc_vien_lop WHERE id_khoa_hoc = ANY(${khoaIds}::uuid[])`;
      await tx`DELETE FROM org_bai_tap WHERE id_khoa_hoc = ANY(${khoaIds}::uuid[])`;
      await tx`DELETE FROM org_giao_trinh WHERE id_khoa_hoc = ANY(${khoaIds}::uuid[])`;
      await tx`DELETE FROM org_lop_hoc WHERE id_khoa_hoc = ANY(${khoaIds}::uuid[])`;
      await tx`DELETE FROM org_khoa_hoc WHERE id = ANY(${khoaIds}::uuid[])`;
    }

    if (suKienIds.length > 0) {
      await tx`UPDATE content_cot_moc SET id_su_kien = NULL WHERE id_su_kien = ANY(${suKienIds}::uuid[])`;
      await tx`DELETE FROM verify_tham_du_su_kien WHERE id_su_kien = ANY(${suKienIds}::uuid[])`;
      await tx`DELETE FROM org_dang_ky_su_kien WHERE id_su_kien = ANY(${suKienIds}::uuid[])`;
      await tx`DELETE FROM social_luot_xem WHERE loai_doi_tuong = 'su_kien' AND id_doi_tuong = ANY(${suKienIds}::uuid[])`;
      await tx`DELETE FROM org_su_kien WHERE id = ANY(${suKienIds}::uuid[])`;
    }

    if (jobIds.length > 0) {
      await tx`DELETE FROM social_luu WHERE loai_doi_tuong = 'org_tuyen_dung' AND id_doi_tuong = ANY(${jobIds}::uuid[])`;
      await tx`DELETE FROM org_tuyen_dung WHERE id = ANY(${jobIds}::uuid[])`;
    }

    await tx`DELETE FROM verify_yeu_cau WHERE id_to_chuc = ANY(${orgIds}::uuid[])`;
    await tx`DELETE FROM org_hinh_anh WHERE id_to_chuc = ANY(${orgIds}::uuid[])`;
    await tx`DELETE FROM org_scout_luu WHERE id_to_chuc = ANY(${orgIds}::uuid[])`;
    await tx`DELETE FROM org_cau_hinh_khoi WHERE id_to_chuc = ANY(${orgIds}::uuid[])`;
    await tx`DELETE FROM org_co_so_dao_tao WHERE id_to_chuc = ANY(${orgIds}::uuid[])`;
    await tx`DELETE FROM project_du_an WHERE id_to_chuc_owner = ANY(${orgIds}::uuid[])`;

    const filterNhanIds = (
      await tx`SELECT id FROM filter_nhan WHERE id_to_chuc = ANY(${orgIds}::uuid[])`
    ).map((r) => r.id);
    if (filterNhanIds.length > 0) {
      await tx`DELETE FROM filter_gan WHERE id_filter = ANY(${filterNhanIds}::uuid[])`;
      await tx`DELETE FROM filter_nhan WHERE id = ANY(${filterNhanIds}::uuid[])`;
    }

    await tx`
      DELETE FROM user_theo_doi
      WHERE loai_doi_tuong = 'to_chuc' AND id_doi_tuong = ANY(${orgIds}::uuid[])
    `;
    const members = await tx`
      DELETE FROM user_thanh_vien_to_chuc WHERE id_to_chuc = ANY(${orgIds}::uuid[]) RETURNING id_nguoi_dung
    `;
    const deletedOrgs = await tx`
      DELETE FROM org_to_chuc WHERE id = ANY(${orgIds}::uuid[]) RETURNING id
    `;

    return {
      org_to_chuc: deletedOrgs.length,
      user_thanh_vien_to_chuc: members.length,
      content_cot_moc: mocIds.length,
      org_bai_dang: postIds.length,
    };
  });
}
console.log("Org xóa:", JSON.stringify(orgDeleted, null, 2));

console.log("\n=== Cloudflare ===");
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
        skipped: purgeResults.filter((r) => r.skipped).length,
        failed: purgeResults.filter((r) => !r.ok && !r.skipped).length,
      },
      purgeResults,
    },
    null,
    2,
  ),
);

await db.end();
