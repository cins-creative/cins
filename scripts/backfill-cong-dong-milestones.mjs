import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    const val = t.slice(i + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const cinsSystemId = process.env.CINS_SYSTEM_USER_ID?.trim();
if (!cinsSystemId) {
  console.error("Missing CINS_SYSTEM_USER_ID");
  process.exit(1);
}

const db = postgres(process.env.DATABASE_URL, { max: 1 });

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

try {
  const orgs = await db`
    SELECT o.id, o.ten, o.slug, o.mo_ta, m.id_nguoi_dung AS creator_id
    FROM org_to_chuc o
    JOIN user_thanh_vien_to_chuc m ON m.id_to_chuc = o.id
    WHERE o.loai_to_chuc = 'cong_dong'
      AND m.vai_tro = 'admin'
      AND m.id_nguoi_dung <> ${cinsSystemId}::uuid
  `;

  console.log(`Found ${orgs.length} community creator(s) to backfill`);

  for (const org of orgs) {
    const existing = await db`
      SELECT id FROM content_cot_moc
      WHERE id_nguoi_dung = ${org.creator_id}
        AND id_to_chuc = ${org.id}
        AND nguon_goc = 'sinh_tu_org_assign'
      LIMIT 1
    `;
    if (existing.length > 0) {
      const cotId = existing[0].id;
      const verify = await db`
        SELECT id FROM verify_xac_nhan WHERE id_cot_moc = ${cotId} LIMIT 1
      `;
      if (verify.length === 0) {
        await db`
          INSERT INTO verify_xac_nhan (
            id_cot_moc, loai_nguoi_xac_nhan, id_nguoi_xac_nhan,
            trang_thai, url_proof, xu_ly_luc
          ) VALUES (
            ${cotId}, 'to_chuc', NULL, 'da_xac_nhan',
            ${`/cong-dong/${org.slug}`}, now()
          )
        `;
        console.log("Verify added:", org.slug, cotId);
      } else {
        console.log("Skip (exists):", org.slug, cotId);
      }
      continue;
    }

    const tieuDe = `Tạo cộng đồng ${org.ten}`;
    const moTa =
      org.mo_ta?.trim() ||
      `Người tạo cộng đồng · ${org.ten} trên CINs.`;

    const [cotMoc] = await db`
      INSERT INTO content_cot_moc (
        id_nguoi_dung, loai_moc, nguon_goc, tieu_de, mo_ta,
        thoi_diem, che_do_hien_thi, id_to_chuc
      ) VALUES (
        ${org.creator_id},
        'thanh_tuu',
        'sinh_tu_org_assign',
        ${tieuDe},
        ${moTa},
        ${todayIsoDate()},
        'public',
        ${org.id}
      )
      RETURNING id
    `;

    await db`
      INSERT INTO verify_xac_nhan (
        id_cot_moc, loai_nguoi_xac_nhan, id_nguoi_xac_nhan,
        trang_thai, url_proof, xu_ly_luc
      ) VALUES (
        ${cotMoc.id},
        'to_chuc',
        NULL,
        'da_xac_nhan',
        ${`/cong-dong/${org.slug}`},
        now()
      )
    `;

    console.log("Created milestone:", org.slug, cotMoc.id, "for", org.creator_id);
  }
} finally {
  await db.end();
}
