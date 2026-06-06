import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
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

function slugify(name) {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "cong-dong-demo"
  );
}

loadEnvLocal();

const CINS_ID = process.env.CINS_SYSTEM_USER_ID;
const CREATOR_SLUG = process.env.CONG_DONG_CREATOR_SLUG || "taikhoanphanmem95";
const TEN = process.env.CONG_DONG_TEN || "Motion Designer Việt Nam";
const SLUG = process.env.CONG_DONG_SLUG || slugify(TEN);

if (!CINS_ID) {
  console.error("Missing CINS_SYSTEM_USER_ID");
  process.exit(1);
}

const db = postgres(process.env.DATABASE_URL, { max: 1 });

try {
  const [creator] = await db`
    SELECT id FROM user_nguoi_dung WHERE slug = ${CREATOR_SLUG} LIMIT 1
  `;
  if (!creator) {
    console.error("Creator not found:", CREATOR_SLUG);
    process.exit(1);
  }

  const [existing] = await db`
    SELECT id, slug FROM org_to_chuc WHERE slug = ${SLUG} AND loai_to_chuc = 'cong_dong' LIMIT 1
  `;
  if (existing) {
    console.log("Community already exists:", existing.slug, existing.id);
    process.exit(0);
  }

  const [org] = await db`
    INSERT INTO org_to_chuc (
      ten, slug, loai_to_chuc, mo_ta, trang_thai_tin_cay, cau_hinh
    ) VALUES (
      ${TEN},
      ${SLUG},
      'cong_dong',
      ${"Cộng đồng chia sẻ kinh nghiệm motion design — demo seed."},
      'binh_thuong',
      ${db.json({ che_do: "cong_khai" })}
    )
    RETURNING id, slug
  `;

  await db`
    INSERT INTO user_thanh_vien_to_chuc (id_to_chuc, id_nguoi_dung, vai_tro)
    VALUES (${org.id}, ${CINS_ID}, 'owner')
  `;
  await db`
    INSERT INTO user_thanh_vien_to_chuc (id_to_chuc, id_nguoi_dung, vai_tro)
    VALUES (${org.id}, ${creator.id}, 'admin')
  `;

  console.log("Created community:", org.slug, "→ /cong-dong/" + org.slug);
} finally {
  await db.end();
}
