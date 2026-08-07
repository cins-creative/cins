/**
 * Seed billing ĐẦY ĐỦ: đơn shop (từ kho + nick buyer) + đơn học phí CSĐT (nick HV)
 * → phí nền tảng qua đúng bảng nguồn → dual-write cins_hoa_don.
 *
 * Usage:
 *   node scripts/seed-billing-no-demo.mjs --slug=nguyenthanhtu
 *   node scripts/seed-billing-no-demo.mjs --slug=nguyenthanhtu --gmv=2000000 --dt=20000000
 *   node scripts/seed-billing-no-demo.mjs --slug=nguyenthanhtu --clean
 *   node scripts/seed-billing-no-demo.mjs --slug=nguyenthanhtu --clean-only
 *
 * CSĐT: ngưỡng kích hoạt = SUM(phi_vnd) ≥ csdt_nguong (mặc định 2tr phí
 * ≈ 20tr doanh thu @ 10%). --dt mặc định 20_000_000.
 */
import { createHash } from "node:crypto";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

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

const SEED_TAG = "[seed-billing-no]";

function arg(name, fallback = null) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function ymdVn(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function addDaysYmd(ymd, days) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function kyThangTruocYmd(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const y = Number(parts.find((p) => p.type === "year").value);
  const m = Number(parts.find((p) => p.type === "month").value);
  const prev = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };
  return `${prev.y}-${String(prev.m).padStart(2, "0")}-01`;
}

function endOfMonthYmd(ymd) {
  const [y, m] = ymd.split("-").map(Number);
  const d = new Date(Date.UTC(y, m, 0, 12));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** ISO timestamp mid-month of previous VN month (for shop hoan_thanh_luc). */
function midPrevMonthIso() {
  const ky = kyThangTruocYmd();
  return `${ky.slice(0, 8)}15T10:00:00.000+07:00`;
}

function maThamChieu(seed, ngayChot, attempt = 0) {
  const yymm = String(ngayChot).replace(/-/g, "").slice(2, 6);
  const hex = createHash("sha256")
    .update(`${salt}:${seed}:${ngayChot}:${attempt}`)
    .digest("hex")
    .slice(0, 6)
    .toUpperCase();
  return `CINS${hex}${yymm}`;
}

function roundVnd(n) {
  return Math.max(0, Math.round(Number(n) || 0));
}

function splitAmount(total, parts) {
  const n = Math.max(1, parts);
  const base = Math.floor(total / n);
  const out = Array.from({ length: n }, () => base);
  out[out.length - 1] += total - base * n;
  return out.filter((x) => x > 0);
}

async function resolveSeller(slug) {
  const { data, error } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) throw new Error(`User slug không tồn tại: ${slug}`);
  return data;
}

/** Nick seeding (= có row auto_tai_khoan). */
async function listNickBuyers(excludeUserId, limit = 12) {
  const { data, error } = await admin
    .from("auto_tai_khoan")
    .select("slug, id_nguoi_dung")
    .not("id_nguoi_dung", "is", null)
    .limit(40);
  if (error) throw new Error(`auto_tai_khoan: ${error.message}`);
  const rows = (data ?? []).filter((r) => r.id_nguoi_dung !== excludeUserId);
  if (rows.length === 0) throw new Error("Không có nick seeding để làm buyer/HV");
  return rows.slice(0, limit);
}

async function ensureTk(userId) {
  const { data: existing } = await admin
    .from("cins_tk_thanh_toan")
    .select("id")
    .eq("id_nguoi_dung", userId)
    .maybeSingle();
  if (existing?.id) return existing.id;
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
  if (error) throw new Error(`cins_tk_thanh_toan: ${error.message}`);
  return data.id;
}

