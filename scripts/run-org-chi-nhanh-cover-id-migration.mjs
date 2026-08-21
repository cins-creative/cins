/**
 * A25: cover_id trên org_chi_nhanh + backfill JSON CSĐT → bảng.
 * Usage: npm run migrate:org-chi-nhanh-cover
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const EXPECTED_PROJECT_REF = "ospzzzxcomrmhqrnkoiw";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(
  __dirname,
  "../supabase/sql/migration_org_chi_nhanh_cover_id.sql",
);

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
    `Refusing migration: target is not CINS ${EXPECTED_PROJECT_REF}.`,
  );
  process.exit(1);
}

function parseChiNhanhList(cauHinh) {
  if (!cauHinh || typeof cauHinh !== "object" || Array.isArray(cauHinh)) {
    return [];
  }
  const list = cauHinh.chi_nhanh;
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const ten = String(item.ten ?? "").trim();
    const dia_chi = String(item.dia_chi ?? "").trim();
    if (!ten || !dia_chi) continue;
    out.push({
      id: String(item.id ?? "").trim(),
      ten,
      dia_chi,
      tinh_thanh: item.tinh_thanh ? String(item.tinh_thanh).trim() : null,
      dien_thoai: item.dien_thoai ? String(item.dien_thoai).trim() : null,
      email: item.email ? String(item.email).trim() : null,
      cover_id: item.cover_id ? String(item.cover_id).trim() : null,
    });
  }
  return out;
}

const sqlText = fs.readFileSync(sqlPath, "utf8");
const db = postgres(rawUrl, {
  max: 1,
  connect_timeout: 20,
  ssl: "require",
  prepare: false,
});

try {
  await db.unsafe(sqlText);

  const orgs = await db`
    SELECT id, cau_hinh, dia_chi, tinh_thanh, dien_thoai, email_lien_he
    FROM org_to_chuc
    WHERE loai_to_chuc = 'co_so_dao_tao'
  `;

  let inserted = 0;
  let covers = 0;

  for (const org of orgs) {
    const fromJson = parseChiNhanhList(org.cau_hinh);
    const existing = await db`
      SELECT id, ten, dia_chi, cover_id
      FROM org_chi_nhanh
      WHERE id_to_chuc = ${org.id}
    `;

    if (existing.length === 0 && fromJson.length > 0) {
      for (const [i, c] of fromJson.entries()) {
        await db`
          INSERT INTO org_chi_nhanh (
            id_to_chuc, ten, dia_chi, tinh_thanh, dien_thoai, email,
            thu_tu, dang_hoat_dong, cover_id
          ) VALUES (
            ${org.id}, ${c.ten}, ${c.dia_chi}, ${c.tinh_thanh},
            ${c.dien_thoai}, ${c.email}, ${i}, true, ${c.cover_id}
          )
        `;
        inserted += 1;
        if (c.cover_id) covers += 1;
      }
      continue;
    }

    if (existing.length === 0 && org.dia_chi?.trim()) {
      await db`
        INSERT INTO org_chi_nhanh (
          id_to_chuc, ten, dia_chi, tinh_thanh, dien_thoai, email,
          thu_tu, dang_hoat_dong
        ) VALUES (
          ${org.id}, ${"Trụ sở"}, ${org.dia_chi.trim()}, ${org.tinh_thanh},
          ${org.dien_thoai}, ${org.email_lien_he}, 0, true
        )
      `;
      inserted += 1;
      continue;
    }

    for (const c of fromJson) {
      const byId =
        c.id && UUID_RE.test(c.id)
          ? existing.find((r) => r.id === c.id)
          : null;
      const byKey = existing.find(
        (r) =>
          String(r.ten ?? "").trim() === c.ten &&
          String(r.dia_chi ?? "").trim() === c.dia_chi,
      );
      const row = byId ?? byKey;
      if (!row) {
        await db`
          INSERT INTO org_chi_nhanh (
            id_to_chuc, ten, dia_chi, tinh_thanh, dien_thoai, email,
            thu_tu, dang_hoat_dong, cover_id
          ) VALUES (
            ${org.id}, ${c.ten}, ${c.dia_chi}, ${c.tinh_thanh},
            ${c.dien_thoai}, ${c.email}, ${existing.length}, true, ${c.cover_id}
          )
        `;
        inserted += 1;
        existing.push({
          id: "new",
          ten: c.ten,
          dia_chi: c.dia_chi,
          cover_id: c.cover_id,
        });
        if (c.cover_id) covers += 1;
        continue;
      }
      if (c.cover_id && !row.cover_id) {
        await db`
          UPDATE org_chi_nhanh
          SET cover_id = ${c.cover_id}
          WHERE id = ${row.id}
        `;
        covers += 1;
        row.cover_id = c.cover_id;
      }
    }
  }

  const [{ with_cover }] = await db`
    SELECT count(*)::int AS with_cover
    FROM org_chi_nhanh
    WHERE cover_id IS NOT NULL AND btrim(cover_id) <> ''
  `;
  const [{ json_csdt }] = await db`
    SELECT count(*)::int AS json_csdt
    FROM org_to_chuc
    WHERE loai_to_chuc = 'co_so_dao_tao'
      AND jsonb_typeof(cau_hinh->'chi_nhanh') = 'array'
      AND jsonb_array_length(cau_hinh->'chi_nhanh') > 0
  `;
  const [{ table_csdt }] = await db`
    SELECT count(DISTINCT id_to_chuc)::int AS table_csdt
    FROM org_chi_nhanh cn
    JOIN org_to_chuc o ON o.id = cn.id_to_chuc
    WHERE o.loai_to_chuc = 'co_so_dao_tao'
  `;

  console.log("OK: org_chi_nhanh.cover_id (A25)");
  console.log(`Backfill insert: ${inserted} · cover gắn: ${covers}`);
  console.log(`CSĐT có JSON chi_nhanh: ${json_csdt} · CSĐT có dòng bảng: ${table_csdt}`);
  console.log(`Tổng hàng có cover_id: ${with_cover}`);
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exitCode = 1;
} finally {
  await db.end({ timeout: 5 });
}
