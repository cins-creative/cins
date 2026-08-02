/**
 * Batch merge nghề gần nghĩa (3D-prefix, texture/surfacing, motion/FX, …).
 *
 * Usage:
 *   npx tsx scripts/batch-merge-nghe-near-roles.mts
 *   npx tsx scripts/batch-merge-nghe-near-roles.mts --apply
 *   npx tsx scripts/batch-merge-nghe-near-roles.mts --apply --only=art-director,fx-artist
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

type ClusterDef = {
  key: string;
  canonicalSlug: string;
  canonicalEng: string;
  /** Prefer this slug as winner if still published (else longest body). */
  preferSlug?: string;
  memberSlugs: string[];
};

/** List đã chốt với user — Head of Story / Storyboard / specialty Producer… không có ở đây. */
const CLUSTERS: ClusterDef[] = [
  // A — 3D-prefix / fashion → bare
  {
    key: "art-director",
    canonicalSlug: "nghe-art-director",
    canonicalEng: "Art Director",
    preferSlug: "nghe-art-director",
    memberSlugs: [
      "nghe-art-director",
      "nghe-3d-3d-art-director",
      "nghe-thoitrang-fashion-art-director",
    ],
  },
  {
    key: "concept-artist",
    canonicalSlug: "nghe-concept-artist",
    canonicalEng: "Concept Artist",
    preferSlug: "nghe-concept-artist",
    memberSlugs: ["nghe-concept-artist", "nghe-3d-3d-concept-artist"],
  },
  {
    key: "lighting-artist",
    canonicalSlug: "nghe-lighting-artist",
    canonicalEng: "Lighting Artist",
    preferSlug: "nghe-lighting-artist",
    memberSlugs: ["nghe-lighting-artist", "nghe-3d-lighting-artist"],
  },
  {
    key: "rigging-artist",
    canonicalSlug: "nghe-rigging-artist",
    canonicalEng: "Rigging Artist",
    preferSlug: "nghe-rigging-artist",
    memberSlugs: ["nghe-rigging-artist", "nghe-3d-rigging-artist"],
  },
  {
    key: "render-td",
    canonicalSlug: "nghe-render-td",
    canonicalEng: "Render TD",
    preferSlug: "nghe-render-td",
    memberSlugs: ["nghe-render-td", "nghe-3d-render-td"],
  },
  {
    key: "project-manager",
    canonicalSlug: "nghe-project-manager",
    canonicalEng: "Project Manager",
    preferSlug: "nghe-project-manager",
    memberSlugs: ["nghe-project-manager", "nghe-3d-3d-project-manager"],
  },
  {
    key: "character-modeler",
    canonicalSlug: "nghe-character-modeler",
    canonicalEng: "Character Modeler",
    memberSlugs: [
      "nghe-hoat-hinh-character-modeler",
      "nghe-3d-character-modeler",
    ],
  },
  {
    key: "architectural-visualizer",
    canonicalSlug: "nghe-architectural-visualizer",
    canonicalEng: "Architectural Visualizer",
    memberSlugs: [
      "nghe-3d-architectural-visualizer",
      "nghe-kien-truc-architectural-visualizer",
      "nghe-kien-truc-3d-visualizer",
    ],
  },
  {
    key: "environment-artist",
    canonicalSlug: "nghe-environment-artist",
    canonicalEng: "Environment Artist",
    memberSlugs: [
      "nghe-hoat-hinh-environment-artist",
      "nghe-game-environment-artist",
    ],
  },

  // B — texture / surfacing / shader
  {
    key: "texture-surfacing-artist",
    canonicalSlug: "nghe-texture-surfacing-artist",
    canonicalEng: "Texture / Surfacing Artist",
    preferSlug: "nghe-hoat-hinh-texture-surfacing-artist",
    memberSlugs: [
      "nghe-hoat-hinh-texture-surfacing-artist",
      "nghe-game-texture-artist",
      "nghe-3d-texture-artist",
      "nghe-3d-surfacing-artist",
    ],
  },
  {
    key: "shader-artist",
    canonicalSlug: "nghe-shader-artist",
    canonicalEng: "Shader Artist",
    memberSlugs: ["nghe-game-shader-artist", "nghe-3d-shader-artist"],
  },

  // C — motion / FX / lead comp
  {
    key: "motion-designer",
    canonicalSlug: "nghe-motion-designer",
    canonicalEng: "Motion Designer",
    preferSlug: "nghe-vfx-motion-designer",
    memberSlugs: [
      "nghe-vfx-motion-designer",
      "nghe-vfx-motion-graphics-artist",
      "nghe-vfx-3d-motion-artist",
    ],
  },
  {
    key: "fx-artist",
    canonicalSlug: "nghe-fx-artist",
    canonicalEng: "FX Artist",
    preferSlug: "nghe-fx-artist",
    memberSlugs: ["nghe-fx-artist", "nghe-vfx-fx-simulation-artist"],
  },
  {
    key: "compositor",
    canonicalSlug: "nghe-compositor",
    canonicalEng: "Compositor",
    preferSlug: "nghe-compositor",
    memberSlugs: ["nghe-compositor", "nghe-vfx-lead-compositor"],
  },

  // UI + Illustrator thin
  {
    key: "ui-designer",
    canonicalSlug: "nghe-ui-designer",
    canonicalEng: "UI Designer",
    preferSlug: "nghe-uiux-ui-designer",
    memberSlugs: [
      "nghe-uiux-ui-designer",
      "nghe-game-ui-artist",
      "nghe-game-uiux-designer",
    ],
  },
  {
    key: "illustrator",
    canonicalSlug: "nghe-illustrator",
    canonicalEng: "Illustrator",
    preferSlug: "nghe-minh-hoa-illustrator",
    memberSlugs: [
      "nghe-minh-hoa-illustrator",
      "nghe-minh-hoa-advertising-illustrator",
      "nghe-minh-hoa-3d-illustrator",
      "nghe-minh-hoa-digital-illustrator",
    ],
  },
];

