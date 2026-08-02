/**
 * Batch merge nghề trùng exact tieu_de_eng (+ alias VFX* → tên chung).
 *
 * Usage:
 *   npx tsx scripts/batch-merge-nghe-dups.mts            # dry-run
 *   npx tsx scripts/batch-merge-nghe-dups.mts --apply    # execute
 *   npx tsx scripts/batch-merge-nghe-dups.mts --apply --only=art-director,colorist
 */
import postgres from "postgres";

const APPLY = process.argv.includes("--apply");
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const ONLY = onlyArg
  ? new Set(
      onlyArg
        .slice("--only=".length)
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    )
  : null;

/** Chuẩn hoá key gộp — VFX Colorist → colorist; không gộp VFX Producer → producer. */
const TITLE_ALIASES: Record<string, string> = {
  "vfx colorist": "colorist",
  "vfx compositor": "compositor",
  "vfx lighting artist": "lighting artist",
};

/** Specialty giữ riêng — không alias vào tên chung. */
const EXCLUDE_ALIAS = new Set(["vfx producer"]);

/** Canonical English title theo cluster key (hiển thị / tieu_de_eng sau merge). */
const CANONICAL_ENG: Record<string, string> = {
  "3d generalist": "3D Generalist",
  "3d modeler": "3D Modeler",
  "art director": "Art Director",
  "character concept artist": "Character Concept Artist",
  "character designer": "Character Designer",
  colorist: "Colorist",
  compositor: "Compositor",
  "concept artist": "Concept Artist",
  "costume designer": "Costume Designer",
  "creative director": "Creative Director",
  "design director": "Design Director",
  "design manager": "Design Manager",
  director: "Director",
  editor: "Editor",
  "environment concept artist": "Environment Concept Artist",
  "foley artist": "Foley Artist",
  "fx artist": "FX Artist",
  "lighting artist": "Lighting Artist",
  "line producer": "Line Producer",
  "music composer": "Music Composer",
  "pipeline td": "Pipeline TD",
  "previs artist": "Previs Artist",
  producer: "Producer",
  "product designer": "Product Designer",
  "production coordinator": "Production Coordinator",
  "production manager": "Production Manager",
  "project manager": "Project Manager",
  "render td": "Render TD",
  "rigging artist": "Rigging Artist",
  "set designer": "Set Designer",
  "sound designer": "Sound Designer",
  "storyboard artist": "Storyboard Artist",
  "vfx supervisor": "VFX Supervisor",
};

type NgheRow = {
  id: string;
  slug: string;
  tieu_de: string;
  tieu_de_eng: string;
  tieu_de_viet: string | null;
  id_linh_vuc: string | null;
  status: string;
  body_len: number;
  cluster_key: string;
};

function normalizeEngKey(eng: string): string {
  const raw = eng.trim().toLowerCase().replace(/\s+/g, " ");
  if (EXCLUDE_ALIAS.has(raw)) return raw;
  return TITLE_ALIASES[raw] ?? raw;
}

function roleToSlug(clusterKey: string): string {
  const eng = CANONICAL_ENG[clusterKey] ?? clusterKey;
  const slug = eng
    .toLowerCase()
    .replace(/[()/]/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `nghe-${slug}`;
}

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false });

