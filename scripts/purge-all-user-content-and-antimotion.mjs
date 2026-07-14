/**
 * 1) Xóa TOÀN BỘ nội dung Journey người dùng (content_cot_moc + content_tac_pham)
 *    kể cả milestone đã xác thực org (verify_*), feed score, world boost, media.
 * 2) Xóa studio Antimotion (+ tuyển dụng / thành viên / phụ thuộc org).
 *
 * Usage:
 *   node scripts/purge-all-user-content-and-antimotion.mjs           # dry-run
 *   node scripts/purge-all-user-content-and-antimotion.mjs --confirm  # thực thi
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
  const text = typeof raw === "string" ? raw : JSON.stringify(raw);
  for (const m of text.matchAll(CF_UUID_RE)) {
    if (isCfImageUuid(m[0])) cf.add(m[0].toLowerCase());
  }
  for (const m of text.matchAll(BUNNY_ID_RE)) bunny.add(m[1]);
  return { cf, bunny };
}

async function tableExists(db, name) {
  const [{ c }] = await db`
    SELECT COUNT(*)::int AS c
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ${name}
  `;
  return c > 0;
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

async function deleteBunnyStreamVideo(videoId) {
  const libraryId = process.env.BUNNY_LIBRARY_ID?.trim();
  const apiKey = process.env.BUNNY_STREAM_API_KEY?.trim();
  if (!libraryId || !apiKey) return { ok: false, error: "Thiếu Bunny config" };
  try {
    const res = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos/${encodeURIComponent(videoId)}`,
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
  const like = `%${imageId}%`;
  const checks = await Promise.all([
    db`SELECT COUNT(*)::int c FROM content_tac_pham WHERE cover_id = ${imageId}`,
    db`SELECT COUNT(*)::int c FROM content_tac_pham WHERE noi_dung_blocks::text ILIKE ${like}`,
    db`SELECT COUNT(*)::int c FROM content_media WHERE cloudflare_id = ${imageId}`,
    db`SELECT COUNT(*)::int c FROM user_nguoi_dung WHERE avatar_id = ${imageId}`,
    db`SELECT COUNT(*)::int c FROM org_to_chuc WHERE avatar_id = ${imageId} OR cover_id = ${imageId}`,
    db`SELECT COUNT(*)::int c FROM org_bai_dang WHERE cover_id = ${imageId}`,
    db`SELECT COUNT(*)::int c FROM org_hinh_anh WHERE cloudflare_id = ${imageId}`,
  ]);
  return checks.some((r) => r[0].c > 0);
}

async function isBunnyVideoReferenced(db, videoId) {
  const [{ c }] =
    await db`SELECT COUNT(*)::int c FROM content_tac_pham WHERE noi_dung_blocks::text ILIKE ${"%" + videoId + "%"}`;
  return c > 0;
}

loadEnv();
const confirm = process.argv.includes("--confirm");
const url = process.env.DATABASE_URL?.trim() || process.env.SUPABASE_DB_URL?.trim();
if (!url) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const db = postgres(url, { max: 1, ssl: "require" });

const milestones = await db`
  SELECT id, tieu_de, nguon_goc, id_nguoi_dung, id_to_chuc
  FROM content_cot_moc
  ORDER BY tao_luc DESC
`;
const milestoneIds = milestones.map((m) => m.id);

const tacPhamRows = await db`
  SELECT id, cover_id, noi_dung_blocks, id_nguoi_dung
  FROM content_tac_pham
`;
const tacPhamIds = tacPhamRows.map((r) => r.id);

const mediaRows =
  tacPhamIds.length > 0
    ? await db`
        SELECT cloudflare_id FROM content_media
        WHERE id_tac_pham = ANY(${tacPhamIds}::uuid[])
      `
    : [];

const antimotionOrgs = await db`
  SELECT id, slug, ten, avatar_id, cover_id, logo_id
  FROM org_to_chuc
  WHERE loai_to_chuc = 'studio'
    AND (slug = 'antimotion' OR ten ILIKE 'Antimotion')
`;
const antimotionIds = antimotionOrgs.map((o) => o.id);

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
for (const org of antimotionOrgs) {
  for (const field of [org.avatar_id, org.cover_id, org.logo_id]) {
    if (field && isCfImageUuid(field)) cfSet.add(field);
  }
}

const verifiedCount = (
  await db`
    SELECT COUNT(DISTINCT id_cot_moc)::int AS c
    FROM verify_xac_nhan
    WHERE id_cot_moc = ANY(${milestoneIds}::uuid[])
  `
)[0].c;

const hasDiemFeed = await tableExists(db, "content_diem_feed");
const hasWorldBoost = await tableExists(db, "content_world_boost");
const hasLuotXem = await tableExists(db, "social_luot_xem");
const hasTacPhamLinhVuc = await tableExists(db, "content_tac_pham_linh_vuc");

console.log(
  JSON.stringify(
    {
      scope: {
        content_cot_moc: milestones.length,
        content_tac_pham: tacPhamRows.length,
        verified_milestones: verifiedCount,
        antimotion: antimotionOrgs.map((o) => ({ slug: o.slug, ten: o.ten, id: o.id })),
        cloudflareImages: cfSet.size,
        bunnyVideos: bunnySet.size,
        tables: { hasDiemFeed, hasWorldBoost, hasLuotXem, hasTacPhamLinhVuc },
      },
      note: "Xóa user Journey + verify + studio Antimotion. KHÔNG xóa tài khoản user / trường ĐH / bài org khác.",
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

console.log("\n=== Phase 1: User Journey content ===");

const journeyDeleted = await db.begin(async (tx) => {
  const stats = {};

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

    stats.social_reaction_cot_moc = (
      await tx`
        DELETE FROM social_reaction
        WHERE loai_doi_tuong = 'cot_moc' AND id_doi_tuong = ANY(${milestoneIds}::uuid[])
        RETURNING id_doi_tuong
      `
    ).length;

    await tx`
      DELETE FROM social_thong_bao
      WHERE loai_doi_tuong = 'cot_moc' AND id_doi_tuong = ANY(${milestoneIds}::uuid[])
    `;
    stats.social_binh_luan = (
      await tx`
        DELETE FROM social_binh_luan
        WHERE loai_doi_tuong = 'cot_moc' AND id_doi_tuong = ANY(${milestoneIds}::uuid[])
        RETURNING id
      `
    ).length;
    stats.social_luu = (
      await tx`
        DELETE FROM social_luu
        WHERE loai_doi_tuong = 'cot_moc' AND id_doi_tuong = ANY(${milestoneIds}::uuid[])
        RETURNING id_doi_tuong
      `
    ).length;

    if (hasLuotXem) {
      stats.social_luot_xem_cot_moc = (
        await tx`
          DELETE FROM social_luot_xem
          WHERE loai_doi_tuong = 'cot_moc' AND id_doi_tuong = ANY(${milestoneIds}::uuid[])
          RETURNING id_doi_tuong
        `
      ).length;
    }

    await tx`
      DELETE FROM filter_gan
      WHERE loai_doi_tuong = 'cot_moc' AND id_doi_tuong = ANY(${milestoneIds}::uuid[])
    `;
    await tx`
      DELETE FROM cong_dong_filter_gan
      WHERE id_cot_moc = ANY(${milestoneIds}::uuid[])
    `;
    await tx`
      DELETE FROM article_gan_cot_moc
      WHERE id_cot_moc = ANY(${milestoneIds}::uuid[])
    `;

    if (hasWorldBoost) {
      stats.content_world_boost = (
        await tx`
          DELETE FROM content_world_boost
          WHERE loai_doi_tuong = 'cot_moc' AND id_doi_tuong = ANY(${milestoneIds}::uuid[])
          RETURNING id_doi_tuong
        `
      ).length;
    }
    if (hasDiemFeed) {
      stats.content_diem_feed = (
        await tx`
          DELETE FROM content_diem_feed
          WHERE loai_doi_tuong = 'cot_moc' AND id_doi_tuong = ANY(${milestoneIds}::uuid[])
          RETURNING id_doi_tuong
        `
      ).length;
    }

    stats.verify_yeu_cau = (
      await tx`
        DELETE FROM verify_yeu_cau WHERE id_cot_moc = ANY(${milestoneIds}::uuid[])
        RETURNING id
      `
    ).length;
    stats.verify_xac_nhan = (
      await tx`
        DELETE FROM verify_xac_nhan WHERE id_cot_moc = ANY(${milestoneIds}::uuid[])
        RETURNING id
      `
    ).length;

    await tx`
      DELETE FROM content_tac_pham_thuoc_moc
      WHERE id_cot_moc = ANY(${milestoneIds}::uuid[])
    `;
    stats.content_cot_moc = (
      await tx`
        DELETE FROM content_cot_moc WHERE id = ANY(${milestoneIds}::uuid[])
        RETURNING id
      `
    ).length;
  }

  if (tacPhamIds.length > 0) {
    await tx`
      DELETE FROM article_gan_tac_pham WHERE id_tac_pham = ANY(${tacPhamIds}::uuid[])
    `;
    await tx`
      DELETE FROM content_tac_pham_tac_gia WHERE id_tac_pham = ANY(${tacPhamIds}::uuid[])
    `;
    if (hasTacPhamLinhVuc) {
      await tx`
        DELETE FROM content_tac_pham_linh_vuc WHERE id_tac_pham = ANY(${tacPhamIds}::uuid[])
      `;
    }
    stats.content_media = (
      await tx`
        DELETE FROM content_media WHERE id_tac_pham = ANY(${tacPhamIds}::uuid[])
        RETURNING id
      `
    ).length;
    stats.content_tac_pham = (
      await tx`
        DELETE FROM content_tac_pham WHERE id = ANY(${tacPhamIds}::uuid[])
        RETURNING id
      `
    ).length;
  }

  return stats;
});

console.log("Journey xóa:", JSON.stringify(journeyDeleted, null, 2));

console.log("\n=== Phase 2: Studio Antimotion ===");
let antimotionDeleted = { org_to_chuc: 0 };
if (antimotionIds.length > 0) {
  antimotionDeleted = await db.begin(async (tx) => {
    const stats = {};
    const postIds = (
      await tx`SELECT id FROM org_bai_dang WHERE id_to_chuc = ANY(${antimotionIds}::uuid[])`
    ).map((r) => r.id);
    const jobIds = (
      await tx`SELECT id FROM org_tuyen_dung WHERE id_to_chuc = ANY(${antimotionIds}::uuid[])`
    ).map((r) => r.id);
    const suKienIds = (
      await tx`SELECT id FROM org_su_kien WHERE id_to_chuc = ANY(${antimotionIds}::uuid[])`
    ).map((r) => r.id);
    const remainingMoc = (
      await tx`SELECT id FROM content_cot_moc WHERE id_to_chuc = ANY(${antimotionIds}::uuid[])`
    ).map((r) => r.id);

    if (remainingMoc.length > 0) {
      await tx`DELETE FROM verify_xac_nhan WHERE id_cot_moc = ANY(${remainingMoc}::uuid[])`;
      await tx`DELETE FROM verify_yeu_cau WHERE id_cot_moc = ANY(${remainingMoc}::uuid[])`;
      await tx`DELETE FROM content_tac_pham_thuoc_moc WHERE id_cot_moc = ANY(${remainingMoc}::uuid[])`;
      await tx`DELETE FROM content_cot_moc WHERE id = ANY(${remainingMoc}::uuid[])`;
      stats.content_cot_moc_remaining = remainingMoc.length;
    }

    if (postIds.length > 0) {
      await tx`DELETE FROM social_reaction WHERE loai_doi_tuong = 'org_bai_dang' AND id_doi_tuong = ANY(${postIds}::uuid[])`;
      await tx`DELETE FROM social_luu WHERE loai_doi_tuong = 'org_bai_dang' AND id_doi_tuong = ANY(${postIds}::uuid[])`;
      await tx`DELETE FROM org_bai_dang_tag WHERE id_bai_dang = ANY(${postIds}::uuid[])`;
      await tx`DELETE FROM filter_gan WHERE loai_doi_tuong = 'org_bai_dang' AND id_doi_tuong = ANY(${postIds}::uuid[])`;
      if (hasWorldBoost) {
        await tx`
          DELETE FROM content_world_boost
          WHERE loai_doi_tuong = 'org_bai_dang' AND id_doi_tuong = ANY(${postIds}::uuid[])
        `;
      }
      if (hasDiemFeed) {
        await tx`
          DELETE FROM content_diem_feed
          WHERE loai_doi_tuong = 'org_bai_dang' AND id_doi_tuong = ANY(${postIds}::uuid[])
        `;
      }
      await tx`DELETE FROM org_bai_dang WHERE id = ANY(${postIds}::uuid[])`;
      stats.org_bai_dang = postIds.length;
    }

    if (jobIds.length > 0) {
      await tx`DELETE FROM social_luu WHERE loai_doi_tuong = 'org_tuyen_dung' AND id_doi_tuong = ANY(${jobIds}::uuid[])`;
      if (hasLuotXem) {
        await tx`
          DELETE FROM social_luot_xem
          WHERE loai_doi_tuong = 'org_tuyen_dung' AND id_doi_tuong = ANY(${jobIds}::uuid[])
        `;
      }
      await tx`DELETE FROM org_tuyen_dung WHERE id = ANY(${jobIds}::uuid[])`;
      stats.org_tuyen_dung = jobIds.length;
    }

    if (suKienIds.length > 0) {
      await tx`DELETE FROM verify_tham_du_su_kien WHERE id_su_kien = ANY(${suKienIds}::uuid[])`;
      await tx`DELETE FROM org_dang_ky_su_kien WHERE id_su_kien = ANY(${suKienIds}::uuid[])`;
      if (hasLuotXem) {
        await tx`
          DELETE FROM social_luot_xem
          WHERE loai_doi_tuong = 'su_kien' AND id_doi_tuong = ANY(${suKienIds}::uuid[])
        `;
      }
      await tx`DELETE FROM org_su_kien WHERE id = ANY(${suKienIds}::uuid[])`;
      stats.org_su_kien = suKienIds.length;
    }

    await tx`DELETE FROM verify_yeu_cau WHERE id_to_chuc = ANY(${antimotionIds}::uuid[])`;
    await tx`DELETE FROM org_hinh_anh WHERE id_to_chuc = ANY(${antimotionIds}::uuid[])`;
    await tx`DELETE FROM org_scout_luu WHERE id_to_chuc = ANY(${antimotionIds}::uuid[])`;
    await tx`DELETE FROM org_cau_hinh_khoi WHERE id_to_chuc = ANY(${antimotionIds}::uuid[])`;
    await tx`DELETE FROM project_du_an WHERE id_to_chuc_owner = ANY(${antimotionIds}::uuid[])`;

    const filterNhanIds = (
      await tx`SELECT id FROM filter_nhan WHERE id_to_chuc = ANY(${antimotionIds}::uuid[])`
    ).map((r) => r.id);
    if (filterNhanIds.length > 0) {
      await tx`DELETE FROM filter_gan WHERE id_filter = ANY(${filterNhanIds}::uuid[])`;
      await tx`DELETE FROM filter_nhan WHERE id = ANY(${filterNhanIds}::uuid[])`;
    }

    await tx`
      UPDATE chat_phong SET id_org_dai_dien = NULL
      WHERE id_org_dai_dien = ANY(${antimotionIds}::uuid[])
    `;
    await tx`
      DELETE FROM user_theo_doi
      WHERE loai_doi_tuong = 'to_chuc' AND id_doi_tuong = ANY(${antimotionIds}::uuid[])
    `;
    stats.user_thanh_vien_to_chuc = (
      await tx`
        DELETE FROM user_thanh_vien_to_chuc
        WHERE id_to_chuc = ANY(${antimotionIds}::uuid[])
        RETURNING id_nguoi_dung
      `
    ).length;
    stats.org_to_chuc = (
      await tx`
        DELETE FROM org_to_chuc WHERE id = ANY(${antimotionIds}::uuid[])
        RETURNING id
      `
    ).length;

    return stats;
  });
}
console.log("Antimotion xóa:", JSON.stringify(antimotionDeleted, null, 2));

console.log("\n=== Phase 3: Cloudflare / Bunny ===");
const purgeResults = { cloudflare: [], bunny: [] };
for (const imageId of cfSet) {
  if (await isCloudflareImageReferenced(db, imageId)) {
    purgeResults.cloudflare.push({ id: imageId, skipped: "still referenced" });
    continue;
  }
  purgeResults.cloudflare.push({ id: imageId, ...(await deleteCloudflareImage(imageId)) });
}
for (const videoId of bunnySet) {
  if (await isBunnyVideoReferenced(db, videoId)) {
    purgeResults.bunny.push({ id: videoId, skipped: "still referenced" });
    continue;
  }
  purgeResults.bunny.push({ id: videoId, ...(await deleteBunnyStreamVideo(videoId)) });
}

const after = await db`
  SELECT
    (SELECT COUNT(*)::int FROM content_cot_moc) AS cot_moc,
    (SELECT COUNT(*)::int FROM content_tac_pham) AS tac_pham,
    (SELECT COUNT(*)::int FROM verify_xac_nhan) AS verify_xac_nhan,
    (SELECT COUNT(*)::int FROM verify_yeu_cau) AS verify_yeu_cau,
    (SELECT COUNT(*)::int FROM org_to_chuc WHERE loai_to_chuc = 'studio') AS studios,
    (SELECT COUNT(*)::int FROM org_to_chuc WHERE slug = 'antimotion') AS antimotion_left
`;

console.log(
  JSON.stringify(
    {
      done: true,
      after: after[0],
      hosting: {
        cloudflare: {
          total: cfSet.size,
          deleted: purgeResults.cloudflare.filter((r) => r.ok).length,
          skipped: purgeResults.cloudflare.filter((r) => r.skipped).length,
          failed: purgeResults.cloudflare.filter((r) => !r.ok && !r.skipped).length,
        },
        bunny: {
          total: bunnySet.size,
          deleted: purgeResults.bunny.filter((r) => r.ok).length,
          skipped: purgeResults.bunny.filter((r) => r.skipped).length,
          failed: purgeResults.bunny.filter((r) => !r.ok && !r.skipped).length,
        },
      },
    },
    null,
    2,
  ),
);

await db.end();
