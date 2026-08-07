/**
 * Soft-map shop_nhom chưa gắn danh mục / facet từ alias (danh_muc_xac_nhan=false).
 * Usage: node scripts/soft-map-shop-taxonomy.mjs
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

/** @param {string} raw */
function normalize(raw) {
  return raw
    .trim()
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {string} hay
 * @param {{ tu_khoa: string, id: string }[]} aliases
 */
function bestMatch(hay, aliases) {
  let best = null;
  let bestScore = 0;
  for (const a of aliases) {
    const kw = a.tu_khoa;
    if (!kw) continue;
    let score = 0;
    if (hay === kw) score = 100;
    else if (hay.includes(kw)) score = 40 + Math.min(kw.length, 20);
    else if (kw.includes(hay) && hay.length >= 4) score = 25;
    else {
      const tokens = hay.split(" ").filter((t) => t.length >= 3);
      for (const t of tokens) {
        if (kw.includes(t) || t.includes(kw)) score += 5;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  return bestScore >= 25 ? best : null;
}

const db = postgres(rawUrl, {
  max: 1,
  connect_timeout: 15,
  ssl: "require",
  prepare: false,
});

try {
  const dmAliases = await db`
    SELECT a.tu_khoa, a.id_danh_muc AS id, d.slug
    FROM public.shop_danh_muc_alias a
    JOIN public.shop_danh_muc d ON d.id = a.id_danh_muc
    WHERE d.trang_thai = 'hien' AND d.slug <> 'khac'
  `;

  const facetAliases = await db`
    SELECT a.tu_khoa, a.id_gia_tri AS id, g.slug AS gia_tri_slug, t.slug AS facet_slug
    FROM public.shop_thuoc_tinh_alias a
    JOIN public.shop_thuoc_tinh_gia_tri g ON g.id = a.id_gia_tri
    JOIN public.shop_thuoc_tinh t ON t.id = a.id_thuoc_tinh
    WHERE g.trang_thai = 'hien' AND t.trang_thai = 'hien'
      AND g.slug <> 'khac'
  `;

  const nhoms = await db`
    SELECT id, nhan, id_danh_muc
    FROM public.shop_nhom
    WHERE da_xoa = false AND truc = 1
  `;

  let mappedDm = 0;
  let mappedFacet = 0;
  let skippedDm = 0;

  for (const nhom of nhoms) {
    const hay = normalize(String(nhom.nhan ?? ""));
    if (!hay) continue;

    if (!nhom.id_danh_muc) {
      const hit = bestMatch(
        hay,
        dmAliases.map((a) => ({ tu_khoa: a.tu_khoa, id: a.id })),
      );
      if (hit) {
        await db`
          UPDATE public.shop_nhom
          SET id_danh_muc = ${hit.id}::uuid,
              danh_muc_xac_nhan = false,
              cap_nhat_luc = now()
          WHERE id = ${nhom.id}::uuid
            AND id_danh_muc IS NULL
        `;
        mappedDm += 1;
      } else {
        skippedDm += 1;
      }
    }

    /** Facet: mọi giá trị khớp (fandom + chat-lieu), không trùng. */
    const facetHits = new Map();
    for (const a of facetAliases) {
      const kw = a.tu_khoa;
      if (!kw) continue;
      let score = 0;
      if (hay.includes(kw)) score = 40 + Math.min(kw.length, 20);
      else {
        const tokens = hay.split(" ").filter((t) => t.length >= 3);
        for (const t of tokens) {
          if (kw.includes(t) || t.includes(kw)) score += 5;
        }
      }
      if (score < 25) continue;
      const prev = facetHits.get(a.id);
      if (!prev || score > prev.score) {
        facetHits.set(a.id, { score, facet: a.facet_slug });
      }
    }

    for (const [giaTriId] of facetHits) {
      const inserted = await db`
        INSERT INTO public.shop_nhom_thuoc_tinh (id_nhom, id_gia_tri)
        VALUES (${nhom.id}::uuid, ${giaTriId}::uuid)
        ON CONFLICT (id_nhom, id_gia_tri) DO NOTHING
        RETURNING id
      `;
      if (inserted.length) mappedFacet += 1;
    }
  }

  /** Refresh so_shop_dung cache cho giá trị facet. */
  await db`
    UPDATE public.shop_thuoc_tinh_gia_tri g
    SET so_shop_dung = COALESCE(s.cnt, 0),
        cap_nhat_luc = now()
    FROM (
      SELECT nt.id_gia_tri, count(DISTINCT n.id_nguoi_dung)::int AS cnt
      FROM public.shop_nhom_thuoc_tinh nt
      JOIN public.shop_nhom n ON n.id = nt.id_nhom AND n.da_xoa = false
      GROUP BY nt.id_gia_tri
    ) s
    WHERE g.id = s.id_gia_tri
  `;

  console.log(
    JSON.stringify(
      {
        nhomTotal: nhoms.length,
        mappedDanhMuc: mappedDm,
        skippedDanhMuc: skippedDm,
        facetLinksAdded: mappedFacet,
      },
      null,
      2,
    ),
  );
} catch (err) {
  console.error("soft-map failed:", err?.message ?? err);
  process.exitCode = 1;
} finally {
  await db.end({ timeout: 5 });
}
