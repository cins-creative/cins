/**
 * Gán owner cho tất cả org truong_dai_hoc (one-off / ops).
 * Usage: node scripts/bulk-assign-truong-owner.mjs <email>
 */
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

const email = process.argv[2]?.trim();
if (!email) {
  console.error("Usage: node scripts/bulk-assign-truong-owner.mjs <email>");
  process.exit(1);
}

loadEnvLocal();
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const db = postgres(url, { max: 1 });

try {
  const [user] = await db`
    SELECT u.id, u.slug, u.ten_hien_thi, au.email
    FROM auth.users au
    JOIN user_nguoi_dung u ON u.auth_user_id = au.id
    WHERE lower(au.email) = lower(${email})
    LIMIT 1
  `;

  if (!user) {
    console.error(`Không tìm thấy user_nguoi_dung cho email: ${email}`);
    process.exit(1);
  }

  console.log("Target user:", {
    id: user.id,
    slug: user.slug,
    ten: user.ten_hien_thi,
    email: user.email,
  });

  const orgs = await db`
    SELECT o.id, o.slug, o.ten
    FROM org_to_chuc o
    WHERE o.loai_to_chuc = 'truong_dai_hoc'
      AND (o.trang_thai_hoat_dong IS NULL OR o.trang_thai_hoat_dong <> 'da_dong_cua')
    ORDER BY o.ten
  `;

  console.log(`Trường ĐH cần xử lý: ${orgs.length}`);

  let inserted = 0;
  let updated = 0;
  let transferred = 0;
  const errors = [];

  for (const org of orgs) {
    await db.begin(async (tx) => {
      const [existingForUser] = await tx`
        SELECT id, vai_tro, trang_thai
        FROM user_thanh_vien_to_chuc
        WHERE id_to_chuc = ${org.id}
          AND id_nguoi_dung = ${user.id}
        LIMIT 1
      `;

      const [currentOwner] = await tx`
        SELECT id, id_nguoi_dung, vai_tro
        FROM user_thanh_vien_to_chuc
        WHERE id_to_chuc = ${org.id}
          AND vai_tro = 'owner'
          AND trang_thai IN ('active', 'pending')
        LIMIT 1
      `;

      if (currentOwner?.id_nguoi_dung === user.id) {
        if (existingForUser?.vai_tro !== "owner" || existingForUser?.trang_thai !== "active") {
          await tx`
            UPDATE user_thanh_vien_to_chuc
            SET vai_tro = 'owner', trang_thai = 'active'
            WHERE id = ${existingForUser?.id ?? currentOwner.id}
          `;
          updated += 1;
        }
        return;
      }

      if (currentOwner && currentOwner.id_nguoi_dung !== user.id) {
        await tx`
          UPDATE user_thanh_vien_to_chuc
          SET vai_tro = 'admin'
          WHERE id = ${currentOwner.id}
        `;
        transferred += 1;
      }

      if (existingForUser) {
        await tx`
          UPDATE user_thanh_vien_to_chuc
          SET vai_tro = 'owner', trang_thai = 'active'
          WHERE id = ${existingForUser.id}
        `;
        updated += 1;
        return;
      }

      await tx`
        INSERT INTO user_thanh_vien_to_chuc (id_to_chuc, id_nguoi_dung, vai_tro, trang_thai)
        VALUES (${org.id}, ${user.id}, 'owner', 'active')
      `;
      inserted += 1;
    }).catch((e) => {
      errors.push({ org: org.slug, error: e.message });
    });
  }

  const verify = await db`
    SELECT count(*)::int AS n
    FROM org_to_chuc o
    JOIN user_thanh_vien_to_chuc m ON m.id_to_chuc = o.id
    WHERE o.loai_to_chuc = 'truong_dai_hoc'
      AND (o.trang_thai_hoat_dong IS NULL OR o.trang_thai_hoat_dong <> 'da_dong_cua')
      AND m.id_nguoi_dung = ${user.id}
      AND m.vai_tro = 'owner'
      AND m.trang_thai = 'active'
  `;

  console.log({
    inserted,
    updated,
    transferred,
    ownerRows: verify[0]?.n ?? 0,
    totalOrgs: orgs.length,
    errors,
  });
} finally {
  await db.end();
}
