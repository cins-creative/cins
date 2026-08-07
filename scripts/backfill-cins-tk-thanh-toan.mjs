/**
 * Backfill cins_tk_thanh_toan + cins_dich_vu từ org_phi_* / shop_phi_*.
 * Chạy SAU npm run migrate:cins-tk-thanh-toan.
 *
 * Usage:
 *   npm run backfill:cins-tk-thanh-toan -- --dry-run
 *   npm run backfill:cins-tk-thanh-toan
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const dryRun = process.argv.includes("--dry-run");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function resolveOwner(orgId) {
  const { data: owners } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id, id_nguoi_dung, tu_ngay")
    .eq("id_to_chuc", orgId)
    .eq("vai_tro", "owner")
    .eq("trang_thai", "active")
    .order("tu_ngay", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true });

  const list = owners ?? [];
  if (list.length > 0) {
    return {
      ownerId: list[0].id_nguoi_dung,
      ownerIds: list.map((o) => o.id_nguoi_dung),
    };
  }

  const { data: anyOwners } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id, id_nguoi_dung, tu_ngay")
    .eq("id_to_chuc", orgId)
    .eq("vai_tro", "owner")
    .order("tu_ngay", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true });
  const list2 = anyOwners ?? [];
  if (list2.length > 0) {
    return {
      ownerId: list2[0].id_nguoi_dung,
      ownerIds: list2.map((o) => o.id_nguoi_dung),
    };
  }

  const { data: org } = await admin
    .from("org_to_chuc")
    .select("nguoi_tao")
    .eq("id", orgId)
    .maybeSingle();
  if (org?.nguoi_tao) {
    return { ownerId: org.nguoi_tao, ownerIds: [org.nguoi_tao] };
  }
  return { ownerId: null, ownerIds: [] };
}

async function getOrCreateTk(userId) {
  const { data: existing } = await admin
    .from("cins_tk_thanh_toan")
    .select("id")
    .eq("id_nguoi_dung", userId)
    .maybeSingle();
  if (existing?.id) return { id: existing.id, created: false };

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("cins_tk_thanh_toan")
    .insert({
      id_nguoi_dung: userId,
      han_muc_vnd: 0,
      trang_thai: "hoat_dong",
      no_da_xoa_vnd: 0,
      tao_luc: now,
      cap_nhat_luc: now,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      const { data: again } = await admin
        .from("cins_tk_thanh_toan")
        .select("id")
        .eq("id_nguoi_dung", userId)
        .maybeSingle();
      if (again?.id) return { id: again.id, created: false };
    }
    throw new Error(error.message);
  }
  return { id: data.id, created: true };
}

async function ensureDichVu(idTk, loai, thamChieuId, defaults) {
  const { data: existing } = await admin
    .from("cins_dich_vu")
    .select("id")
    .eq("loai", loai)
    .eq("tham_chieu_id", thamChieuId)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("cins_dich_vu")
    .insert({
      id_tk: idTk,
      loai,
      tham_chieu_id: thamChieuId,
      ty_le: defaults.tyLe,
      nguong_chot_vnd: defaults.nguongChotVnd,
      toi_thieu_xuat_ky_vnd: null,
      so_ngay_han_tra: defaults.soNgayHanTra,
      da_dung_chay_thu: false,
      trang_thai: "hoat_dong",
      tao_luc: now,
      cap_nhat_luc: now,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return null;
    throw new Error(error.message);
  }
  return data.id;
}

async function loadCsdtDefaults() {
  const { data } = await admin
    .from("cins_cau_hinh_tai_chinh")
    .select("csdt_ty_le, csdt_nguong_kich_hoat_vnd, csdt_so_ngay_han_tra")
    .order("cap_nhat_luc", { ascending: false })
    .limit(1)
    .maybeSingle();
  return {
    tyLe: data?.csdt_ty_le != null ? Number(data.csdt_ty_le) : 0.1,
    nguongChotVnd:
      data?.csdt_nguong_kich_hoat_vnd != null
        ? Number(data.csdt_nguong_kich_hoat_vnd)
        : 2_000_000,
    soNgayHanTra: data?.csdt_so_ngay_han_tra ?? 7,
  };
}

async function loadShopTyLe() {
  const { data } = await admin
    .from("shop_cau_hinh_phi")
    .select("ty_le")
    .order("cap_nhat_luc", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data?.ty_le != null) return Number(data.ty_le);
  return 0.05;
}

async function main() {
  console.log(
    dryRun
      ? "DRY-RUN backfill cins_tk_thanh_toan …"
      : "Backfill cins_tk_thanh_toan …",
  );

  const csdtDefaults = await loadCsdtDefaults();
  const shopTyLe = await loadShopTyLe();

  const orgIds = new Set();
  const { data: kyOrgs } = await admin.from("org_phi_ky").select("id_to_chuc");
  for (const r of kyOrgs ?? []) if (r.id_to_chuc) orgIds.add(r.id_to_chuc);
  const { data: dongOrgs } = await admin
    .from("org_phi_dong")
    .select("id_to_chuc");
  for (const r of dongOrgs ?? []) if (r.id_to_chuc) orgIds.add(r.id_to_chuc);

  const multiOwnerOrgs = [];
  const errors = [];
  let orgLinked = 0;
  let orgSkippedNoOwner = 0;
  let shopLinked = 0;
  let tkCreated = 0;

  for (const orgId of orgIds) {
    try {
      const { ownerId, ownerIds } = await resolveOwner(orgId);
      if (!ownerId) {
        orgSkippedNoOwner += 1;
        errors.push(`Org ${orgId}: không có owner / nguoi_tao`);
        continue;
      }
      if (ownerIds.length > 1) {
        const { data: org } = await admin
          .from("org_to_chuc")
          .select("ten")
          .eq("id", orgId)
          .maybeSingle();
        multiOwnerOrgs.push({
          orgId,
          ten: org?.ten ?? null,
          ownerIds,
          chosenOwnerId: ownerId,
        });
      }
      if (!dryRun) {
        const tk = await getOrCreateTk(ownerId);
        if (tk.created) tkCreated += 1;
        await ensureDichVu(tk.id, "csdt_phi", orgId, csdtDefaults);
      }
      orgLinked += 1;
    } catch (e) {
      errors.push(`Org ${orgId}: ${e?.message ?? e}`);
    }
  }

  const sellerIds = new Set();
  const { data: shopKys } = await admin
    .from("shop_phi_ky")
    .select("id_nguoi_ban");
  for (const r of shopKys ?? []) if (r.id_nguoi_ban) sellerIds.add(r.id_nguoi_ban);
  const { data: shops } = await admin
    .from("shop_cua_hang")
    .select("id_nguoi_dung");
  for (const r of shops ?? []) if (r.id_nguoi_dung) sellerIds.add(r.id_nguoi_dung);

  for (const sellerId of sellerIds) {
    try {
      if (!dryRun) {
        const tk = await getOrCreateTk(sellerId);
        if (tk.created) tkCreated += 1;
        await ensureDichVu(tk.id, "shop_phi", sellerId, {
          tyLe: shopTyLe,
          nguongChotVnd: null,
          soNgayHanTra: 15,
        });
      }
      shopLinked += 1;
    } catch (e) {
      errors.push(`Seller ${sellerId}: ${e?.message ?? e}`);
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        orgLinked,
        orgSkippedNoOwner,
        shopLinked,
        tkCreated,
        multiOwnerCount: multiOwnerOrgs.length,
        multiOwnerOrgs,
        errorCount: errors.length,
        errors: errors.slice(0, 20),
      },
      null,
      2,
    ),
  );
  if (multiOwnerOrgs.length > 0) {
    console.log(
      `\n⚠ ${multiOwnerOrgs.length} org có >1 owner — đã chọn owner sớm nhất. Rà tay nếu cần.`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
