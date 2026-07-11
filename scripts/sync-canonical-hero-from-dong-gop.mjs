/**
 * Backfill hero (tom_tat / thumbnail / tiêu đề) từ bản đóng góp la_hien_tai
 * lên article_bai_viet — nuôi ent-hero + tooltip tag Journey.
 *
 * Usage: node scripts/sync-canonical-hero-from-dong-gop.mjs
 * Optional: --slug=cins  (chỉ một bài)
 */
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Missing DATABASE_URL in .env.local");
  process.exit(1);
}

const slugArg = process.argv
  .find((a) => a.startsWith("--slug="))
  ?.slice("--slug=".length)
  ?.trim();

const WRAPPER_OPEN_RE =
  /^<div\s+class="cins-contrib-document"\s+data-cins-hero="([^"]*)">/i;
const TOM_TAT_MAX = 280;

function stripHtml(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unpackContrib(noiDung) {
  const t = (noiDung ?? "").trim();
  if (!t) return { hero: {}, bodyHtml: "" };
  const open = t.match(WRAPPER_OPEN_RE);
  if (open?.[1]) {
    const closeIdx = t.toLowerCase().lastIndexOf("</div>");
    if (closeIdx > open[0].length) {
      try {
        const hero = JSON.parse(decodeURIComponent(open[1]));
        return {
          hero: hero && typeof hero === "object" ? hero : {},
          bodyHtml: t.slice(open[0].length, closeIdx).trim(),
        };
      } catch {
        /* fall through */
      }
    }
  }
  return { hero: {}, bodyHtml: t };
}

function stripArticleWrapper(html) {
  const t = (html ?? "").trim();
  if (!t) return "";
  // Mirror compile-html strip — remove outer article/div wrappers if present
  return t
    .replace(/^<article[^>]*>/i, "")
    .replace(/<\/article>\s*$/i, "")
    .trim();
}

function resolveTomTat(hero, body) {
  const fromHero = String(hero.tom_tat ?? "")
    .trim()
    .slice(0, TOM_TAT_MAX);
  if (fromHero) return fromHero;
  const plain = stripHtml(body).slice(0, TOM_TAT_MAX).trim();
  return plain || null;
}

const db = postgres(url, { max: 1 });

try {
  const rows = slugArg
    ? await db`
        SELECT
          tg.id_bai_viet,
          tg.id_nguoi_dung,
          dg.id AS id_dong_gop,
          dg.id_nguoi_dong_gop,
          dg.noi_dung,
          bv.slug,
          bv.tieu_de AS article_title,
          bv.tom_tat AS old_tom_tat,
          bv.thumbnail AS old_thumb
        FROM article_tac_gia tg
        JOIN article_dong_gop dg ON dg.id = tg.id_dong_gop
        JOIN article_bai_viet bv ON bv.id = tg.id_bai_viet
        WHERE tg.la_hien_tai = true
          AND tg.id_dong_gop IS NOT NULL
          AND bv.slug = ${slugArg}
      `
    : await db`
        SELECT
          tg.id_bai_viet,
          tg.id_nguoi_dung,
          dg.id AS id_dong_gop,
          dg.id_nguoi_dong_gop,
          dg.noi_dung,
          bv.slug,
          bv.tieu_de AS article_title,
          bv.tom_tat AS old_tom_tat,
          bv.thumbnail AS old_thumb
        FROM article_tac_gia tg
        JOIN article_dong_gop dg ON dg.id = tg.id_dong_gop
        JOIN article_bai_viet bv ON bv.id = tg.id_bai_viet
        WHERE tg.la_hien_tai = true
          AND tg.id_dong_gop IS NOT NULL
      `;

  console.log(`Found ${rows.length} article(s) with current đóng góp`);

  let synced = 0;
  for (const row of rows) {
    const { hero, bodyHtml } = unpackContrib(row.noi_dung);
    const canonicalBody = stripArticleWrapper(bodyHtml);
    if (!canonicalBody) {
      console.warn(`SKIP ${row.slug}: empty body`);
      continue;
    }

    const [{ count }] = await db`
      SELECT COUNT(DISTINCT id_nguoi_dung)::int AS count
      FROM article_tac_gia
      WHERE id_bai_viet = ${row.id_bai_viet}
    `;

    const tomTat = resolveTomTat(hero, canonicalBody);
    const tieuDe = String(hero.tieu_de ?? "").trim() || null;
    const tieuDeViet = String(hero.tieu_de_viet ?? "").trim() || null;
    const tieuDeEng = String(hero.tieu_de_eng ?? "").trim() || null;
    const thumbnail = String(hero.thumbnail ?? "").trim() || null;
    const videoUrl = String(hero.video_url ?? "").trim() || null;

    await db`
      UPDATE article_bai_viet
      SET
        noi_dung = ${canonicalBody},
        id_tac_gia_chinh = ${row.id_nguoi_dong_gop},
        so_nguoi_dong_gop = ${count},
        tieu_de = COALESCE(${tieuDe}, tieu_de),
        tieu_de_viet = COALESCE(${tieuDeViet}, tieu_de_viet),
        tieu_de_eng = COALESCE(${tieuDeEng}, tieu_de_eng),
        tom_tat = COALESCE(${tomTat}, tom_tat),
        thumbnail = COALESCE(${thumbnail}, thumbnail),
        main_video = COALESCE(${videoUrl}, main_video),
        cap_nhat_luc = now()
      WHERE id = ${row.id_bai_viet}
    `;

    synced += 1;
    console.log(
      `OK ${row.slug}: tom_tat ${row.old_tom_tat ? "had" : "empty"} → ${tomTat ? `${tomTat.slice(0, 48)}…` : "unchanged"}, thumb ${thumbnail ? "set" : "keep"}`,
    );
  }

  console.log(`Synced ${synced}/${rows.length}`);
} catch (err) {
  console.error("Sync failed:", err?.message ?? err);
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
