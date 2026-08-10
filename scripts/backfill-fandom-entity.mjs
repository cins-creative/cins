/**
 * Backfill fandom entity từ seed facet shop cũ.
 * Usage: node scripts/backfill-fandom-entity.mjs
 *        npm run backfill:fandom-entity
 *
 * - Tạo 13 bài article_bai_viet loai=fandom (bỏ 'khac'), giữ slug cũ.
 * - Alias chọn lọc → article_alias (bỏ ba/gi/ak/oc/khac).
 * - Copy shop_nhom_thuoc_tinh (facet fandom) → shop_nhom_fandom.
 * - Báo cáo slug bị đổi do trùng.
 */
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const EXPECTED_PROJECT_REF = "ospzzzxcomrmhqrnkoiw";

const rawUrl =
  process.env.DATABASE_URL?.trim() || process.env.SUPABASE_DB_URL?.trim();
if (!rawUrl) {
  console.error("Missing DATABASE_URL / SUPABASE_DB_URL in .env.local");
  process.exit(1);
}

const parsedUrl = new URL(rawUrl);
const isExpectedProject =
  parsedUrl.hostname.includes(EXPECTED_PROJECT_REF) ||
  parsedUrl.username.includes(EXPECTED_PROJECT_REF);
if (!isExpectedProject) {
  console.error(
    `Refusing: target is not CINS ${EXPECTED_PROJECT_REF}.`,
  );
  process.exit(1);
}

/** Alias ngắn/mơ hồ — không mang sang article_alias. */
const ALIAS_DENY = new Set([
  "ba",
  "gi",
  "ak",
  "oc",
  "khac",
  "gi",
]);

/**
 * @param {string} raw
 */
function normalizeAlias(raw) {
  return String(raw ?? "")
    .trim()
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

const db = postgres(rawUrl, {
  max: 1,
  connect_timeout: 15,
  ssl: "require",
  prepare: false,
});

try {
  const facet = await db`
    SELECT id FROM public.shop_thuoc_tinh WHERE slug = 'fandom' LIMIT 1
  `;
  if (!facet[0]?.id) {
    console.error("Không tìm thấy shop_thuoc_tinh slug=fandom");
    process.exit(1);
  }
  const facetId = facet[0].id;

  const giaTri = await db`
    SELECT id, slug, ten, nhom, loai, thu_tu
    FROM public.shop_thuoc_tinh_gia_tri
    WHERE id_thuoc_tinh = ${facetId}::uuid
      AND slug <> 'khac'
    ORDER BY thu_tu ASC
  `;

  const slugChanged = [];
  const created = [];
  const reused = [];
  /** @type {Map<string, string>} oldGiaTriId → articleId */
  const mapGiaTriToBai = new Map();

  for (const g of giaTri) {
    const desiredSlug = String(g.slug);
    const ten = String(g.ten);

    const existingFandom = await db`
      SELECT id, slug
      FROM public.article_bai_viet
      WHERE loai_bai_viet = 'fandom'
        AND (
          slug = ${desiredSlug}
          OR lower(trim(tieu_de)) = lower(trim(${ten}))
        )
        AND trang_thai_noi_dung <> 'merged'
      LIMIT 1
    `;

    if (existingFandom[0]?.id) {
      mapGiaTriToBai.set(g.id, existingFandom[0].id);
      reused.push({ slug: existingFandom[0].slug, ten });
      continue;
    }

    let slug = desiredSlug;
    const clash = await db`
      SELECT id, loai_bai_viet FROM public.article_bai_viet
      WHERE slug = ${slug}
      LIMIT 1
    `;
    if (clash[0]?.id) {
      slug = `${desiredSlug}-fandom`;
      let n = 2;
      while (n < 50) {
        const again = await db`
          SELECT id FROM public.article_bai_viet WHERE slug = ${slug} LIMIT 1
        `;
        if (!again[0]) break;
        slug = `${desiredSlug}-fandom-${n}`;
        n += 1;
      }
      slugChanged.push({ from: desiredSlug, to: slug, ten });
    }

    const now = new Date().toISOString();
    const inserted = await db`
      INSERT INTO public.article_bai_viet (
        tieu_de, slug, loai_bai_viet, da_verify, noi_dung, tom_tat,
        trang_thai_noi_dung, tao_luc, cap_nhat_luc
      )
      VALUES (
        ${ten}, ${slug}, 'fandom', true, null, null,
        'published', ${now}::timestamptz, ${now}::timestamptz
      )
      RETURNING id, slug
    `;
    const baiId = inserted[0].id;
    mapGiaTriToBai.set(g.id, baiId);
    created.push({ slug: inserted[0].slug, ten });
  }

  /** Alias chọn lọc từ shop_thuoc_tinh_alias. */
  const aliases = await db`
    SELECT a.tu_khoa, a.id_gia_tri
    FROM public.shop_thuoc_tinh_alias a
    WHERE a.id_thuoc_tinh = ${facetId}::uuid
  `;

  let aliasInserted = 0;
  let aliasSkipped = 0;
  for (const a of aliases) {
    const baiId = mapGiaTriToBai.get(a.id_gia_tri);
    if (!baiId) {
      aliasSkipped += 1;
      continue;
    }
    const alias = normalizeAlias(a.tu_khoa);
    if (!alias || alias.length < 3 || ALIAS_DENY.has(alias)) {
      aliasSkipped += 1;
      continue;
    }
    try {
      const r = await db`
        INSERT INTO public.article_alias (ten_alias, id_bai_viet, nguon)
        VALUES (${alias}, ${baiId}::uuid, 'admin')
        ON CONFLICT (ten_alias) DO NOTHING
        RETURNING id
      `;
      if (r.length) aliasInserted += 1;
      else aliasSkipped += 1;
    } catch {
      aliasSkipped += 1;
    }
  }

  /** Copy junction facet → shop_nhom_fandom. */
  let links = 0;
  for (const [giaTriId, baiId] of mapGiaTriToBai) {
    const inserted = await db`
      INSERT INTO public.shop_nhom_fandom (id_nhom, id_bai_viet)
      SELECT nt.id_nhom, ${baiId}::uuid
      FROM public.shop_nhom_thuoc_tinh nt
      JOIN public.shop_nhom n ON n.id = nt.id_nhom AND n.da_xoa = false
      WHERE nt.id_gia_tri = ${giaTriId}::uuid
      ON CONFLICT (id_nhom, id_bai_viet) DO NOTHING
      RETURNING id
    `;
    links += inserted.length;
  }

  console.log(
    JSON.stringify(
      {
        giaTriSeed: giaTri.length,
        created: created.length,
        reused: reused.length,
        slugChanged,
        aliasInserted,
        aliasSkipped,
        shopNhomFandomLinks: links,
        createdSamples: created.slice(0, 5),
      },
      null,
      2,
    ),
  );
} catch (err) {
  console.error("backfill failed:", err?.message ?? err);
  process.exitCode = 1;
} finally {
  await db.end({ timeout: 5 });
}
