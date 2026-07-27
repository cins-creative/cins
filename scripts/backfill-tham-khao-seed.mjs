/**
 * Backfill nhãn «Tham khảo» cho mọi cột mốc của nick seeding.
 * Chạy: node scripts/backfill-tham-khao-seed.mjs
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

const NICKS = [
  "kiritominh",
  "hinatavy",
  "yukitrang",
  "levikhoa",
  "itachihung",
  "sakuralinh",
  "zorobao",
  "remnhi",
  "nezukochi",
  "mikungoc",
];

const FILTER = {
  slug: "tham-khao",
  ten: "Tham khảo",
  mau: "#7C6F64",
  thu_tu: -5,
};

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ensureFilter(userId) {
  const { data: existing } = await admin
    .from("filter_nhan")
    .select("id")
    .eq("id_nguoi_dung", userId)
    .eq("slug", FILTER.slug)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: inserted, error } = await admin
    .from("filter_nhan")
    .insert({
      id_nguoi_dung: userId,
      id_to_chuc: null,
      ten: FILTER.ten,
      slug: FILTER.slug,
      mau: FILTER.mau,
      thu_tu: FILTER.thu_tu,
    })
    .select("id")
    .single();
  if (error || !inserted) {
    const { data: again } = await admin
      .from("filter_nhan")
      .select("id")
      .eq("id_nguoi_dung", userId)
      .eq("slug", FILTER.slug)
      .maybeSingle();
    if (again?.id) return again.id;
    throw new Error(error?.message || "insert filter_nhan failed");
  }
  return inserted.id;
}

let tongMoc = 0;
let tongGan = 0;
let tongBoQua = 0;

for (const slug of NICKS) {
  const { data: profile } = await admin
    .from("user_nguoi_dung")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!profile) {
    console.log(`skip @${slug} — không có hồ sơ`);
    continue;
  }

  const filterId = await ensureFilter(profile.id);
  console.log(`@${slug} filter=${filterId.slice(0, 8)}…`);

  const { data: mocs, error } = await admin
    .from("content_cot_moc")
    .select("id")
    .eq("id_nguoi_dung", profile.id);
  if (error) {
    console.error(`  moc error: ${error.message}`);
    continue;
  }

  for (const moc of mocs || []) {
    tongMoc += 1;
    const { data: gan } = await admin
      .from("filter_gan")
      .select("id_filter")
      .eq("loai_doi_tuong", "cot_moc")
      .eq("id_doi_tuong", moc.id)
      .eq("id_filter", filterId)
      .maybeSingle();
    if (gan) {
      tongBoQua += 1;
      continue;
    }
    const { error: insErr } = await admin.from("filter_gan").insert({
      id_filter: filterId,
      loai_doi_tuong: "cot_moc",
      id_doi_tuong: moc.id,
    });
    if (insErr) {
      console.log(`  FAIL moc ${moc.id.slice(0, 8)}: ${insErr.message}`);
    } else {
      tongGan += 1;
    }
  }
}

console.log(`Xong: moc=${tongMoc} gan_moi=${tongGan} da_co=${tongBoQua}`);
