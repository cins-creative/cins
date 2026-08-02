/**
 * Merge mẫu: 3D Animator → canonical slug nghe-3d-animator
 * Usage: npx tsx scripts/merge-nghe-3d-animator.mts
 */
import postgres from "postgres";

const CANONICAL_SLUG = "nghe-3d-animator";
const SOURCE_SLUGS = ["nghe-3d-3d-animator", "nghe-hoat-hinh-3d-animator"];

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false });

async function main() {
  const rows = await sql`
    SELECT id, slug, tieu_de, tieu_de_eng, tieu_de_viet,
      id_linh_vuc, trang_thai_noi_dung::text AS status,
      length(COALESCE(noi_dung, ''))::int AS body_len
    FROM article_bai_viet
    WHERE loai_bai_viet = 'nghe'
      AND slug = ANY(${SOURCE_SLUGS})
    ORDER BY length(COALESCE(noi_dung, '')) DESC
  `;

  if (rows.length < 2) {
    console.error("Cần 2 bài nguồn, tìm thấy:", rows.length, rows);
    process.exit(1);
  }

  const winner = rows[0]!;
  const losers = rows.slice(1);
  console.log("WINNER:", winner.slug, winner.body_len);
  for (const l of losers) console.log("LOSER:", l.slug, l.body_len);

  const slugTaken = await sql`
    SELECT id, slug FROM article_bai_viet
    WHERE slug = ${CANONICAL_SLUG} AND id <> ${winner.id}::uuid
  `;
  if (slugTaken.length) {
    console.error("Slug canonical đã bị chiếm:", slugTaken[0]);
    process.exit(1);
  }

  const lvIds = [
    ...new Set(
      rows
        .map((r) => (r.id_linh_vuc ? String(r.id_linh_vuc) : ""))
        .filter(Boolean),
    ),
  ];
  const winnerLv = winner.id_linh_vuc ? String(winner.id_linh_vuc) : lvIds[0]!;
  const oldWinnerSlug = String(winner.slug);

  await sql.begin(async (tx) => {
    if (oldWinnerSlug !== CANONICAL_SLUG) {
      await tx`
        UPDATE article_bai_viet
        SET slug = ${CANONICAL_SLUG}, cap_nhat_luc = now()
        WHERE id = ${winner.id}::uuid
      `;
      console.log(`slug: ${oldWinnerSlug} → ${CANONICAL_SLUG}`);

      // Stub slug cũ → 308 (page gate đọc published|merged)
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
        ON CONFLICT (slug) DO NOTHING
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

      // Re-assert la_chinh after union
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

      // lien_quan: xóa cạnh sẽ trùng unique (a,b,loai) khi remap → rồi remap
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
        DELETE FROM article_lien_quan
        WHERE id_bai_viet_a = id_bai_viet_b
      `;

      const aliasNames = [
        String(loser.slug),
        oldWinnerSlug !== CANONICAL_SLUG ? oldWinnerSlug : "",
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
      console.log(`merged ${loser.slug} → ${CANONICAL_SLUG}`);
    }
  });

  const verify = await sql`
    SELECT a.slug, a.trang_thai_noi_dung::text AS status,
      a.merged_vao_id IS NOT NULL AS is_merged,
      length(COALESCE(a.noi_dung,''))::int AS body_len,
      (
        SELECT string_agg(lv.ten, ' · ' ORDER BY g.la_chinh DESC, g.thu_tu)
        FROM article_gan_linh_vuc g
        JOIN linh_vuc lv ON lv.id = g.id_linh_vuc
        WHERE g.id_bai_viet = a.id
      ) AS linh_vucs
    FROM article_bai_viet a
    WHERE a.slug = ANY(${[...SOURCE_SLUGS, CANONICAL_SLUG]})
       OR a.id = ${winner.id}::uuid
       OR a.merged_vao_id = ${winner.id}::uuid
    ORDER BY a.trang_thai_noi_dung, a.slug
  `;
  console.log("\n── VERIFY ──");
  console.table(verify);

  await sql.end({ timeout: 5 });
}

main().catch(async (e) => {
  console.error(e);
  await sql.end({ timeout: 5 });
  process.exit(1);
});
