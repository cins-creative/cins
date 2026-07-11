/**
 * Seed demo bản đóng góp cho keyword GDD (game-design-document).
 * Usage: node scripts/seed-gdd-dong-gop-demo.mjs
 *
 * Tạo 2–3 bản mẫu; bản đầu promote làm nội dung chính (nếu --promote).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENTITY_SLUG = process.env.GDD_ENTITY_SLUG?.trim() || "game-design-document";
const promoteFirst = !process.argv.includes("--no-promote");

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Missing DATABASE_URL in .env.local");
  process.exit(1);
}

const db = postgres(url, { max: 1 });

const SAMPLE_DRAFTS = [
  {
    slug: "taikhoanphanmem95",
    trangThai: "duoc_duyet",
    html: `<h2>Khái niệm</h2><p>GDD (Game Design Document) là tài liệu mô tả ý tưởng, luật chơi, nghệ thuật và phạm vi dự án game — dùng để team thống nhất trước khi sản xuất.</p><h2>Thành phần</h2><ul><li>Tổng quan &amp; đối tượng người chơi</li><li>Core loop &amp; progression</li><li>Mechanics chi tiết</li><li>Art/audio direction</li></ul><h2>Ví dụ</h2><p>Một GDD indie thường 10–20 trang; AAA có thể hàng trăm trang kèm prototype link.</p>`,
  },
  {
    slug: null,
    trangThai: "cho_duyet",
    html: `<h2>Khái niệm</h2><p>GDD giúp producer, dev và artist cùng nhìn một bức tranh — tránh scope creep khi dự án lớn dần.</p><h2>Thành phần</h2><p>Pitch một trang · World &amp; narrative · Systems · Level design · Production timeline.</p>`,
  },
  {
    slug: null,
    trangThai: "tu_choi",
    ghiChu: "Cần bổ sung ví dụ cụ thể từ dự án thật và nguồn tham khảo.",
    html: `<h2>Khái niệm</h2><p>GDD là bản thiết kế game.</p>`,
  },
];

async function main() {
  const [article] = await db`
    SELECT id, slug, tieu_de, noi_dung
    FROM article_bai_viet
    WHERE slug = ${ENTITY_SLUG}
    LIMIT 1
  `;
  if (!article?.id) {
    console.error(`Entity not found: ${ENTITY_SLUG}`);
    process.exit(1);
  }

  const users = await db`
    SELECT id, slug
    FROM user_nguoi_dung
    WHERE slug IS NOT NULL
    LIMIT 10
  `;

  if (users.length < 2) {
    console.error("Need at least 2 users in user_nguoi_dung");
    process.exit(1);
  }

  function pickUser(preferredSlug) {
    if (preferredSlug) {
      const hit = users.find((u) => u.slug === preferredSlug);
      if (hit) return hit;
    }
    return users[Math.floor(Math.random() * users.length)];
  }

  const inserted = [];

  for (let i = 0; i < SAMPLE_DRAFTS.length; i++) {
    const sample = SAMPLE_DRAFTS[i];
    const user = pickUser(sample.slug);
    const existing = await db`
      SELECT id FROM article_dong_gop
      WHERE id_bai_viet = ${article.id}
        AND id_nguoi_dong_gop = ${user.id}
        AND da_xoa = false
      LIMIT 1
    `;
    if (existing.length > 0) {
      console.log(`Skip existing draft for @${user.slug}`);
      inserted.push({ id: existing[0].id, trangThai: sample.trangThai, user });
      continue;
    }

    const [row] = await db`
      INSERT INTO article_dong_gop (
        id_bai_viet,
        id_nguoi_dong_gop,
        noi_dung,
        trang_thai,
        ghi_chu_duyet,
        hien_thi
      ) VALUES (
        ${article.id},
        ${user.id},
        ${sample.html},
        ${sample.trangThai},
        ${sample.ghiChu ?? null},
        true
      )
      RETURNING id
    `;
    inserted.push({ id: row.id, trangThai: sample.trangThai, user });
    console.log(`Created ${sample.trangThai} draft ${row.id} by @${user.slug}`);
  }

  if (promoteFirst && inserted.length > 0) {
    const target =
      inserted.find((r) => r.trangThai === "duoc_duyet") ?? inserted[0];
    const html =
      SAMPLE_DRAFTS.find((_, i) => inserted[i]?.id === target.id)?.html ??
      SAMPLE_DRAFTS[0].html;

    await db`
      UPDATE article_tac_gia
      SET la_hien_tai = false
      WHERE id_bai_viet = ${article.id} AND la_hien_tai = true
    `;

    await db`
      UPDATE article_dong_gop
      SET trang_thai = 'duoc_duyet'
      WHERE id_bai_viet = ${article.id}
        AND trang_thai = 'duoc_duyet'
        AND id <> ${target.id}
    `;

    await db`
      UPDATE article_dong_gop
      SET trang_thai = 'duoc_duyet', duyet_luc = now(), cap_nhat_luc = now()
      WHERE id = ${target.id}
    `;

    await db`
      INSERT INTO article_tac_gia (
        id_bai_viet, id_nguoi_dung, id_dong_gop, vai_tro, la_hien_tai
      ) VALUES (
        ${article.id},
        ${target.user.id},
        ${target.id},
        'tac_gia_chinh',
        true
      )
    `;

    const [{ cnt }] = await db`
      SELECT count(DISTINCT id_nguoi_dong_gop)::int AS cnt
      FROM article_dong_gop
      WHERE id_bai_viet = ${article.id}
        AND trang_thai = 'duoc_duyet'
        AND da_xoa = false
    `;

    await db`
      UPDATE article_bai_viet
      SET
        noi_dung = ${html},
        id_tac_gia_chinh = ${target.user.id},
        so_nguoi_dong_gop = ${cnt},
        cap_nhat_luc = now()
      WHERE id = ${article.id}
    `;

    console.log(`Promoted draft ${target.id} → canonical for ${ENTITY_SLUG}`);
  }

  console.log("OK: GDD dong gop demo seeded");
}

try {
  await main();
} catch (err) {
  console.error("Seed failed:", err?.message ?? err);
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
