/**
 * Backfill org_phi_ky + shop_phi_ky (chua_tra/qua_han/da_tra) → cins_hoa_don.
 * Chạy SAU migrate:cins-hoa-don + backfill:cins-tk-thanh-toan.
 * Usage: npm run backfill:cins-hoa-don
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const salt = process.env.CSDT_PHI_MA_SALT?.trim() || "cins-billing";
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function maThamChieu(seed, ngayChot, attempt = 0) {
  const yymm = String(ngayChot).replace(/-/g, "").slice(2, 6);
  const hex = createHash("sha256")
    .update(`${salt}:${seed}:${ngayChot}:${attempt}`)
    .digest("hex")
    .slice(0, 6)
    .toUpperCase();
  return `CINS${hex}${yymm}`;
}

function endOfMonth(ymd) {
  const [y, m] = ymd.split("-").map(Number);
  const d = new Date(Date.UTC(y, m, 0, 12));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

async function ensureDv(loai, thamChieuId, ownerId) {
  const { data: existing } = await admin
    .from("cins_dich_vu")
    .select("id, id_tk")
    .eq("loai", loai)
    .eq("tham_chieu_id", thamChieuId)
    .maybeSingle();
  if (existing) return existing;

  let tkId;
  const { data: tk } = await admin
    .from("cins_tk_thanh_toan")
    .select("id")
    .eq("id_nguoi_dung", ownerId)
    .maybeSingle();
  if (tk?.id) tkId = tk.id;
  else {
    const now = new Date().toISOString();
    const { data: created, error } = await admin
      .from("cins_tk_thanh_toan")
      .insert({
        id_nguoi_dung: ownerId,
        han_muc_vnd: 0,
        trang_thai: "hoat_dong",
        no_da_xoa_vnd: 0,
        tao_luc: now,
        cap_nhat_luc: now,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    tkId = created.id;
  }

  const now = new Date().toISOString();
  const { data: dv, error } = await admin
    .from("cins_dich_vu")
    .insert({
      id_tk: tkId,
      loai,
      tham_chieu_id: thamChieuId,
      trang_thai: "hoat_dong",
      tao_luc: now,
      cap_nhat_luc: now,
    })
    .select("id, id_tk")
    .single();
  if (error) {
    if (error.code === "23505") {
      const { data: again } = await admin
        .from("cins_dich_vu")
        .select("id, id_tk")
        .eq("loai", loai)
        .eq("tham_chieu_id", thamChieuId)
        .maybeSingle();
      return again;
    }
    throw new Error(error.message);
  }
  return dv;
}

async function upsertHd(payload) {
  const { data: ex } = await admin
    .from("cins_hoa_don")
    .select("id")
    .eq("nguon_bang", payload.nguon_bang)
    .eq("nguon_id", payload.nguon_id)
    .maybeSingle();
  if (ex?.id) {
    await admin
      .from("cins_hoa_don")
      .update({
        so_tien_vnd: payload.so_tien_vnd,
        dieu_chinh_vnd: payload.dieu_chinh_vnd,
        da_tra_vnd: payload.da_tra_vnd,
        trang_thai: payload.trang_thai,
        han_tra: payload.han_tra,
        cap_nhat_luc: new Date().toISOString(),
      })
      .eq("id", ex.id);
    return "updated";
  }
  for (let attempt = 0; attempt < 8; attempt++) {
    const ma = maThamChieu(payload.seed, payload.ngay_chot, attempt);
    const { error } = await admin.from("cins_hoa_don").insert({
      ...payload,
      ma_tham_chieu: payload.ma_tham_chieu || ma,
      thong_bao_luc: payload.thong_bao_luc || new Date().toISOString(),
      tao_luc: new Date().toISOString(),
      cap_nhat_luc: new Date().toISOString(),
    });
    if (!error) return "created";
    if (error.code === "23505") continue;
    throw new Error(error.message);
  }
  throw new Error("ma_tham_chieu collision");
}

async function resolveOrgOwner(orgId) {
  const { data: owners } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id_nguoi_dung")
    .eq("id_to_chuc", orgId)
    .eq("vai_tro", "owner")
    .order("tu_ngay", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true })
    .limit(1);
  if (owners?.[0]?.id_nguoi_dung) return owners[0].id_nguoi_dung;
  const { data: org } = await admin
    .from("org_to_chuc")
    .select("nguoi_tao")
    .eq("id", orgId)
    .maybeSingle();
  return org?.nguoi_tao ?? null;
}

async function main() {
  let orgN = 0;
  let shopN = 0;
  let errN = 0;

  const { data: kys } = await admin
    .from("org_phi_ky")
    .select(
      "id, id_to_chuc, tu_ngay, den_ngay, ngay_chot, han_tra, phi_phai_tra_vnd, dieu_chinh_vnd, da_tra_vnd, trang_thai, ma_tham_chieu",
    );
  for (const ky of kys ?? []) {
    try {
      const ownerId = await resolveOrgOwner(ky.id_to_chuc);
      if (!ownerId) {
        errN += 1;
        continue;
      }
      const dv = await ensureDv("csdt_phi", ky.id_to_chuc, ownerId);
      const so =
        Math.max(0, Number(ky.phi_phai_tra_vnd) || 0);
      await upsertHd({
        id_tk: dv.id_tk,
        id_dich_vu: dv.id,
        tu_ngay: ky.tu_ngay,
        den_ngay: ky.den_ngay,
        ngay_chot: ky.ngay_chot,
        han_tra: ky.han_tra,
        so_tien_vnd: so,
        dieu_chinh_vnd: Number(ky.dieu_chinh_vnd) || 0,
        da_tra_vnd: Number(ky.da_tra_vnd) || 0,
        trang_thai: ky.trang_thai,
        ma_tham_chieu: ky.ma_tham_chieu,
        nguon_bang: "org_phi_ky",
        nguon_id: ky.id,
        seed: ky.id_to_chuc,
      });
      orgN += 1;
    } catch (e) {
      errN += 1;
      console.error("org", ky.id, e.message);
    }
  }

  const { data: shopKys } = await admin
    .from("shop_phi_ky")
    .select(
      "id, id_nguoi_ban, ky, phi_phai_tra, trang_thai, han_tra",
    )
    .in("trang_thai", ["chua_tra", "qua_han", "da_tra", "mien"]);
  for (const ky of shopKys ?? []) {
    try {
      const dv = await ensureDv("shop_phi", ky.id_nguoi_ban, ky.id_nguoi_ban);
      const kyYmd = String(ky.ky).slice(0, 10);
      const den = endOfMonth(kyYmd);
      const so = Math.max(0, Math.round(Number(ky.phi_phai_tra) || 0));
      const tt =
        ky.trang_thai === "chua_chot" ? "chua_tra" : ky.trang_thai;
      await upsertHd({
        id_tk: dv.id_tk,
        id_dich_vu: dv.id,
        tu_ngay: kyYmd,
        den_ngay: den,
        ngay_chot: den,
        han_tra: ky.han_tra || den,
        so_tien_vnd: so,
        dieu_chinh_vnd: 0,
        da_tra_vnd: tt === "da_tra" ? so : 0,
        trang_thai: tt,
        nguon_bang: "shop_phi_ky",
        nguon_id: ky.id,
        seed: `shop:${ky.id_nguoi_ban}`,
      });
      shopN += 1;
    } catch (e) {
      errN += 1;
      console.error("shop", ky.id, e.message);
    }
  }

  const { count } = await admin
    .from("cins_hoa_don")
    .select("id", { count: "exact", head: true });
  console.log(JSON.stringify({ orgN, shopN, errN, totalHd: count }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
