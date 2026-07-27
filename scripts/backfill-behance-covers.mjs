/**
 * Backfill anh_bia_url cho auto_muc Behance đang null (og:image).
 * Chạy: node scripts/backfill-behance-covers.mjs
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function metaContent(html, prop) {
  const re1 = new RegExp(
    `property=["']${prop}["'][^>]*content=["']([^"']+)`,
    "i",
  );
  const re2 = new RegExp(
    `content=["']([^"']+)["'][^>]*property=["']${prop}["']`,
    "i",
  );
  return html.match(re1)?.[1] || html.match(re2)?.[1] || null;
}

async function layCover(galleryUrl) {
  const id = String(galleryUrl).match(/\/gallery\/(\d+)/)?.[1];
  if (!id) return null;
  const candidates = [
    galleryUrl.split("?")[0],
    `https://www.behance.net/gallery/${id}/p`,
  ];
  for (const u of candidates) {
    try {
      const res = await fetch(u, {
        headers: { "User-Agent": UA, Accept: "text/html" },
        redirect: "follow",
      });
      if (!res.ok) continue;
      const html = await res.text();
      const og = metaContent(html, "og:image");
      if (og && /^https:\/\//i.test(og)) return og;
    } catch {
      /* next */
    }
  }
  return null;
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: rows, error } = await admin
  .from("auto_muc")
  .select("id, url_canonic, tieu_de_goc")
  .eq("nen_tang", "behance")
  .is("anh_bia_url", null)
  .limit(100);

if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log(`Cần backfill: ${rows?.length ?? 0}`);
let ok = 0;
let fail = 0;
for (const row of rows || []) {
  const cover = await layCover(row.url_canonic);
  if (!cover) {
    fail += 1;
    console.log("FAIL", row.url_canonic);
    continue;
  }
  const patch = { anh_bia_url: cover };
  const title = String(row.tieu_de_goc || "");
  if (/^Behance\s+\d+$/i.test(title)) {
    /* thử lấy og:title cùng lúc — fetch lại tốn; skip, cover quan trọng hơn */
  }
  const { error: upErr } = await admin
    .from("auto_muc")
    .update(patch)
    .eq("id", row.id);
  if (upErr) {
    fail += 1;
    console.log("UPERR", row.id, upErr.message);
  } else {
    ok += 1;
    console.log("OK", row.id.slice(0, 8), cover.slice(0, 70));
  }
}
console.log(`Xong: ok=${ok} fail=${fail}`);