async function mergeCluster(
  clusterKey: string,
  members: NgheRow[],
): Promise<{ ok: boolean; message: string }> {
  const active = members.filter((m) =>
    ["published", "draft", "review"].includes(m.status),
  );
  if (active.length < 2) {
    return { ok: true, message: `skip (đã ≤1 active): ${clusterKey}` };
  }

  const sorted = [...active].sort((a, b) => {
    if (b.body_len !== a.body_len) return b.body_len - a.body_len;
    return a.slug.localeCompare(b.slug);
  });
  const winner = sorted[0]!;
  const losers = sorted.slice(1);
  const canonicalSlug = roleToSlug(clusterKey);
  const canonicalEng = CANONICAL_ENG[clusterKey] ?? winner.tieu_de_eng;

  const lvIds = [
    ...new Set(
      active
        .map((r) => (r.id_linh_vuc ? String(r.id_linh_vuc) : ""))
        .filter(Boolean),
    ),
  ];
  const winnerLv = winner.id_linh_vuc
    ? String(winner.id_linh_vuc)
    : lvIds[0]!;
  const oldWinnerSlug = winner.slug;

  console.log(`\n══ ${clusterKey} → ${canonicalSlug}`);
  console.log(`  WIN ${winner.body_len} ${winner.slug}`);
  for (const l of losers) console.log(`  LOS ${l.body_len} ${l.slug}`);
  console.log(`  LV  ${lvIds.length} lĩnh vực | eng=${canonicalEng}`);

  if (!APPLY) {
    return { ok: true, message: `dry-run: would merge ${losers.length} → ${canonicalSlug}` };
  }

  // Slug conflict: another live article already owns canonical slug
  const slugTaken = await sql`
    SELECT id, slug, trang_thai_noi_dung::text AS status
    FROM article_bai_viet
    WHERE slug = ${canonicalSlug} AND id <> ${winner.id}::uuid
  `;
  if (slugTaken.length) {
    const taken = slugTaken[0]!;
    if (taken.status !== "merged") {
      return {
        ok: false,
        message: `ABORT slug taken by live article: ${canonicalSlug} (${taken.id})`,
      };
    }
    // Free merged stub slug so winner can take it
    await sql`
      UPDATE article_bai_viet
      SET slug = ${canonicalSlug + "-merged-stub-" + String(taken.id).slice(0, 8)},
          cap_nhat_luc = now()
      WHERE id = ${taken.id}::uuid
    `;
  }

  await sql.begin(async (tx) => {
    if (oldWinnerSlug !== canonicalSlug) {
      await tx`
        UPDATE article_bai_viet
        SET slug = ${canonicalSlug},
            tieu_de_eng = ${canonicalEng},
            cap_nhat_luc = now()
        WHERE id = ${winner.id}::uuid
      `;

      await tx`
        INSERT INTO article_bai_viet (
          slug, tieu_de, tieu_de_eng, tieu_de_viet, loai_bai_viet,
          tom_tat, meta, trang_thai_noi_dung, merged_vao_id, id_linh_vuc,
          luot_xem, meta_title, meta_description
        )
        SELECT
          ${oldWinnerSlug},
          tieu_de, tieu_de_eng, tieu_de_viet, loai_bai_viet,
          tom_tat, COALESCE(meta, '{}'::jsonb),
          'merged', id, id_linh_vuc, 0, meta_title, meta_description
        FROM article_bai_viet
        WHERE id = ${winner.id}::uuid
        ON CONFLICT (slug) DO UPDATE SET
          trang_thai_noi_dung = 'merged',
          merged_vao_id = EXCLUDED.merged_vao_id,
          cap_nhat_luc = now()
      `;
    } else {
      await tx`
        UPDATE article_bai_viet
        SET tieu_de_eng = ${canonicalEng}, cap_nhat_luc = now()
        WHERE id = ${winner.id}::uuid
      `;
    }

    for (let i = 0; i < lvIds.length; i++) {
      const lv = lvIds[i]!;
      await tx`
        INSERT INTO article_gan_linh_vuc (id_bai_viet, id_linh_vuc, la_chinh, thu_tu)
        VALUES (${winner.id}::uuid, ${lv}::uuid, ${lv === winnerLv}, ${i})
        ON CONFLICT (id_bai_viet, id_linh_vuc) DO NOTHING
      `;
    }
    await tx`
      UPDATE article_gan_linh_vuc
      SET la_chinh = (id_linh_vuc = ${winnerLv}::uuid)
      WHERE id_bai_viet = ${winner.id}::uuid
    `;
    await tx`
      UPDATE article_bai_viet
      SET id_linh_vuc = ${winnerLv}::uuid
      WHERE id = ${winner.id}::uuid
    `;

    for (const loser of losers) {
      const loserId = String(loser.id);

      await tx`
        INSERT INTO article_gan_nhom (id_bai_viet, id_nhom)
        SELECT ${winner.id}::uuid, id_nhom
        FROM article_gan_nhom WHERE id_bai_viet = ${loserId}::uuid
        ON CONFLICT DO NOTHING
      `;
      await tx`DELETE FROM article_gan_nhom WHERE id_bai_viet = ${loserId}::uuid`;

      await tx`
        INSERT INTO article_gan_linh_vuc (id_bai_viet, id_linh_vuc, la_chinh, thu_tu)
        SELECT ${winner.id}::uuid, id_linh_vuc, false, thu_tu
        FROM article_gan_linh_vuc WHERE id_bai_viet = ${loserId}::uuid
        ON CONFLICT DO NOTHING
      `;
      await tx`DELETE FROM article_gan_linh_vuc WHERE id_bai_viet = ${loserId}::uuid`;

      await tx`
        UPDATE article_gan_linh_vuc
        SET la_chinh = (id_linh_vuc = ${winnerLv}::uuid)
        WHERE id_bai_viet = ${winner.id}::uuid
      `;

      await tx`
        INSERT INTO article_gan_tac_pham (id_bai_viet, id_tac_pham)
        SELECT ${winner.id}::uuid, id_tac_pham
        FROM article_gan_tac_pham WHERE id_bai_viet = ${loserId}::uuid
        ON CONFLICT DO NOTHING
      `;
      await tx`DELETE FROM article_gan_tac_pham WHERE id_bai_viet = ${loserId}::uuid`;

      await tx`
        INSERT INTO article_gan_cot_moc (id_bai_viet, id_cot_moc)
        SELECT ${winner.id}::uuid, id_cot_moc
        FROM article_gan_cot_moc WHERE id_bai_viet = ${loserId}::uuid
        ON CONFLICT DO NOTHING
      `;
      await tx`DELETE FROM article_gan_cot_moc WHERE id_bai_viet = ${loserId}::uuid`;

      await tx`
        INSERT INTO article_gan_du_an (id_du_an, id_bai_viet)
        SELECT id_du_an, ${winner.id}::uuid
        FROM article_gan_du_an WHERE id_bai_viet = ${loserId}::uuid
        ON CONFLICT DO NOTHING
      `;
      await tx`DELETE FROM article_gan_du_an WHERE id_bai_viet = ${loserId}::uuid`;

      // article_alias (ten_alias unique globally)
      await tx`
        UPDATE article_alias SET id_bai_viet = ${winner.id}::uuid
        WHERE id_bai_viet = ${loserId}::uuid
          AND NOT EXISTS (
            SELECT 1 FROM article_alias w
            WHERE w.ten_alias = article_alias.ten_alias
          )
      `;
      await tx`DELETE FROM article_alias WHERE id_bai_viet = ${loserId}::uuid`;

      // article_tac_gia — partial unique: 1 la_hien_tai per bài
      await tx`
        UPDATE article_tac_gia SET la_hien_tai = false
        WHERE id_bai_viet = ${loserId}::uuid AND la_hien_tai = true
      `;
      await tx`
        UPDATE article_tac_gia t SET id_bai_viet = ${winner.id}::uuid
        WHERE t.id_bai_viet = ${loserId}::uuid
          AND NOT EXISTS (
            SELECT 1 FROM article_tac_gia w
            WHERE w.id_bai_viet = ${winner.id}::uuid
              AND w.id_nguoi_dung IS NOT DISTINCT FROM t.id_nguoi_dung
          )
      `;
      await tx`DELETE FROM article_tac_gia WHERE id_bai_viet = ${loserId}::uuid`;

      // article_dong_gop — unique (id_bai_viet, id_nguoi_dong_gop) WHERE da_xoa=false
      await tx`
        DELETE FROM article_dong_gop d
        WHERE d.id_bai_viet = ${loserId}::uuid
          AND d.da_xoa = false
          AND EXISTS (
            SELECT 1 FROM article_dong_gop w
            WHERE w.id_bai_viet = ${winner.id}::uuid
              AND w.id_nguoi_dong_gop = d.id_nguoi_dong_gop
              AND w.da_xoa = false
          )
      `;
      await tx`
        UPDATE article_dong_gop SET id_bai_viet = ${winner.id}::uuid
        WHERE id_bai_viet = ${loserId}::uuid
      `;

      // article_quyen_tham_dinh — unique (user, bai) WHERE pham_vi=bai_viet
      await tx`
        DELETE FROM article_quyen_tham_dinh q
        WHERE q.id_bai_viet = ${loserId}::uuid
          AND q.da_xoa = false
          AND q.pham_vi = 'bai_viet'
          AND EXISTS (
            SELECT 1 FROM article_quyen_tham_dinh w
            WHERE w.id_bai_viet = ${winner.id}::uuid
              AND w.id_nguoi_dung = q.id_nguoi_dung
              AND w.pham_vi = 'bai_viet'
              AND w.da_xoa = false
          )
      `;
      await tx`
        UPDATE article_quyen_tham_dinh SET id_bai_viet = ${winner.id}::uuid
        WHERE id_bai_viet = ${loserId}::uuid
      `;

      // article_de_xuat
      await tx`
        UPDATE article_de_xuat SET id_bai_viet_da_tao = ${winner.id}::uuid
        WHERE id_bai_viet_da_tao = ${loserId}::uuid
      `;

      // org_bai_dang_tag PK (id_bai_dang, id_bai_viet)
      await tx`
        UPDATE org_bai_dang_tag SET id_bai_viet = ${winner.id}::uuid
        WHERE id_bai_viet = ${loserId}::uuid
          AND NOT EXISTS (
            SELECT 1 FROM org_bai_dang_tag w
            WHERE w.id_bai_viet = ${winner.id}::uuid
              AND w.id_bai_dang = org_bai_dang_tag.id_bai_dang
          )
      `;
      await tx`DELETE FROM org_bai_dang_tag WHERE id_bai_viet = ${loserId}::uuid`;

      // user_linh_vuc PK (id_nguoi_dung, id_bai_viet)
      await tx`
        DELETE FROM user_linh_vuc u
        WHERE u.id_bai_viet = ${loserId}::uuid
          AND EXISTS (
            SELECT 1 FROM user_linh_vuc w
            WHERE w.id_nguoi_dung = u.id_nguoi_dung
              AND w.id_bai_viet = ${winner.id}::uuid
          )
      `;
      await tx`
        UPDATE user_linh_vuc SET id_bai_viet = ${winner.id}::uuid
        WHERE id_bai_viet = ${loserId}::uuid
      `;

      // org_tuyen_dung.id_nghe
      await tx`
        UPDATE org_tuyen_dung SET id_nghe = ${winner.id}::uuid
        WHERE id_nghe = ${loserId}::uuid
      `;

      // lien_quan: drop conflicts then remap
      await tx`
        DELETE FROM article_lien_quan l
        WHERE l.id_bai_viet_a = ${loserId}::uuid
          AND EXISTS (
            SELECT 1 FROM article_lien_quan w
            WHERE w.id_bai_viet_a = ${winner.id}::uuid
              AND w.id_bai_viet_b = l.id_bai_viet_b
              AND w.loai_quan_he = l.loai_quan_he
          )
      `;
      await tx`
        DELETE FROM article_lien_quan l
        WHERE l.id_bai_viet_b = ${loserId}::uuid
          AND EXISTS (
            SELECT 1 FROM article_lien_quan w
            WHERE w.id_bai_viet_b = ${winner.id}::uuid
              AND w.id_bai_viet_a = l.id_bai_viet_a
              AND w.loai_quan_he = l.loai_quan_he
          )
      `;
      await tx`
        DELETE FROM article_lien_quan
        WHERE (id_bai_viet_a = ${loserId}::uuid AND id_bai_viet_b = ${winner.id}::uuid)
           OR (id_bai_viet_b = ${loserId}::uuid AND id_bai_viet_a = ${winner.id}::uuid)
      `;
      await tx`
        UPDATE article_lien_quan SET id_bai_viet_a = ${winner.id}::uuid
        WHERE id_bai_viet_a = ${loserId}::uuid
      `;
      await tx`
        UPDATE article_lien_quan SET id_bai_viet_b = ${winner.id}::uuid
        WHERE id_bai_viet_b = ${loserId}::uuid
      `;
      await tx`
        DELETE FROM article_lien_quan WHERE id_bai_viet_a = id_bai_viet_b
      `;

      const aliasNames = [
        String(loser.slug),
        String(loser.tieu_de_eng || ""),
        oldWinnerSlug !== canonicalSlug ? oldWinnerSlug : "",
      ].filter(Boolean);

      for (const alias of aliasNames) {
        await tx`
          INSERT INTO article_alias (id_bai_viet, ten_alias, nguon)
          VALUES (${winner.id}::uuid, ${alias}, 'ai_merge')
          ON CONFLICT (ten_alias) DO UPDATE
            SET id_bai_viet = EXCLUDED.id_bai_viet
        `;
      }

      await tx`
        UPDATE article_bai_viet SET
          trang_thai_noi_dung = 'merged',
          merged_vao_id = ${winner.id}::uuid,
          cap_nhat_luc = now()
        WHERE id = ${loserId}::uuid
      `;
      console.log(`  ✓ merged ${loser.slug}`);
    }

    // Ensure every LV still mapped after all losers
    await tx`
      UPDATE article_gan_linh_vuc
      SET la_chinh = (id_linh_vuc = ${winnerLv}::uuid)
      WHERE id_bai_viet = ${winner.id}::uuid
    `;
  });

  return {
    ok: true,
    message: `merged ${losers.length} → ${canonicalSlug}`,
  };
}

