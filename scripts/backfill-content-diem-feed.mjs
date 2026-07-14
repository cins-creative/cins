/**
 * Backfill content_diem_feed từ content_cot_moc + org_bai_dang (Bước 5).
 * Idempotent upsert theo (loai_doi_tuong, id_doi_tuong).
 *
 * Usage: node scripts/backfill-content-diem-feed.mjs
 */
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const url =
  process.env.DATABASE_URL?.trim() || process.env.SUPABASE_DB_URL?.trim();
if (!url) {
  console.error("Missing DATABASE_URL / SUPABASE_DB_URL in .env.local");
  process.exit(1);
}

const u = new URL(url);
const password =
  process.env.SUPABASE_DB_PASSWORD?.trim() ||
  process.env.DATABASE_PASSWORD?.trim() ||
  decodeURIComponent(u.password || "");

const db = postgres({
  host: u.hostname,
  port: u.port ? Number(u.port) : 5432,
  database: u.pathname.replace(/^\//, "") || "postgres",
  username: decodeURIComponent(u.username),
  password,
  max: 1,
  connect_timeout: 20,
  ssl:
    u.hostname.includes("supabase.co") || u.hostname.includes("supabase.com")
      ? "require"
      : undefined,
});

const FEED_SCORE = {
  BASE: 40,
  VERIFIED: 20,
  MAX_CONTENT: 20,
  MAX_ENGAGEMENT: 20,
  BOOST_RESET_SCORE: 100,
  CONTENT_PART: 5,
  CONTENT_TEXT_MIN_CHARS: 50,
};

const BATCH = 80;

function htmlToPlain(html) {
  return String(html ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function plainFromBlocks(blocks) {
  if (!Array.isArray(blocks)) return "";
  const parts = [];
  for (const b of blocks) {
    if (!b || typeof b !== "object") continue;
    const loai = b.loai;
    if (loai === "body" || loai === "h2" || loai === "h3" || loai === "quote") {
      const html = b.config?.html;
      if (typeof html === "string") parts.push(htmlToPlain(html));
    }
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function hasImgs(blocks) {
  if (!Array.isArray(blocks)) return false;
  return blocks.some(
    (b) =>
      b?.loai === "imgs" &&
      Array.isArray(b.config?.imgs) &&
      b.config.imgs.some((id) => typeof id === "string" && id.trim()),
  );
}

/** Khớp gần `detectMediaPostKind` / `hasGalleryEmbedContent` (embed = video hoặc embed sống). */
function hasEmbedBlock(blocks) {
  if (!Array.isArray(blocks)) return false;
  return blocks.some((b) => b?.loai === "embed");
}

function hasThumbnail({ coverId, blocks }) {
  if (coverId && String(coverId).trim()) return true;
  if (hasImgs(blocks)) return true;
  /* Bài chỉ media video (caption + embed) — tính thumbnail. */
  if (!Array.isArray(blocks) || blocks.length === 0) return false;
  let imgs = false;
  let embed = false;
  for (const b of blocks) {
    if (!b || typeof b !== "object") continue;
    if (b.loai === "body") continue;
    if (b.loai === "imgs") {
      imgs = true;
      continue;
    }
    if (b.loai === "embed") {
      embed = true;
      continue;
    }
    return false;
  }
  return embed && !imgs;
}

function tinhDiemNoiDung({ coverId, moTa, blocks, hasTag }) {
  let score = 0;
  if (hasThumbnail({ coverId, blocks })) {
    score += FEED_SCORE.CONTENT_PART;
  }
  const plain = [htmlToPlain(moTa), plainFromBlocks(blocks)]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length > FEED_SCORE.CONTENT_TEXT_MIN_CHARS) {
    score += FEED_SCORE.CONTENT_PART;
  }
  if (hasTag) score += FEED_SCORE.CONTENT_PART;
  if (hasEmbedBlock(blocks)) score += FEED_SCORE.CONTENT_PART;
  return Math.min(FEED_SCORE.MAX_CONTENT, score);
}

function tinhDiemEngagement(tongDonVi) {
  if (tongDonVi <= 0) return 0;
  return Math.min(
    FEED_SCORE.MAX_ENGAGEMENT,
    Math.round(8 * Math.log10(tongDonVi + 1)),
  );
}

function tongDonVi({ reactions, comments, luu }) {
  return reactions * 1 + comments * 2 + luu * 3;
}

async function loadBoostMap() {
  const rows = await db`
    SELECT loai_doi_tuong, id_doi_tuong, cap_boi
    FROM content_world_boost
    WHERE dang_bat = true
      AND loai_doi_tuong IN ('cot_moc', 'org_bai_dang')
  `;
  const map = new Map();
  for (const r of rows) {
    map.set(`${r.loai_doi_tuong}:${r.id_doi_tuong}`, r.cap_boi ?? null);
  }
  return map;
}

async function engagementMap(loai, ids) {
  const map = new Map();
  if (ids.length === 0) return map;
  const idStrs = ids.map((id) => String(id));
  for (const id of idStrs) {
    map.set(id, { reactions: 0, comments: 0, luu: 0 });
  }

  const reactions = await db`
    SELECT id_doi_tuong::text AS id, COUNT(*)::int AS n
    FROM social_reaction
    WHERE loai_doi_tuong = ${loai}
      AND id_doi_tuong = ANY(${ids}::uuid[])
    GROUP BY id_doi_tuong
  `;
  for (const r of reactions) {
    const cur = map.get(r.id) ?? { reactions: 0, comments: 0, luu: 0 };
    cur.reactions = r.n;
    map.set(r.id, cur);
  }

  const comments = await db`
    SELECT id_doi_tuong::text AS id, COUNT(*)::int AS n
    FROM social_binh_luan
    WHERE loai_doi_tuong = ${loai}
      AND id_doi_tuong = ANY(${ids}::uuid[])
      AND COALESCE(da_xoa, false) = false
    GROUP BY id_doi_tuong
  `;
  for (const r of comments) {
    const cur = map.get(r.id) ?? { reactions: 0, comments: 0, luu: 0 };
    cur.comments = r.n;
    map.set(r.id, cur);
  }

  const luu = await db`
    SELECT id_doi_tuong::text AS id, COUNT(*)::int AS n
    FROM social_luu
    WHERE loai_doi_tuong = ${loai}
      AND id_doi_tuong = ANY(${ids}::uuid[])
    GROUP BY id_doi_tuong
  `;
  for (const r of luu) {
    const cur = map.get(r.id) ?? { reactions: 0, comments: 0, luu: 0 };
    cur.luu = r.n;
    map.set(r.id, cur);
  }

  return map;
}

async function upsertRows(rows) {
  if (rows.length === 0) return;
  const now = new Date().toISOString();
  for (const row of rows) {
    await db`
      INSERT INTO content_diem_feed (
        loai_doi_tuong, id_doi_tuong,
        diem_co_ban, diem_noi_dung, diem_verify, diem_engagement,
        engagement_can_tinh_lai, bat_dau_luc, day_boi, day_luc,
        tao_luc, cap_nhat_luc
      ) VALUES (
        ${row.loai}, ${row.id}::uuid,
        ${row.diem_co_ban}, ${row.diem_noi_dung}, ${row.diem_verify}, ${row.diem_engagement},
        false, ${row.bat_dau_luc}, ${row.day_boi}, ${row.day_luc},
        ${now}, ${now}
      )
      ON CONFLICT (loai_doi_tuong, id_doi_tuong) DO UPDATE SET
        diem_co_ban = EXCLUDED.diem_co_ban,
        diem_noi_dung = EXCLUDED.diem_noi_dung,
        diem_verify = EXCLUDED.diem_verify,
        diem_engagement = EXCLUDED.diem_engagement,
        engagement_can_tinh_lai = false,
        bat_dau_luc = EXCLUDED.bat_dau_luc,
        day_boi = COALESCE(EXCLUDED.day_boi, content_diem_feed.day_boi),
        day_luc = COALESCE(EXCLUDED.day_luc, content_diem_feed.day_luc),
        cap_nhat_luc = EXCLUDED.cap_nhat_luc
    `;
  }
}

async function backfillCotMoc(boostMap) {
  const [{ count }] = await db`
    SELECT COUNT(*)::int AS count FROM content_cot_moc
  `;
  console.log(`[cot_moc] total ${count}`);

  let offset = 0;
  let written = 0;
  while (offset < count) {
    const mocs = await db`
      SELECT id, mo_ta, tao_luc
      FROM content_cot_moc
      ORDER BY tao_luc ASC NULLS LAST, id ASC
      LIMIT ${BATCH} OFFSET ${offset}
    `;
    if (mocs.length === 0) break;
    const ids = mocs.map((m) => m.id);

    const links = await db`
      SELECT DISTINCT ON (id_cot_moc)
        id_cot_moc, id_tac_pham
      FROM content_tac_pham_thuoc_moc
      WHERE id_cot_moc = ANY(${ids}::uuid[])
      ORDER BY id_cot_moc, thu_tu ASC NULLS LAST
    `;
    const tpIds = [...new Set(links.map((l) => l.id_tac_pham))];
    const tpByMoc = new Map(
      links.map((l) => [String(l.id_cot_moc), String(l.id_tac_pham)]),
    );

    const tps =
      tpIds.length === 0
        ? []
        : await db`
            SELECT id, cover_id, mo_ta, noi_dung_blocks
            FROM content_tac_pham
            WHERE id = ANY(${tpIds}::uuid[])
          `;
    const tpMap = new Map(tps.map((t) => [String(t.id), t]));

    const tags = await db`
      SELECT id_cot_moc::text AS id, COUNT(*)::int AS n
      FROM article_gan_cot_moc
      WHERE id_cot_moc = ANY(${ids}::uuid[])
      GROUP BY id_cot_moc
    `;
    const tagSet = new Set(tags.filter((t) => t.n > 0).map((t) => t.id));

    const verified = await db`
      SELECT DISTINCT id_cot_moc::text AS id
      FROM verify_xac_nhan
      WHERE id_cot_moc = ANY(${ids}::uuid[])
        AND trang_thai = 'da_xac_nhan'
    `;
    const verifySet = new Set(verified.map((v) => v.id));

    const eng = await engagementMap("cot_moc", ids);
    const nowIso = new Date().toISOString();
    const rows = [];

    for (const moc of mocs) {
      const mocId = String(moc.id);
      const tpId = tpByMoc.get(mocId);
      const tp = tpId ? tpMap.get(tpId) : null;
      const blocks = tp?.noi_dung_blocks ?? null;
      const moTa = moc.mo_ta?.trim() || tp?.mo_ta || null;
      const key = `cot_moc:${mocId}`;
      const boosted = boostMap.has(key);
      const units = eng.get(mocId) ?? { reactions: 0, comments: 0, luu: 0 };

      rows.push({
        loai: "cot_moc",
        id: mocId,
        diem_co_ban: boosted
          ? FEED_SCORE.BOOST_RESET_SCORE
          : FEED_SCORE.BASE,
        diem_noi_dung: tinhDiemNoiDung({
          coverId: tp?.cover_id ?? null,
          moTa,
          blocks,
          hasTag: tagSet.has(mocId),
        }),
        diem_verify: verifySet.has(mocId) ? FEED_SCORE.VERIFIED : 0,
        diem_engagement: tinhDiemEngagement(tongDonVi(units)),
        bat_dau_luc: boosted
          ? nowIso
          : moc.tao_luc?.toISOString?.() ??
            new Date(moc.tao_luc).toISOString(),
        day_boi: boosted ? boostMap.get(key) : null,
        day_luc: boosted ? nowIso : null,
      });
    }

    await upsertRows(rows);
    written += rows.length;
    offset += mocs.length;
    console.log(`[cot_moc] ${written}/${count}`);
  }
  return written;
}

async function backfillOrgBaiDang(boostMap) {
  const [{ count }] = await db`
    SELECT COUNT(*)::int AS count FROM org_bai_dang
  `;
  console.log(`[org_bai_dang] total ${count}`);

  let offset = 0;
  let written = 0;
  while (offset < count) {
    const posts = await db`
      SELECT id, tom_tat, cover_id, noi_dung_blocks, tao_luc
      FROM org_bai_dang
      ORDER BY tao_luc ASC NULLS LAST, id ASC
      LIMIT ${BATCH} OFFSET ${offset}
    `;
    if (posts.length === 0) break;
    const ids = posts.map((p) => p.id);

    const tags = await db`
      SELECT id_bai_dang::text AS id, COUNT(*)::int AS n
      FROM org_bai_dang_tag
      WHERE id_bai_dang = ANY(${ids}::uuid[])
      GROUP BY id_bai_dang
    `;
    const tagSet = new Set(tags.filter((t) => t.n > 0).map((t) => t.id));
    const eng = await engagementMap("org_bai_dang", ids);
    const nowIso = new Date().toISOString();
    const rows = [];

    for (const post of posts) {
      const postId = String(post.id);
      const key = `org_bai_dang:${postId}`;
      const boosted = boostMap.has(key);
      const units = eng.get(postId) ?? { reactions: 0, comments: 0, luu: 0 };
      rows.push({
        loai: "org_bai_dang",
        id: postId,
        diem_co_ban: boosted
          ? FEED_SCORE.BOOST_RESET_SCORE
          : FEED_SCORE.BASE,
        diem_noi_dung: tinhDiemNoiDung({
          coverId: post.cover_id,
          moTa: post.tom_tat,
          blocks: post.noi_dung_blocks,
          hasTag: tagSet.has(postId),
        }),
        diem_verify: 0,
        diem_engagement: tinhDiemEngagement(tongDonVi(units)),
        bat_dau_luc: boosted
          ? nowIso
          : post.tao_luc?.toISOString?.() ??
            new Date(post.tao_luc).toISOString(),
        day_boi: boosted ? boostMap.get(key) : null,
        day_luc: boosted ? nowIso : null,
      });
    }

    await upsertRows(rows);
    written += rows.length;
    offset += posts.length;
    console.log(`[org_bai_dang] ${written}/${count}`);
  }
  return written;
}

try {
  const boostMap = await loadBoostMap();
  console.log(`[boost] active cot_moc/org_bai_dang: ${boostMap.size}`);
  const nCot = await backfillCotMoc(boostMap);
  const nOrg = await backfillOrgBaiDang(boostMap);
  const [{ total }] = await db`
    SELECT COUNT(*)::int AS total FROM content_diem_feed
  `;
  console.log(
    `OK backfill: cot_moc=${nCot} org_bai_dang=${nOrg} content_diem_feed=${total}`,
  );
} catch (err) {
  console.error("Backfill failed:", err?.message ?? err);
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