type NgheRow = {
  id: string;
  slug: string;
  tieu_de: string;
  tieu_de_eng: string;
  tieu_de_viet: string | null;
  id_linh_vuc: string | null;
  status: string;
  body_len: number;
};

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false });

async function mergeCluster(
  def: ClusterDef,
  members: NgheRow[],
  lvByArticle: Map<string, string[]>,
): Promise<{ ok: boolean; message: string }> {
  const active = members.filter((m) =>
    ["published", "draft", "review"].includes(m.status),
  );
  if (active.length < 2) {
    return {
      ok: true,
      message: `skip (≤1 active / ${active.length} found): ${def.key}`,
    };
  }

  const preferred = def.preferSlug
    ? active.find((m) => m.slug === def.preferSlug)
    : undefined;
  const sorted = [...active].sort((a, b) => {
    if (b.body_len !== a.body_len) return b.body_len - a.body_len;
    return a.slug.localeCompare(b.slug);
  });
  const winner = preferred ?? sorted[0]!;
  const losers = active.filter((m) => m.id !== winner.id);
  const { canonicalSlug, canonicalEng } = def;

  const lvIds = [
    ...new Set(
      active.flatMap((r) => {
        const fromGan = lvByArticle.get(r.id) ?? [];
        const fromCol = r.id_linh_vuc ? [String(r.id_linh_vuc)] : [];
        return [...fromGan, ...fromCol];
      }),
    ),
  ];
  // Prefer dual-write cột id_linh_vuc (đang là la_chinh) — tránh 2 la_chinh=true
  const winnerLv = winner.id_linh_vuc
    ? String(winner.id_linh_vuc)
    : lvIds[0]!;
  const oldWinnerSlug = winner.slug;

  console.log(`\n══ ${def.key} → ${canonicalSlug}`);
  console.log(
    `  WIN ${winner.body_len} ${winner.slug}${preferred ? " (prefer)" : ""}`,
  );
  for (const l of losers) console.log(`  LOS ${l.body_len} ${l.slug}`);
  console.log(`  LV  ${lvIds.length} | eng=${canonicalEng}`);

  if (!APPLY) {
    return {
      ok: true,
      message: `dry-run: would merge ${losers.length} → ${canonicalSlug}`,
    };
  }

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

    // Unique partial: tối đa 1 la_chinh=true / bài — clear trước, insert false, rồi set chính
    await tx`
      UPDATE article_gan_linh_vuc
      SET la_chinh = false
      WHERE id_bai_viet = ${winner.id}::uuid AND la_chinh = true
    `;
    for (let i = 0; i < lvIds.length; i++) {
      const lv = lvIds[i]!;
      await tx`
        INSERT INTO article_gan_linh_vuc (id_bai_viet, id_linh_vuc, la_chinh, thu_tu)
        VALUES (${winner.id}::uuid, ${lv}::uuid, false, ${i})
        ON CONFLICT (id_bai_viet, id_linh_vuc) DO NOTHING
      `;
    }
    await tx`
      UPDATE article_gan_linh_vuc
      SET la_chinh = true
      WHERE id_bai_viet = ${winner.id}::uuid
        AND id_linh_vuc = ${winnerLv}::uuid
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

      await tx`
        UPDATE article_alias SET id_bai_viet = ${winner.id}::uuid
        WHERE id_bai_viet = ${loserId}::uuid
          AND NOT EXISTS (
            SELECT 1 FROM article_alias w
            WHERE w.ten_alias = article_alias.ten_alias
          )
      `;
      await tx`DELETE FROM article_alias WHERE id_bai_viet = ${loserId}::uuid`;

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

      await tx`
        UPDATE article_de_xuat SET id_bai_viet_da_tao = ${winner.id}::uuid
        WHERE id_bai_viet_da_tao = ${loserId}::uuid
      `;

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

      await tx`
        UPDATE org_tuyen_dung SET id_nghe = ${winner.id}::uuid
        WHERE id_nghe = ${loserId}::uuid
      `;

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

    await tx`
      UPDATE article_gan_linh_vuc
      SET la_chinh = false
      WHERE id_bai_viet = ${winner.id}::uuid AND la_chinh = true
    `;
    await tx`
      UPDATE article_gan_linh_vuc
      SET la_chinh = true
      WHERE id_bai_viet = ${winner.id}::uuid
        AND id_linh_vuc = ${winnerLv}::uuid
    `;
  });

  return { ok: true, message: `merged ${losers.length} → ${canonicalSlug}` };
}

async function main() {
  console.log(APPLY ? "MODE: APPLY" : "MODE: DRY-RUN (pass --apply to execute)");

  const filtered = ONLY
    ? CLUSTERS.filter(
        (c) =>
          ONLY.has(c.key) ||
          ONLY.has(c.canonicalSlug) ||
          ONLY.has(c.canonicalSlug.replace(/^nghe-/, "")),
      )
    : CLUSTERS;

  const allSlugs = [...new Set(filtered.flatMap((c) => c.memberSlugs))];
  const rows = await sql`
    SELECT id, slug, tieu_de, tieu_de_eng, tieu_de_viet,
      id_linh_vuc,
      trang_thai_noi_dung::text AS status,
      length(COALESCE(noi_dung,''))::int AS body_len
    FROM article_bai_viet
    WHERE loai_bai_viet = 'nghe' AND slug = ANY(${allSlugs})
  `;
  const bySlug = new Map(rows.map((r) => [String(r.slug), r as unknown as NgheRow]));

  const ids = rows.map((r) => String(r.id));
  const ganRows = ids.length
    ? await sql`
        SELECT id_bai_viet::text AS id, id_linh_vuc::text AS lv
        FROM article_gan_linh_vuc
        WHERE id_bai_viet = ANY(${ids}::uuid[])
      `
    : [];
  const lvByArticle = new Map<string, string[]>();
  for (const g of ganRows) {
    const list = lvByArticle.get(String(g.id)) ?? [];
    list.push(String(g.lv));
    lvByArticle.set(String(g.id), list);
  }

  console.log(`Clusters: ${filtered.length}`);

  const results: { key: string; ok: boolean; message: string }[] = [];
  for (const def of filtered) {
    const members = def.memberSlugs
      .map((s) => bySlug.get(s))
      .filter((m): m is NgheRow => !!m)
      .map((m) => ({
        ...m,
        id: String(m.id),
        slug: String(m.slug),
        tieu_de: String(m.tieu_de),
        tieu_de_eng: String(m.tieu_de_eng),
        tieu_de_viet: m.tieu_de_viet == null ? null : String(m.tieu_de_viet),
        id_linh_vuc: m.id_linh_vuc == null ? null : String(m.id_linh_vuc),
        status: String(m.status),
        body_len: Number(m.body_len),
      }));

    const missing = def.memberSlugs.filter((s) => !bySlug.has(s));
    if (missing.length) {
      console.log(`\n⚠ ${def.key} missing slugs: ${missing.join(", ")}`);
    }

    try {
      const r = await mergeCluster(def, members, lvByArticle);
      results.push({ key: def.key, ...r });
      console.log(`  → ${r.message}`);
      if (!r.ok) break;
    } catch (e) {
      console.error(`  ✗ exception on ${def.key}:`, e);
      results.push({ key: def.key, ok: false, message: String(e) });
      break;
    }
  }

  const counts = await sql`
    SELECT trang_thai_noi_dung::text AS status, count(*)::int AS n
    FROM article_bai_viet WHERE loai_bai_viet='nghe'
    GROUP BY 1 ORDER BY 1
  `;
  console.log("\n── SUMMARY ──");
  console.log(
    `ok=${results.filter((r) => r.ok).length} fail=${results.filter((r) => !r.ok).length}`,
  );
  console.table(counts);

  if (APPLY) {
    const samples = filtered.map((c) => c.canonicalSlug);
    const verify = await sql`
      SELECT a.slug, a.tieu_de_eng, a.trang_thai_noi_dung::text AS status,
        length(COALESCE(a.noi_dung,''))::int AS body_len,
        (
          SELECT string_agg(lv.ten, ' · ' ORDER BY g.la_chinh DESC, g.thu_tu)
          FROM article_gan_linh_vuc g
          JOIN linh_vuc lv ON lv.id = g.id_linh_vuc
          WHERE g.id_bai_viet = a.id
        ) AS linh_vucs,
        (
          SELECT count(*)::int FROM article_bai_viet m WHERE m.merged_vao_id = a.id
        ) AS merged_into
      FROM article_bai_viet a
      WHERE a.slug = ANY(${samples})
      ORDER BY a.slug
    `;
    console.log("\n── CANONICALS ──");
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