async function main() {
  console.log(APPLY ? "MODE: APPLY" : "MODE: DRY-RUN (pass --apply to execute)");

  const rows = await sql`
    SELECT id, slug, tieu_de, tieu_de_eng, tieu_de_viet,
      id_linh_vuc,
      trang_thai_noi_dung::text AS status,
      length(COALESCE(noi_dung,''))::int AS body_len
    FROM article_bai_viet
    WHERE loai_bai_viet = 'nghe'
      AND trang_thai_noi_dung::text IN ('published', 'draft', 'review')
      AND tieu_de_eng IS NOT NULL AND trim(tieu_de_eng) <> ''
  `;

  const byCluster = new Map<string, NgheRow[]>();
  for (const r of rows) {
    const clusterKey = normalizeEngKey(String(r.tieu_de_eng));
    const row: NgheRow = {
      id: String(r.id),
      slug: String(r.slug),
      tieu_de: String(r.tieu_de),
      tieu_de_eng: String(r.tieu_de_eng),
      tieu_de_viet: r.tieu_de_viet == null ? null : String(r.tieu_de_viet),
      id_linh_vuc: r.id_linh_vuc == null ? null : String(r.id_linh_vuc),
      status: String(r.status),
      body_len: Number(r.body_len),
      cluster_key: clusterKey,
    };
    const list = byCluster.get(clusterKey) ?? [];
    list.push(row);
    byCluster.set(clusterKey, list);
  }

  const clusters = [...byCluster.entries()]
    .filter(([, members]) => members.length >= 2)
    .sort(([a], [b]) => a.localeCompare(b));

  const filtered = ONLY
    ? clusters.filter(([key]) => {
        const slugKey = roleToSlug(key).replace(/^nghe-/, "");
        return ONLY.has(key) || ONLY.has(slugKey) || ONLY.has(roleToSlug(key));
      })
    : clusters;

  console.log(`Clusters to process: ${filtered.length} / ${clusters.length} total dups`);

  const results: { key: string; ok: boolean; message: string }[] = [];
  for (const [key, members] of filtered) {
    try {
      const r = await mergeCluster(key, members);
      results.push({ key, ...r });
      if (!r.ok) {
        console.error(`  ✗ ${r.message}`);
        break; // stop on abort
      } else {
        console.log(`  → ${r.message}`);
      }
    } catch (e) {
      console.error(`  ✗ exception on ${key}:`, e);
      results.push({ key, ok: false, message: String(e) });
      break;
    }
  }

  // Verify remaining exact dups
  const remaining = await sql`
    WITH base AS (
      SELECT lower(trim(tieu_de_eng)) AS eng_key
      FROM article_bai_viet
      WHERE loai_bai_viet = 'nghe'
        AND trang_thai_noi_dung::text IN ('published', 'draft', 'review')
        AND tieu_de_eng IS NOT NULL AND trim(tieu_de_eng) <> ''
    )
    SELECT eng_key, count(*)::int AS n
    FROM base GROUP BY eng_key HAVING count(*) >= 2
    ORDER BY n DESC, eng_key
  `;

  const mergedCount = await sql`
    SELECT count(*)::int AS n FROM article_bai_viet
    WHERE loai_bai_viet = 'nghe' AND trang_thai_noi_dung::text = 'merged'
  `;
  const publishedCount = await sql`
    SELECT count(*)::int AS n FROM article_bai_viet
    WHERE loai_bai_viet = 'nghe' AND trang_thai_noi_dung::text = 'published'
  `;

  console.log("\n── SUMMARY ──");
  console.log(`ok=${results.filter((r) => r.ok).length} fail=${results.filter((r) => !r.ok).length}`);
  console.log(`published nghe=${publishedCount[0]?.n} merged nghe=${mergedCount[0]?.n}`);
  console.log(`remaining exact eng dups (raw, no alias): ${remaining.length}`);
  for (const r of remaining.slice(0, 20)) console.log(`  ${r.n}× ${r.eng_key}`);

  // Sample verify a few canonicals
  if (APPLY) {
    const samples = [
      "nghe-art-director",
      "nghe-colorist",
      "nghe-compositor",
      "nghe-pipeline-td",
      "nghe-3d-animator",
      "nghe-lighting-artist",
    ];
    const verify = await sql`
      SELECT a.slug, a.trang_thai_noi_dung::text AS status,
        length(COALESCE(a.noi_dung,''))::int AS body_len,
        (
          SELECT string_agg(lv.ten, ' · ' ORDER BY g.la_chinh DESC, g.thu_tu)
          FROM article_gan_linh_vuc g
          JOIN linh_vuc lv ON lv.id = g.id_linh_vuc
          WHERE g.id_bai_viet = a.id
        ) AS linh_vucs,
        (
          SELECT count(*)::int FROM article_bai_viet m
          WHERE m.merged_vao_id = a.id
        ) AS merged_into
      FROM article_bai_viet a
      WHERE a.slug = ANY(${samples})
      ORDER BY a.slug
    `;
    console.log("\n── SAMPLE CANONICALS ──");
    console.table(verify);
  }

  await sql.end({ timeout: 5 });
  if (results.some((r) => !r.ok)) process.exit(1);
}

main().catch(async (e) => {
  console.error(e);
  await sql.end({ timeout: 5 });
  process.exit(1);
});
