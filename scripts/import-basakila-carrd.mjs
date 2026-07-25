/**
 * Import ảnh từ trang Carrd (basakilagallery.carrd.co) → Cloudflare Images
 * → tạo mỗi ảnh 1 bài đăng Journey (content_cot_moc + content_tac_pham)
 * cho user `basakila`. Không caption (mo_ta = null, cap = "").
 *
 * Usage:
 *   node scripts/import-basakila-carrd.mjs           # dry-run
 *   node scripts/import-basakila-carrd.mjs --confirm # chạy thật
 */
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const USER_SLUG = "basakila";
const CARRD_BASE = "https://basakilagallery.carrd.co/";
const VISIBILITY = "chi_minh"; // riêng tư
const LOAI_MOC = "ca_nhan";
const POST_TITLE = "Bài viết";

/* Full-res gallery images lấy từ HTML tĩnh của trang Carrd (mọi tab:
   FULL RENDER / INKING / COLLAB), giữ nguyên thứ tự xuất hiện. */
const IMAGE_PATHS = [
  "assets/images/gallery01/3dd0c919_original.jpg",
  "assets/images/gallery01/5e98ba09_original.jpg",
  "assets/images/gallery01/9791dd6d_original.jpg",
  "assets/images/gallery02/38ac6968_original.jpg",
  "assets/images/gallery03/0b6e1413_original.jpg",
  "assets/images/gallery03/4e29e6bf_original.jpg",
  "assets/images/gallery03/70c2182d_original.jpg",
  "assets/images/gallery03/89859683_original.jpg",
  "assets/images/gallery03/b37263cb_original.jpg",
  "assets/images/gallery03/c2ceb2d6_original.jpg",
  "assets/images/gallery03/c36b63f6_original.jpg",
  "assets/images/gallery03/db229555_original.jpg",
  "assets/images/gallery03/ef00f6c5_original.jpg",
  "assets/images/gallery03/ef3b60cf_original.jpg",
  "assets/images/gallery03/f8e19c78_original.jpg",
  "assets/images/gallery04/5e1e269f_original.jpg",
  "assets/images/gallery05/3bb0b65b_original.jpg",
  "assets/images/gallery05/867449e1_original.jpg",
  "assets/images/gallery05/c2c438d1_original.jpg",
  "assets/images/gallery06/56c28ca0_original.jpg",
  "assets/images/gallery07/224db4bd_original.jpg",
  "assets/images/gallery07/6ab98bfa_original.jpg",
  "assets/images/gallery07/81d80805_original.jpg",
  "assets/images/gallery07/b8b74938_original.jpg",
];

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
}

function slugifyPostTitle(value) {
  const MAX_BASE_LEN = 72;
  const cleaned = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_BASE_LEN);
  return cleaned || "bai-viet";
}

async function uniquePostSlugForUser(db, userId, baseSlug) {
  const MAX_TOTAL_LEN = 80;
  let candidate = baseSlug.slice(0, MAX_TOTAL_LEN);
  let n = 2;
  while (n < 1000) {
    const [row] = await db`
      SELECT id FROM content_tac_pham
      WHERE id_nguoi_dung = ${userId} AND slug = ${candidate}
    `;
    if (!row) return candidate;
    const suffix = `-${n}`;
    candidate = baseSlug.slice(0, MAX_TOTAL_LEN - suffix.length) + suffix;
    n += 1;
  }
  return `${baseSlug.slice(0, 60)}-${Date.now().toString(36)}`;
}

async function downloadImage(url) {
  const res = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      Accept: "image/*,*/*;q=0.8",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    },
  });
  if (!res.ok) {
    throw new Error(`Download failed HTTP ${res.status}: ${url}`);
  }
  const mime = (res.headers.get("content-type") || "").split(";")[0]?.trim();
  const buf = Buffer.from(await res.arrayBuffer());
  return { buf, mime: mime || "image/jpeg" };
}

async function uploadToCloudflareImages(buf, mime, filename) {
  const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const cfToken = process.env.CLOUDFLARE_IMAGES_API_TOKEN?.trim();
  if (!cfAccount || !cfToken) {
    throw new Error("Thiếu CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_IMAGES_API_TOKEN.");
  }
  const form = new FormData();
  form.append("file", new Blob([buf], { type: mime }), filename);

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${cfAccount}/images/v1`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${cfToken}` },
      body: form,
    },
  );
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(
      `Cloudflare upload failed: ${JSON.stringify(json?.errors ?? res.statusText)}`,
    );
  }
  const imageId = json.result?.id?.trim();
  if (!imageId) throw new Error("Cloudflare không trả về image id.");
  return imageId;
}

