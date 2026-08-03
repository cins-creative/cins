/**
 * Backfill junction từ meta khóa (`chiNhanhIds` trong noi_dung_blocks).
 * Chạy SAU migrate:lop-chi-nhanh.
 * Usage: node scripts/backfill-lop-chi-nhanh.mjs
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const META_PREFIX = "<!--cins-khoa-meta-->";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function normalizeIds(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const id = item.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function parseChiNhanhIds(blocks) {
  if (!Array.isArray(blocks)) return [];
  for (const block of blocks) {
    if (block?.loai !== "body") continue;
    const html = block?.config?.html;
    if (typeof html !== "string" || !html.startsWith(META_PREFIX)) continue;
    try {
      const parsed = JSON.parse(html.slice(META_PREFIX.length));
      return normalizeIds(parsed?.chiNhanhIds);
    } catch {
      /* ignore */
    }
  }
  return [];
}

const { data: khoaRows, error: khoaErr } = await admin
  .from("org_khoa_hoc")
  .select("id, noi_dung_blocks");
if (khoaErr) {
  console.error(khoaErr.message);
  process.exit(1);
}

let inserted = 0;
let skipped = 0;

for (const khoa of khoaRows ?? []) {
  const ids = parseChiNhanhIds(khoa.noi_dung_blocks);
  if (!ids.length) {
    skipped += 1;
    continue;
  }

  const { data: lopRows } = await admin
    .from("org_lop_hoc")
    .select("id, hinh_thuc, id_chi_nhanh")
    .eq("id_khoa_hoc", khoa.id)
    .in("hinh_thuc", ["truc_tiep", "ket_hop"]);

  for (const lop of lopRows ?? []) {
    const rows = ids.map((idChiNhanh, i) => ({
      id_lop_hoc: lop.id,
      id_chi_nhanh: idChiNhanh,
      thu_tu: i,
    }));
    const { error } = await admin
      .from("org_lop_hoc_chi_nhanh")
      .upsert(rows, { onConflict: "id_lop_hoc,id_chi_nhanh", ignoreDuplicates: true });
    if (error) {
      console.warn(`lop ${lop.id}:`, error.message);
      continue;
    }
    inserted += rows.length;

    if (!lop.id_chi_nhanh && ids[0]) {
      await admin
        .from("org_lop_hoc")
        .update({ id_chi_nhanh: ids[0] })
        .eq("id", lop.id);
    }
  }
}

console.log(`OK: upserted ~${inserted} junction rows; ${skipped} khóa không có chiNhanhIds meta`);