async function ensureDichVu(tkId, loai, thamChieuId, extra = {}) {
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
      id_tk: tkId,
      loai,
      tham_chieu_id: thamChieuId,
      trang_thai: "hoat_dong",
      tao_luc: now,
      cap_nhat_luc: now,
      ...extra,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      const { data: again } = await admin
        .from("cins_dich_vu")
        .select("id")
        .eq("loai", loai)
        .eq("tham_chieu_id", thamChieuId)
        .maybeSingle();
      return again.id;
    }
    throw new Error(`cins_dich_vu ${loai}: ${error.message}`);
  }
  return data.id;
}

async function listCsdtOrgs(userId) {
  const { data, error } = await admin
    .from("org_to_chuc")
    .select("id, slug, ten, loai_to_chuc, nguoi_tao")
    .eq("nguoi_tao", userId)
    .eq("loai_to_chuc", "co_so_dao_tao");
  if (error) throw new Error(`org_to_chuc: ${error.message}`);
  return data ?? [];
}

async function shopTyLe() {
  const { data: cins } = await admin
    .from("cins_cau_hinh_tai_chinh")
    .select("shop_ty_le, shop_toi_thieu_xuat_ky_vnd")
    .order("cap_nhat_luc", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (cins?.shop_ty_le != null) {
    return {
      tyLe: Number(cins.shop_ty_le),
      toiThieu: Number(cins.shop_toi_thieu_xuat_ky_vnd ?? 50_000),
    };
  }
  const { data } = await admin
    .from("shop_cau_hinh_phi")
    .select("ty_le")
    .order("cap_nhat_luc", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { tyLe: Number(data?.ty_le ?? 0.05), toiThieu: 50_000 };
}

async function csdtCfg() {
  const { data } = await admin
    .from("cins_cau_hinh_tai_chinh")
    .select("csdt_ty_le, csdt_nguong_kich_hoat_vnd, csdt_so_ngay_han_tra")
    .order("cap_nhat_luc", { ascending: false })
    .limit(1)
    .maybeSingle();
  return {
    tyLe: Number(data?.csdt_ty_le ?? 0.1),
    nguong: Number(data?.csdt_nguong_kich_hoat_vnd ?? 2_000_000),
    soNgayHan: Number(data?.csdt_so_ngay_han_tra ?? 7) || 7,
  };
}

async function soNgayHanShop() {
  const { data } = await admin
    .from("cins_cau_hinh_tai_chinh")
    .select("so_ngay_han_tra, csdt_so_ngay_han_tra")
    .order("cap_nhat_luc", { ascending: false })
    .limit(1)
    .maybeSingle();
  const n = Number(data?.so_ngay_han_tra ?? data?.csdt_so_ngay_han_tra ?? 7);
  return Number.isFinite(n) && n > 0 ? n : 7;
}

async function upsertCinsHoaDon(p) {
  const { data: existingHd } = await admin
    .from("cins_hoa_don")
    .select("id")
    .eq("nguon_bang", p.nguonBang)
    .eq("nguon_id", p.nguonId)
    .maybeSingle();

  if (existingHd?.id) {
    const { data, error } = await admin
      .from("cins_hoa_don")
      .update({
        so_tien_vnd: p.soTien,
        da_tra_vnd: 0,
        trang_thai: "chua_tra",
        han_tra: p.hanTra,
        tu_ngay: p.tuNgay,
        den_ngay: p.denNgay,
        ngay_chot: p.ngayChot,
        hoa_don_thong_tin: p.thongTin,
        cap_nhat_luc: p.nowIso,
      })
      .eq("id", existingHd.id)
      .select("id, ma_tham_chieu, so_tien_vnd, han_tra, trang_thai")
      .single();
    if (error) throw new Error(`cins_hoa_don update: ${error.message}`);
    return data;
  }

  let lastErr = "insert hd failed";
  for (let attempt = 0; attempt < 8; attempt++) {
    const ma = maThamChieu(p.seedMa, p.ngayChot, attempt);
    const { data, error } = await admin
      .from("cins_hoa_don")
      .insert({
        id_tk: p.tkId,
        id_dich_vu: p.dvId,
        tu_ngay: p.tuNgay,
        den_ngay: p.denNgay,
        ngay_chot: p.ngayChot,
        thong_bao_luc: p.nowIso,
        han_tra: p.hanTra,
        so_tien_vnd: p.soTien,
        dieu_chinh_vnd: 0,
        da_tra_vnd: 0,
        trang_thai: "chua_tra",
        ma_tham_chieu: ma,
        nguon_bang: p.nguonBang,
        nguon_id: p.nguonId,
        hoa_don_thong_tin: p.thongTin,
        tao_luc: p.nowIso,
        cap_nhat_luc: p.nowIso,
      })
      .select("id, ma_tham_chieu, so_tien_vnd, han_tra, trang_thai")
      .single();
    if (!error && data) return data;
    if (error?.code === "23505") {
      lastErr = error.message;
      continue;
    }
    throw new Error(`cins_hoa_don: ${error?.message ?? lastErr}`);
  }
  throw new Error(lastErr);
}

/* ── Clean ── */

async function cleanSeedShop(sellerId) {
  const { data: dons } = await admin
    .from("shop_don_hang")
    .select("id")
    .eq("id_nguoi_ban", sellerId)
    .like("ghi_chu", `${SEED_TAG}%`);
  const donIds = (dons ?? []).map((d) => d.id);
  if (donIds.length) {
    await admin.from("shop_phi_dong").delete().in("id_don_hang", donIds);
    await admin.from("shop_don_hang_dong").delete().in("id_don_hang", donIds);
    await admin.from("shop_don_hang").delete().in("id", donIds);
  }
  /* Kỳ seed trống / chỉ còn từ seed */
  const { data: kys } = await admin
    .from("shop_phi_ky")
    .select("id")
    .eq("id_nguoi_ban", sellerId);
  for (const ky of kys ?? []) {
    const { data: dongs } = await admin
      .from("shop_phi_dong")
      .select("id")
      .eq("id_ky", ky.id)
      .limit(1);
    if ((dongs ?? []).length === 0) {
      await admin
        .from("cins_hoa_don")
        .delete()
        .eq("nguon_bang", "shop_phi_ky")
        .eq("nguon_id", ky.id);
      await admin.from("shop_phi_ky").delete().eq("id", ky.id);
    }
  }
  console.log(`Clean shop seed: ${donIds.length} đơn`);
}

async function cleanSeedCsdt(orgId) {
  const { data: dons } = await admin
    .from("org_don_hoc_phi")
    .select("id")
    .eq("id_to_chuc", orgId)
    .like("ghi_chu", `${SEED_TAG}%`);
  const donIds = (dons ?? []).map((d) => d.id);
  if (donIds.length) {
    await admin.from("org_phi_dong").delete().in("id_don_hoc_phi", donIds);
    await admin.from("org_ky_hoc").delete().in("id_don", donIds);
    await admin.from("org_don_hoc_phi").delete().in("id", donIds);
  }
  /* Kỳ / dong seed không gắn đơn (seed cũ) */
  const { data: kys } = await admin
    .from("org_phi_ky")
    .select("id, hoa_don_thong_tin")
    .eq("id_to_chuc", orgId);
  for (const ky of kys ?? []) {
    if (ky.hoa_don_thong_tin?.seed !== SEED_TAG) continue;
    await admin.from("org_phi_dong").delete().eq("id_ky", ky.id);
    await admin
      .from("cins_hoa_don")
      .delete()
      .eq("nguon_bang", "org_phi_ky")
      .eq("nguon_id", ky.id);
    await admin.from("org_phi_ky").delete().eq("id", ky.id);
  }
  await admin
    .from("org_phi_dong")
    .delete()
    .eq("id_to_chuc", orgId)
    .is("id_don_hoc_phi", null)
    .is("id_ky", null);
  console.log(`Clean CSĐT seed: ${donIds.length} đơn HP`);
}

/* ── Shop catalog ── */

async function ensureShopCatalog(sellerId) {
  /* Ưu tiên SP đang bán; không có → revive Stelle (da_xoa) hoặc tạo mới dưới HSR */
  const { data: active } = await admin
    .from("shop_san_pham")
    .select(
      "id, ten, shop_bien_the(id, nhan, so_luong_ton, da_xoa)",
    )
    .eq("id_nguoi_dung", sellerId)
    .eq("da_xoa", false)
    .eq("dang_ban", true)
    .limit(5);

  for (const sp of active ?? []) {
    const bt = (sp.shop_bien_the ?? []).find((b) => !b.da_xoa);
    if (bt) {
      await admin
        .from("shop_bien_the")
        .update({ so_luong_ton: Math.max(bt.so_luong_ton || 0, 99) })
        .eq("id", bt.id);
      return {
        sanPhamId: sp.id,
        ten: sp.ten,
        bienTheId: bt.id,
        nhan: bt.nhan || "Mặc định",
        gia: 200_000,
      };
    }
  }

  const { data: stelle } = await admin
    .from("shop_san_pham")
    .select("id, ten, id_nhom")
    .eq("id_nguoi_dung", sellerId)
    .eq("ten", "Stelle")
    .maybeSingle();

  let spId = stelle?.id;
  let nhomId = stelle?.id_nhom;
  if (!nhomId) {
    const { data: nhom } = await admin
      .from("shop_nhom")
      .select("id")
      .eq("id_nguoi_dung", sellerId)
      .eq("da_xoa", false)
      .limit(1)
      .maybeSingle();
    nhomId = nhom?.id ?? null;
  }

  if (spId) {
    await admin
      .from("shop_san_pham")
      .update({ da_xoa: false, dang_ban: true, id_nhom: nhomId })
      .eq("id", spId);
  } else {
    const { data: created, error } = await admin
      .from("shop_san_pham")
      .insert({
        id_nguoi_dung: sellerId,
        ten: `${SEED_TAG} Pin HSR`,
        dang_ban: true,
        da_xoa: false,
        id_nhom: nhomId,
      })
      .select("id, ten")
      .single();
    if (error) throw new Error(`shop_san_pham: ${error.message}`);
    spId = created.id;
  }

  const { data: bts } = await admin
    .from("shop_bien_the")
    .select("id, nhan")
    .eq("id_san_pham", spId)
    .limit(1);
  let btId = bts?.[0]?.id;
  let nhan = bts?.[0]?.nhan || "Mặc định";
  if (btId) {
    await admin
      .from("shop_bien_the")
      .update({ da_xoa: false, so_luong_ton: 99 })
      .eq("id", btId);
  } else {
    const { data: bt, error } = await admin
      .from("shop_bien_the")
      .insert({
        id_san_pham: spId,
        nhan: "Mặc định",
        so_luong_ton: 99,
        da_xoa: false,
      })
      .select("id, nhan")
      .single();
    if (error) throw new Error(`shop_bien_the: ${error.message}`);
    btId = bt.id;
    nhan = bt.nhan;
  }

  const { data: spRow } = await admin
    .from("shop_san_pham")
    .select("ten")
    .eq("id", spId)
    .single();

  return {
    sanPhamId: spId,
    ten: spRow?.ten || "Stelle",
    bienTheId: btId,
    nhan,
    gia: 200_000,
  };
}

async function seedShop({ seller, tkId, gmvTotal, nicks }) {
  const { tyLe, toiThieu } = await shopTyLe();
  const catalog = await ensureShopCatalog(seller.id);
  const unit = catalog.gia;
  const soDon = Math.max(2, Math.min(nicks.length, Math.ceil(gmvTotal / unit)));
  const amounts = splitAmount(gmvTotal, soDon);
  const hoanLuc = midPrevMonthIso();
  const ky = kyThangTruocYmd();
  const den = endOfMonthYmd(ky);
  const today = ymdVn();
  const hanTra = addDaysYmd(today, await soNgayHanShop());
  const nowIso = new Date().toISOString();
  const dvId = await ensureDichVu(tkId, "shop_phi", seller.id);

  const created = [];
  for (let i = 0; i < amounts.length; i++) {
    const gmv = amounts[i];
    const nick = nicks[i % nicks.length];
    const qty = Math.max(1, Math.round(gmv / unit));
    const gia = roundVnd(gmv / qty);
    const ma = `SEED${Date.now().toString(36).toUpperCase()}${i}`;

    const { data: don, error: donErr } = await admin
      .from("shop_don_hang")
      .insert({
        id_nguoi_mua: nick.id_nguoi_dung,
        id_nguoi_ban: seller.id,
        loai_don: "mua_ngay",
        trang_thai: "hoan_thanh",
        tien_te: "VND",
        tong_tien: gmv,
        ghi_chu: `${SEED_TAG} ${catalog.ten} ×${qty} · buyer @${nick.slug}`,
        ma_don: ma,
        da_tru_kho: false,
        dong_boi: "seller",
        hoan_thanh_luc: hoanLuc,
        hoan_thanh_boi: seller.id,
        xac_nhan_luc: hoanLuc,
        mua_ho_ten: nick.slug,
        mua_so_dien_thoai: "0900000000",
        mua_dia_chi: "Seed address",
        tao_luc: hoanLuc,
        cap_nhat_luc: nowIso,
      })
      .select("id, ma_don, tong_tien")
      .single();
    if (donErr) throw new Error(`shop_don_hang: ${donErr.message}`);

    const { error: lineErr } = await admin.from("shop_don_hang_dong").insert({
      id_don_hang: don.id,
      id_bien_the: catalog.bienTheId,
      ten_snapshot: catalog.ten,
      nhan_snapshot: catalog.nhan,
      so_luong: qty,
      gia_don_vi: gia,
    });
    if (lineErr) throw new Error(`shop_don_hang_dong: ${lineErr.message}`);

    created.push({
      id: don.id,
      ma: don.ma_don,
      gmv,
      buyer: nick.slug,
      qty,
    });
  }

  /* Kỳ chua_chot → ghi dòng → chốt chua_tra (giống cron) */
  const { data: kyUpsert, error: kyErr } = await admin
    .from("shop_phi_ky")
    .upsert(
      {
        id_nguoi_ban: seller.id,
        ky,
        gmv_ghi_nhan: 0,
        ty_le: tyLe,
        phi_phai_tra: 0,
        trang_thai: "chua_chot",
        han_tra: hanTra,
        cap_nhat_luc: nowIso,
      },
      { onConflict: "id_nguoi_ban,ky" },
    )
    .select("id")
    .single();
  if (kyErr) throw new Error(`shop_phi_ky: ${kyErr.message}`);

  let gmvSum = 0;
  let phiSum = 0;
  for (const d of created) {
    const phi = roundVnd(d.gmv * tyLe);
    gmvSum += d.gmv;
    phiSum += phi;
    const { error: dongErr } = await admin.from("shop_phi_dong").upsert(
      {
        id_don_hang: d.id,
        id_nguoi_ban: seller.id,
        id_ky: kyUpsert.id,
        gmv: d.gmv,
        ty_le: tyLe,
        phi,
        loai_tru: false,
      },
      { onConflict: "id_don_hang" },
    );
    if (dongErr) throw new Error(`shop_phi_dong: ${dongErr.message}`);
  }

  if (phiSum < toiThieu) {
    console.warn(
      `Phí shop ${phiSum} < tối thiểu xuất kỳ ${toiThieu} — tăng --gmv`,
    );
  }

  const { error: chotErr } = await admin
    .from("shop_phi_ky")
    .update({
      gmv_ghi_nhan: gmvSum,
      phi_phai_tra: phiSum,
      ty_le: tyLe,
      trang_thai: "chua_tra",
      han_tra: hanTra,
      cap_nhat_luc: nowIso,
    })
    .eq("id", kyUpsert.id);
  if (chotErr) throw new Error(`chot shop_phi_ky: ${chotErr.message}`);

  const hd = await upsertCinsHoaDon({
    tkId,
    dvId,
    tuNgay: ky,
    denNgay: den,
    ngayChot: den,
    hanTra,
    soTien: phiSum,
    nguonBang: "shop_phi_ky",
    nguonId: kyUpsert.id,
    seedMa: `shop:${seller.id}`,
    thongTin: {
      seed: SEED_TAG,
      doanhThuVnd: gmvSum,
      gmv: gmvSum,
      tyLe,
      catalog: catalog.ten,
    },
    nowIso,
  });

  return {
    catalog: { ten: catalog.ten, bienTheId: catalog.bienTheId },
    gmv: gmvSum,
    tyLe,
    phi: phiSum,
    ky,
    hanTra,
    don: created,
    hoaDon: hd,
  };
}

/* ── CSĐT học phí ── */

async function ensureHocVienLop(orgId, userId, khoaId) {
  const { data: existing } = await admin
    .from("user_hoc_vien_lop")
    .select("id")
    .eq("id_nguoi_dung", userId)
    .eq("id_khoa_hoc", khoaId)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await admin
    .from("user_hoc_vien_lop")
    .insert({
      id_nguoi_dung: userId,
      id_khoa_hoc: khoaId,
      id_lop_hoc: null,
      trang_thai: "dang_hoc",
      ngay_dang_ky: ymdVn(),
    })
    .select("id")
    .single();
  if (error) throw new Error(`user_hoc_vien_lop: ${error.message}`);
  return data.id;
}

async function seedCsdt({ seller, tkId, org, doanhThu, nicks }) {
  const cfg = await csdtCfg();
  const tyLe = cfg.tyLe;
  const phiTarget = roundVnd(doanhThu * tyLe);
  if (phiTarget < cfg.nguong) {
    console.warn(
      `Σ phí dự kiến ${phiTarget} < ngưỡng ${cfg.nguong}. ` +
        `Tăng --dt (cần ≈ ${Math.ceil(cfg.nguong / tyLe)} VND doanh thu @ ${tyLe}).`,
    );
  }

  const { data: khoa } = await admin
    .from("org_khoa_hoc")
    .select("id, ten_khoa_hoc")
    .eq("id_to_chuc", org.id)
    .limit(1)
    .maybeSingle();
  if (!khoa?.id) throw new Error(`Org ${org.slug} chưa có khóa học`);

  const { data: goi } = await admin
    .from("org_goi_hoc_phi")
    .select("id, ten, gia_vnd, so_ngay")
    .eq("id_to_chuc", org.id)
    .eq("dang_ban", true)
    .order("gia_vnd", { ascending: false })
    .limit(1)
    .maybeSingle();

  const unit = goi?.gia_vnd && goi.gia_vnd > 0 ? goi.gia_vnd : 2_500_000;
  const soNgay = goi?.so_ngay && goi.so_ngay > 0 ? goi.so_ngay : 30;
  const soDon = Math.max(
    2,
    Math.min(nicks.length, Math.ceil(doanhThu / unit)),
  );
  const amounts = splitAmount(doanhThu, soDon);
  const today = ymdVn();
  const hanTra = addDaysYmd(today, cfg.soNgayHan);
  const nowIso = new Date().toISOString();
  const dvId = await ensureDichVu(tkId, "csdt_phi", org.id, {
    ty_le: tyLe,
    nguong_chot_vnd: cfg.nguong,
    so_ngay_han_tra: cfg.soNgayHan,
  });

  const created = [];
  let doanhThuSum = 0;
  let phiSum = 0;

  for (let i = 0; i < amounts.length; i++) {
    const soTien = amounts[i];
    const nick = nicks[i % nicks.length];
    const hvlId = await ensureHocVienLop(
      org.id,
      nick.id_nguoi_dung,
      khoa.id,
    );

    const { data: don, error: donErr } = await admin
      .from("org_don_hoc_phi")
      .insert({
        id_to_chuc: org.id,
        id_hoc_vien_lop: hvlId,
        id_goi: goi?.id ?? null,
        id_nguoi_thu: seller.id,
        kenh: "vietqr",
        trang_thai: "cho_thanh_toan",
        so_tien_vnd: soTien,
        gia_goc_vnd: soTien,
        giam_vnd: 0,
        so_ngay_cong: soNgay,
        ghi_chu: `${SEED_TAG} ${goi?.ten || "HP"} · HV @${nick.slug}`,
      })
      .select("id, so_tien_vnd")
      .single();
    if (donErr) throw new Error(`org_don_hoc_phi: ${donErr.message}`);

    /* Xác nhận nhận tiền (ổ khóa giống xacNhanDonHocPhi) */
    const { data: locked, error: lockErr } = await admin
      .from("org_don_hoc_phi")
      .update({
        trang_thai: "da_nhan_tien",
        xac_nhan_luc: nowIso,
        id_nguoi_thu: seller.id,
        cap_nhat_luc: nowIso,
      })
      .eq("id", don.id)
      .eq("trang_thai", "cho_thanh_toan")
      .select("id");
    if (lockErr) throw new Error(`xac nhan HP: ${lockErr.message}`);
    if (!locked?.length) throw new Error("Không lock được đơn HP");

    const phi = roundVnd(soTien * tyLe);
    const { error: dongErr } = await admin.from("org_phi_dong").insert({
      id_to_chuc: org.id,
      id_don_hoc_phi: don.id,
      id_ky: null,
      doanh_thu_vnd: soTien,
      ty_le: tyLe,
      phi_vnd: phi,
      loai_tru: false,
      xac_nhan_luc: nowIso,
    });
    if (dongErr && dongErr.code !== "23505") {
      throw new Error(`org_phi_dong: ${dongErr.message}`);
    }

    doanhThuSum += soTien;
    phiSum += phi;
    created.push({
      id: don.id,
      soTien,
      phi,
      hv: nick.slug,
      goi: goi?.ten || null,
    });
  }

  /* Kích hoạt kỳ nếu đủ ngưỡng phí (logic ensureKyKichHoat) */
  const { data: existingKichHoat } = await admin
    .from("org_phi_ky")
    .select("id")
    .eq("id_to_chuc", org.id)
    .eq("loai_ky", "kich_hoat")
    .limit(1)
    .maybeSingle();

  let kyRow = null;
  let hd = null;

  if (existingKichHoat?.id) {
    console.warn(
      `Org ${org.slug} đã có kỳ kich_hoat — gắn dòng seed vào kỳ đó / không tạo mới.`,
    );
    await admin
      .from("org_phi_dong")
      .update({ id_ky: existingKichHoat.id })
      .eq("id_to_chuc", org.id)
      .is("id_ky", null)
      .in(
        "id_don_hoc_phi",
        created.map((c) => c.id),
      );
    kyRow = { id: existingKichHoat.id };
  } else if (phiSum >= cfg.nguong) {
    const tuNgay = addDaysYmd(today, -30);
    let lastErr = "insert org_phi_ky failed";
    for (let attempt = 0; attempt < 8; attempt++) {
      const ma = maThamChieu(org.id, today, attempt);
      const { data, error } = await admin
        .from("org_phi_ky")
        .insert({
          id_to_chuc: org.id,
          loai_ky: "kich_hoat",
          tu_ngay: tuNgay,
          den_ngay: today,
          ngay_chot: today,
          han_tra: hanTra,
          doanh_thu_ghi_nhan_vnd: doanhThuSum,
          ty_le: tyLe,
          phi_phai_tra_vnd: phiSum,
          dieu_chinh_vnd: 0,
          da_tra_vnd: 0,
          trang_thai: "chua_tra",
          ma_tham_chieu: ma,
          hoa_don_thong_tin: {
            seed: SEED_TAG,
            doanhThuVnd: doanhThuSum,
            tyLe,
            orgSlug: org.slug,
            fromRealDon: true,
          },
          tao_luc: nowIso,
          cap_nhat_luc: nowIso,
        })
        .select("id, ma_tham_chieu, phi_phai_tra_vnd, han_tra, trang_thai")
        .single();
      if (!error && data) {
        kyRow = data;
        break;
      }
      if (error?.code === "23505") {
        lastErr = error.message;
        continue;
      }
      throw new Error(`org_phi_ky: ${error?.message ?? lastErr}`);
    }
    if (!kyRow) throw new Error(lastErr);

    await admin
      .from("org_phi_dong")
      .update({ id_ky: kyRow.id })
      .eq("id_to_chuc", org.id)
      .is("id_ky", null)
      .in(
        "id_don_hoc_phi",
        created.map((c) => c.id),
      );

    hd = await upsertCinsHoaDon({
      tkId,
      dvId,
      tuNgay,
      denNgay: today,
      ngayChot: today,
      hanTra,
      soTien: phiSum,
      nguonBang: "org_phi_ky",
      nguonId: kyRow.id,
      seedMa: org.id,
      thongTin: {
        seed: SEED_TAG,
        doanhThuVnd: doanhThuSum,
        tyLe,
        orgSlug: org.slug,
        fromRealDon: true,
      },
      nowIso,
    });
  } else {
    console.warn(
      `Chưa đủ ngưỡng phí (${phiSum}/${cfg.nguong}) — đơn đã có trong QL học phí, tích luỹ chờ kích hoạt.`,
    );
  }

  return {
    org: { id: org.id, slug: org.slug, ten: org.ten },
    khoa: khoa.ten_khoa_hoc,
    doanhThu: doanhThuSum,
    tyLe,
    phi: phiSum,
    nguong: cfg.nguong,
    hanTra: kyRow ? hanTra : null,
    don: created,
    orgKy: kyRow,
    hoaDon: hd,
  };
}

async function main() {
  const slug = arg("slug", "nguyenthanhtu");
  const gmvTotal = roundVnd(arg("gmv", "2000000"));
  /* Mặc định 20tr DT → ~2tr phí ≥ ngưỡng kích hoạt CSĐT */
  const dtCsdt = roundVnd(arg("dt", "20000000"));
  const clean = hasFlag("clean") || hasFlag("clean-only");
  const shopOnly = hasFlag("shop-only");
  const csdtOnly = hasFlag("csdt-only");
  const doShop = !csdtOnly;
  const doCsdt = !shopOnly;

  const seller = await resolveSeller(slug);
  console.log("Seller:", seller.slug, seller.id);

  const orgs = await listCsdtOrgs(seller.id);
  console.log(
    "CSĐT:",
    orgs.length ? orgs.map((o) => o.slug).join(", ") : "(không có)",
  );

  if (clean) {
    if (doShop) await cleanSeedShop(seller.id);
    if (doCsdt) {
      for (const org of orgs) await cleanSeedCsdt(org.id);
    }
    if (hasFlag("clean-only")) return;
  }

  const nicks = await listNickBuyers(seller.id, 12);
  console.log(
    "Nick buyers/HV:",
    nicks.map((n) => n.slug).join(", "),
  );

  const tkId = await ensureTk(seller.id);
  const out = {
    ok: true,
    seller: seller.slug,
    hub: "/tai-khoan/thanh-toan",
    note: "Doanh thu hub = tổng đơn seed thật (shop hoàn thành / HP đã nhận).",
  };

  if (doShop) {
    out.shop = await seedShop({ seller, tkId, gmvTotal, nicks });
  }
  if (doCsdt) {
    if (!orgs.length) {
      console.warn("Không có CSĐT — bỏ qua.");
      out.csdt = [];
    } else {
      out.csdt = [];
      for (const org of orgs) {
        out.csdt.push(
          await seedCsdt({ seller, tkId, org, doanhThu: dtCsdt, nicks }),
        );
      }
    }
  }

  out.tip =
    "Reload /tai-khoan/thanh-toan và /co-so/sine-art/quan-ly/hoc-phi (và /ban-hang/don).";
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