function todayIso() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function cfDeliveryUrl(imageId) {
  const hash =
    process.env.NEXT_PUBLIC_CF_IMAGES_ACCOUNT_HASH?.trim() ||
    process.env.CLOUDFLARE_IMAGES_HASH?.trim() ||
    "uJ2XS8GFEXi_dIXASK1Fkw";
  return `https://imagedelivery.net/${hash}/${imageId}/public`;
}

function buildImgsBlock(imageId) {
  return {
    id: `b-${imageId.slice(0, 8)}`,
    loai: "imgs",
    thu_tu: 0,
    config: {
      layout: "inset",
      rounded: true,
      gap: 2,
      cap: "",
      imgs: [imageId],
    },
  };
}

function buildNoiDungHtml(imageId) {
  const src = cfDeliveryUrl(imageId);
  return `<div class="article-rich-content"><figure class="rich-imgs rich-imgs--inset is-rounded" style="--cins-img-slot-gap:2px"><div class="rich-img-cell"><img loading="lazy" src="${src}" alt=""></div></figure></div>`;
}

loadEnv();

const confirm = process.argv.includes("--confirm");

const db = postgres(process.env.DATABASE_URL, { max: 1 });

const [user] = await db`
  SELECT id, slug, ten_hien_thi FROM user_nguoi_dung WHERE slug = ${USER_SLUG}
`;
if (!user) {
  console.error("Không tìm thấy user:", USER_SLUG);
  await db.end();
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      user,
      totalImages: IMAGE_PATHS.length,
      visibility: VISIBILITY,
      loaiMoc: LOAI_MOC,
      confirm,
    },
    null,
    2,
  ),
);

if (!confirm) {
  console.log("\n[DRY-RUN] Thêm --confirm để chạy thật (upload + insert DB).");
  await db.end();
  process.exit(0);
}

const results = [];

for (let i = 0; i < IMAGE_PATHS.length; i++) {
  const relPath = IMAGE_PATHS[i];
  const url = `${CARRD_BASE}${relPath}`;
  const label = `[${i + 1}/${IMAGE_PATHS.length}] ${relPath}`;
  try {
    console.log(`${label} — downloading…`);
    const { buf, mime } = await downloadImage(url);

    console.log(`${label} — uploading to Cloudflare Images…`);
    const filename = relPath.split("/").pop() || `image-${i}.jpg`;
    const imageId = await uploadToCloudflareImages(buf, mime, filename);

    const baseSlug = slugifyPostTitle(POST_TITLE);
    const slug = await uniquePostSlugForUser(db, user.id, baseSlug);
    const thoiDiem = todayIso();
    const block = buildImgsBlock(imageId);
    const noiDungHtml = buildNoiDungHtml(imageId);

    console.log(`${label} — inserting DB rows…`);
    const [cotMoc, tacPham] = await db.begin(async (tx) => {
      const [cotMocRow] = await tx`
        INSERT INTO content_cot_moc
          (id_nguoi_dung, loai_moc, nguon_goc, tieu_de, mo_ta, thoi_diem, che_do_hien_thi)
        VALUES
          (${user.id}, ${LOAI_MOC}, 'tu_tao', ${POST_TITLE}, ${null}, ${thoiDiem}, ${VISIBILITY})
        RETURNING id
      `;
      const [tacPhamRow] = await tx`
        INSERT INTO content_tac_pham
          (id_nguoi_dung, loai_tac_pham, tieu_de, mo_ta, cover_id, che_do_hien_thi, slug, noi_dung_blocks, noi_dung_html, meta_title, meta_description)
        VALUES
          (${user.id}, 'bai_viet', ${POST_TITLE}, ${null}, ${imageId}, ${VISIBILITY}, ${slug}, ${db.json([block])}, ${noiDungHtml}, ${POST_TITLE}, ${null})
        RETURNING id
      `;
      await tx`
        INSERT INTO content_tac_pham_thuoc_moc (id_tac_pham, id_cot_moc, thu_tu)
        VALUES (${tacPhamRow.id}, ${cotMocRow.id}, 0)
      `;
      return [cotMocRow, tacPhamRow];
    });

    console.log(`${label} — OK (cotMoc=${cotMoc.id}, tacPham=${tacPham.id}, slug=${slug})`);
    results.push({ path: relPath, ok: true, imageId, slug, cotMocId: cotMoc.id, tacPhamId: tacPham.id });
  } catch (err) {
    console.error(`${label} — FAILED:`, err instanceof Error ? err.message : err);
    results.push({ path: relPath, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}

const okCount = results.filter((r) => r.ok).length;
const failCount = results.length - okCount;

console.log(
  "\n=== SUMMARY ===\n" +
    JSON.stringify({ total: results.length, ok: okCount, failed: failCount, results }, null, 2),
);

await db.end();
process.exit(failCount > 0 ? 1 : 0);
