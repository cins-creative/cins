/**
 * Gắn lại rail kiosk (`shop_post_hang`) cho bài «Giới thiệu sản phẩm»
 * đã ghi trong `shop_nhom_gioi_thieu` nhưng chưa có hàng bán.
 *
 * Usage:
 *   node scripts/backfill-gioi-thieu-kiosk.mjs
 *   node scripts/backfill-gioi-thieu-kiosk.mjs --dry-run
 *   node scripts/backfill-gioi-thieu-kiosk.mjs --cot-moc <uuid>
 *   node scripts/backfill-gioi-thieu-kiosk.mjs --nhom <uuid>
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const SHOP_POST_HANG_MAX = 20;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const cotIdx = args.indexOf("--cot-moc");
const nhomIdx = args.indexOf("--nhom");
const onlyMoc =
  cotIdx >= 0 && args[cotIdx + 1] ? args[cotIdx + 1].trim() : null;
const onlyNhom =
  nhomIdx >= 0 && args[nhomIdx + 1] ? args[nhomIdx + 1].trim() : null;

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  process.env.SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function shopGiaHieuLuc(dong) {
  const gia = Number(dong.gia);
  const giam =
    dong.gia_giam == null || dong.gia_giam === ""
      ? null
      : Number(dong.gia_giam);
  if (giam != null && Number.isFinite(giam) && giam >= 0 && giam < gia) {
    return giam;
  }
  return gia;
}

/**
 * Chọn biến thể gắn kiosk — cùng luật client `chonBienTheChoKiosk`.
 */
function pickHangItems({ mau, bangGia, giaMacDinh }) {
  const dongByBt = new Map(bangGia.dong.map((d) => [d.id_bien_the, d]));
  const eligible = [];
  for (const p of mau) {
    if (p.dang_ban === false) continue;
    for (const bt of p.bien_the) {
      const ton = Math.max(0, Number(bt.so_luong_ton) || 0);
      if (ton <= 0) continue;
      const dong = dongByBt.get(bt.id);
      let gia = null;
      if (dong) gia = shopGiaHieuLuc(dong);
      else if (giaMacDinh != null && Number.isFinite(giaMacDinh) && giaMacDinh >= 0) {
        gia = giaMacDinh;
      }
      if (gia == null || !Number.isFinite(gia) || gia < 0) continue;
      eligible.push({
        idBienThe: bt.id,
        idBangGia: bangGia.id,
        thuTu: eligible.length,
        gia,
        tienTe: bangGia.tien_te || "VND",
      });
    }
  }
  const picked = eligible.slice(0, SHOP_POST_HANG_MAX);
  return {
    items: picked,
    biCat: Math.max(0, eligible.length - picked.length),
  };
}

async function hasPayment(ownerId) {
  const { data: shop } = await admin
    .from("shop_cua_hang")
    .select("id")
    .eq("id_nguoi_dung", ownerId)
    .eq("da_xoa", false)
    .maybeSingle();
  if (!shop?.id) return false;
  const { count } = await admin
    .from("shop_phuong_thuc_tt")
    .select("id", { count: "exact", head: true })
    .eq("id_cua_hang", shop.id)
    .eq("kich_hoat", true);
  return (count ?? 0) > 0;
}

async function banHangEnabled(ownerId) {
  const { data } = await admin
    .from("user_nguoi_dung")
    .select("ban_hang_bat")
    .eq("id", ownerId)
    .maybeSingle();
  return data?.ban_hang_bat === true;
}

async function main() {
  console.log(
    dryRun
      ? "[dry-run] Quét bài giới thiệu thiếu kiosk…"
      : "Gắn lại kiosk cho bài giới thiệu thiếu hang…",
  );

  let q = admin
    .from("shop_nhom_gioi_thieu")
    .select(
      "id_nhom, id_cot_moc, shop_nhom!inner(id, id_nguoi_dung, nhan, gia_mac_dinh, da_xoa)",
    )
    .not("id_cot_moc", "is", null)
    .eq("shop_nhom.da_xoa", false)
    .limit(500);
  if (onlyMoc) q = q.eq("id_cot_moc", onlyMoc);
  if (onlyNhom) q = q.eq("id_nhom", onlyNhom);

  const { data: gtRows, error: gtErr } = await q;
  if (gtErr) {
    console.error("list shop_nhom_gioi_thieu", gtErr);
    process.exit(1);
  }

  let attached = 0;
  let skipped = 0;

  for (const raw of gtRows ?? []) {
    const nhom = Array.isArray(raw.shop_nhom) ? raw.shop_nhom[0] : raw.shop_nhom;
    const cotMocId = raw.id_cot_moc?.trim();
    const idNhom = raw.id_nhom?.trim();
    if (!cotMocId || !idNhom || !nhom) {
      skipped += 1;
      continue;
    }
    const ownerId = nhom.id_nguoi_dung;
    const label = nhom.nhan ? `「${nhom.nhan}」` : idNhom;

    const { count: hangCount } = await admin
      .from("shop_post_hang")
      .select("id", { count: "exact", head: true })
      .eq("id_cot_moc", cotMocId);
    if ((hangCount ?? 0) > 0) {
      skipped += 1;
      console.log(`  skipped_has_hang   ${label} moc=${cotMocId} hang=${hangCount}`);
      continue;
    }

    const { data: moc } = await admin
      .from("content_cot_moc")
      .select("id, id_nguoi_dung")
      .eq("id", cotMocId)
      .maybeSingle();
    if (!moc || moc.id_nguoi_dung !== ownerId) {
      skipped += 1;
      console.log(`  skipped_no_moc     ${label} moc=${cotMocId}`);
      continue;
    }

    if (!(await banHangEnabled(ownerId))) {
      skipped += 1;
      console.log(`  skipped_ban_hang   ${label} moc=${cotMocId}`);
      continue;
    }
    if (!(await hasPayment(ownerId))) {
      skipped += 1;
      console.log(`  skipped_no_payment ${label} moc=${cotMocId}`);
      continue;
    }

    const { data: sps } = await admin
      .from("shop_san_pham")
      .select("id, dang_ban")
      .eq("id_nguoi_dung", ownerId)
      .eq("id_nhom", idNhom)
      .eq("da_xoa", false)
      .limit(200);
    const spRows = sps ?? [];
    if (spRows.length === 0) {
      skipped += 1;
      console.log(`  skipped_no_items   ${label} moc=${cotMocId} err=no_mau`);
      continue;
    }

    const spIds = spRows.map((r) => r.id);
    const { data: bts } = await admin
      .from("shop_bien_the")
      .select("id, id_san_pham, so_luong_ton")
      .in("id_san_pham", spIds)
      .eq("da_xoa", false);

    const btBySp = new Map();
    for (const bt of bts ?? []) {
      const list = btBySp.get(bt.id_san_pham) ?? [];
      list.push(bt);
      btBySp.set(bt.id_san_pham, list);
    }
    const mau = spRows.map((sp) => ({
      dang_ban: sp.dang_ban,
      bien_the: btBySp.get(sp.id) ?? [],
    }));

    const { data: bg } = await admin
      .from("shop_bang_gia")
      .select("id, tien_te")
      .eq("id_nguoi_dung", ownerId)
      .eq("da_xoa", false)
      .order("tao_luc", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!bg) {
      skipped += 1;
      console.log(`  skipped_no_items   ${label} moc=${cotMocId} err=no_bang_gia`);
      continue;
    }

    const { data: dongs } = await admin
      .from("shop_bang_gia_dong")
      .select("id_bien_the, gia, gia_giam")
      .eq("id_bang_gia", bg.id);

    const giaMac =
      nhom.gia_mac_dinh == null ? null : Number(nhom.gia_mac_dinh);
    const { items, biCat } = pickHangItems({
      mau,
      bangGia: { id: bg.id, tien_te: bg.tien_te, dong: dongs ?? [] },
      giaMacDinh: giaMac,
    });

    if (items.length === 0) {
      skipped += 1;
      console.log(
        `  skipped_no_items   ${label} moc=${cotMocId} err=no_eligible`,
      );
      continue;
    }

    if (dryRun) {
      attached += 1;
      console.log(
        `  would_attach       ${label} moc=${cotMocId} hang=${items.length}${biCat ? ` biCat=${biCat}` : ""}`,
      );
      continue;
    }

    await admin.from("shop_post_hang").delete().eq("id_cot_moc", cotMocId);
    const inserts = items.map((it, i) => ({
      id_cot_moc: cotMocId,
      id_bien_the: it.idBienThe,
      id_bang_gia: it.idBangGia,
      gia_hien_thi: it.gia,
      tien_te: it.tienTe,
      thu_tu: it.thuTu ?? i,
    }));
    const { error: insErr } = await admin.from("shop_post_hang").insert(inserts);
    if (insErr) {
      skipped += 1;
      console.log(
        `  skipped_error      ${label} moc=${cotMocId} err=${insErr.message}`,
      );
      continue;
    }
    attached += 1;
    console.log(
      `  attached           ${label} moc=${cotMocId} hang=${items.length}${biCat ? ` biCat=${biCat}` : ""}`,
    );
  }

  console.log(
    `done scanned=${(gtRows ?? []).length} attached=${attached} skipped=${skipped}`,
  );
  if (dryRun) {
    console.log("Chạy lại không --dry-run để ghi shop_post_hang.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
