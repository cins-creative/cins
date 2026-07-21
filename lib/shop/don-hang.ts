import "server-only";

import { openDirectRoom, sendRoomMessage } from "@/lib/chat/direct-message";
import { getGio, getGioCuaHang } from "@/lib/shop/gio";
import { clearGioChungCuaSeller, getGioChung } from "@/lib/shop/gio-chung";
import {
  assertShopNotTamDong,
  buildThanhToanSnapshot,
  getShopCheckoutPayment,
} from "@/lib/shop/cua-hang";
import {
  buildShopMaDon,
  isValidShopMaDon,
  normalizeShopMaDon,
  shopMaDonPrefix,
} from "@/lib/shop/ma-don";
import {
  SHOP_BUYER_TRANSFER_DISCLAIMER,
  SHOP_BUYER_TRANSFER_DISCLAIMER_VERSION,
  shopTermsSnapshot,
} from "@/lib/shop/terms";
import { shopImageUrl } from "@/lib/shop/settings";
import type {
  ShopDonHang,
  ShopDonHangDong,
  ShopLoaiDon,
  ShopThanhToanSnapshot,
  ShopTrangThaiDon,
} from "@/lib/shop/types";
import { SHOP_TRANG_THAI_DON_LABEL } from "@/lib/shop/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type DonRow = {
  id: string;
  ma_don: string | null;
  id_nguoi_mua: string;
  id_nguoi_ban: string;
  id_cot_moc: string | null;
  id_su_kien: string | null;
  loai_don: ShopLoaiDon;
  trang_thai: ShopTrangThaiDon;
  tien_te: string;
  tong_tien: number | string;
  ghi_chu: string | null;
  da_tru_kho: boolean;
  tao_luc: string;
  xac_nhan_luc: string | null;
  nguoi_mua_chap_nhan_luc?: string | null;
  nguoi_mua_chap_nhan_van_ban?: string | null;
  nguoi_mua_chap_nhan_phien_ban?: string | null;
  thanh_toan_snapshot?: ShopThanhToanSnapshot | null;
  bien_lai_anh_url?: string | null;
  bien_lai_anh_id?: string | null;
};

const DON_SELECT =
  "id, ma_don, id_nguoi_mua, id_nguoi_ban, id_cot_moc, id_su_kien, loai_don, trang_thai, tien_te, tong_tien, ghi_chu, da_tru_kho, tao_luc, xac_nhan_luc, nguoi_mua_chap_nhan_luc, nguoi_mua_chap_nhan_van_ban, nguoi_mua_chap_nhan_phien_ban, thanh_toan_snapshot, bien_lai_anh_url, bien_lai_anh_id";

function normalizeThanhToanSnapshot(
  raw: unknown,
): ShopThanhToanSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<ShopThanhToanSnapshot>;
  if (
    typeof s.nganHang !== "string" ||
    typeof s.soTaiKhoan !== "string" ||
    typeof s.tenChuTaiKhoan !== "string"
  ) {
    return null;
  }
  const qrAnhId =
    typeof s.qrAnhId === "string" && s.qrAnhId.trim() ? s.qrAnhId.trim() : null;
  return {
    idPhuongThuc:
      typeof s.idPhuongThuc === "string" ? s.idPhuongThuc : null,
    nganHang: s.nganHang,
    soTaiKhoan: s.soTaiKhoan,
    tenChuTaiKhoan: s.tenChuTaiKhoan,
    qrAnhId,
    qrAnhUrl: s.qrAnhUrl ?? shopImageUrl(qrAnhId),
    noiDungCk: typeof s.noiDungCk === "string" ? s.noiDungCk : "",
    tongTien: Number(s.tongTien ?? 0),
    tienTe: typeof s.tienTe === "string" ? s.tienTe : "VND",
  };
}

type DongRow = {
  id: string;
  id_don_hang: string;
  id_bien_the: string | null;
  ten_snapshot: string;
  nhan_snapshot: string | null;
  so_luong: number;
  gia_don_vi: number | string;
};

function mapDong(
  d: DongRow,
  metaByBienThe: Map<
    string,
    { anhUrl: string | null; phanLoai: string | null; phanLoai2: string | null }
  >,
): ShopDonHangDong {
  const meta = d.id_bien_the ? metaByBienThe.get(d.id_bien_the) : undefined;
  return {
    id: d.id,
    idBienThe: d.id_bien_the,
    tenSnapshot: d.ten_snapshot,
    nhanSnapshot: d.nhan_snapshot,
    soLuong: d.so_luong,
    giaDonVi: Number(d.gia_don_vi),
    anhUrl: meta?.anhUrl ?? null,
    phanLoai: meta?.phanLoai ?? null,
    phanLoai2: meta?.phanLoai2 ?? null,
  };
}

async function attachDong(dons: DonRow[]): Promise<ShopDonHang[]> {
  if (dons.length === 0) return [];
  const admin = createServiceRoleClient();
  const ids = dons.map((d) => d.id);
  const { data: dongs } = await admin
    .from("shop_don_hang_dong")
    .select(
      "id, id_don_hang, id_bien_the, ten_snapshot, nhan_snapshot, so_luong, gia_don_vi",
    )
    .in("id_don_hang", ids);
  const dongRows = (dongs ?? []) as DongRow[];

  const btIds = [
    ...new Set(
      dongRows
        .map((d) => d.id_bien_the)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const metaByBienThe = new Map<
    string,
    { anhUrl: string | null; phanLoai: string | null; phanLoai2: string | null }
  >();
  if (btIds.length > 0) {
    const { data: bts } = await admin
      .from("shop_bien_the")
      .select("id, id_san_pham, anh_id")
      .in("id", btIds);
    const btList = (bts ?? []) as Array<{
      id: string;
      id_san_pham: string;
      anh_id: string | null;
    }>;
    const spIds = [...new Set(btList.map((b) => b.id_san_pham).filter(Boolean))];
    const spMeta = new Map<
      string,
      { anhId: string | null; phanLoai: string | null; phanLoai2: string | null }
    >();
    if (spIds.length > 0) {
      const { data: sps } = await admin
        .from("shop_san_pham")
        .select("id, anh_id, phan_loai, phan_loai_2")
        .in("id", spIds);
      for (const s of (sps ?? []) as Array<{
        id: string;
        anh_id: string | null;
        phan_loai: string | null;
        phan_loai_2: string | null;
      }>) {
        spMeta.set(s.id, {
          anhId: s.anh_id,
          phanLoai: s.phan_loai?.trim() || null,
          phanLoai2: s.phan_loai_2?.trim() || null,
        });
      }
    }
    for (const bt of btList) {
      const sp = spMeta.get(bt.id_san_pham);
      metaByBienThe.set(bt.id, {
        anhUrl: shopImageUrl(bt.anh_id ?? sp?.anhId ?? null),
        phanLoai: sp?.phanLoai ?? null,
        phanLoai2: sp?.phanLoai2 ?? null,
      });
    }
  }

  const byDon = new Map<string, ShopDonHangDong[]>();
  for (const d of dongRows) {
    const list = byDon.get(d.id_don_hang) ?? [];
    list.push(mapDong(d, metaByBienThe));
    byDon.set(d.id_don_hang, list);
  }

  const userIds = [
    ...new Set(dons.flatMap((d) => [d.id_nguoi_mua, d.id_nguoi_ban])),
  ];
  const { data: users } = await admin
    .from("user_nguoi_dung")
    .select("id, ten_hien_thi")
    .in("id", userIds);
  const nameMap = new Map(
    ((users ?? []) as Array<{ id: string; ten_hien_thi: string | null }>).map(
      (u) => [u.id, u.ten_hien_thi],
    ),
  );

  return dons.map((d) => ({
    id: d.id,
    maDon: d.ma_don,
    idNguoiMua: d.id_nguoi_mua,
    idNguoiBan: d.id_nguoi_ban,
    idCotMoc: d.id_cot_moc,
    idSuKien: d.id_su_kien,
    loaiDon: d.loai_don,
    trangThai: d.trang_thai,
    tienTe: d.tien_te,
    tongTien: Number(d.tong_tien),
    ghiChu: d.ghi_chu,
    daTruKho: d.da_tru_kho,
    dong: byDon.get(d.id) ?? [],
    muaTen: nameMap.get(d.id_nguoi_mua) ?? null,
    banTen: nameMap.get(d.id_nguoi_ban) ?? null,
    taoLuc: d.tao_luc,
    xacNhanLuc: d.xac_nhan_luc,
    nguoiMuaChapNhanLuc: d.nguoi_mua_chap_nhan_luc ?? null,
    nguoiMuaChapNhanVanBan: d.nguoi_mua_chap_nhan_van_ban ?? null,
    nguoiMuaChapNhanPhienBan: d.nguoi_mua_chap_nhan_phien_ban ?? null,
    thanhToanSnapshot: normalizeThanhToanSnapshot(d.thanh_toan_snapshot),
    bienLaiAnhUrl: d.bien_lai_anh_url ?? null,
    bienLaiAnhId: d.bien_lai_anh_id ?? null,
  }));
}

export async function getDonHang(donId: string): Promise<ShopDonHang | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("shop_don_hang")
    .select(DON_SELECT)
    .eq("id", donId)
    .maybeSingle<DonRow>();
  if (!data) return null;
  const [mapped] = await attachDong([data]);
  return mapped ?? null;
}

export async function listDonHangForUser(
  userId: string,
  role: "seller" | "buyer",
  limit = 50,
): Promise<ShopDonHang[]> {
  const admin = createServiceRoleClient();
  const col = role === "seller" ? "id_nguoi_ban" : "id_nguoi_mua";
  const { data, error } = await admin
    .from("shop_don_hang")
    .select(DON_SELECT)
    .eq(col, userId)
    .order("tao_luc", { ascending: false })
    .limit(Math.min(limit, 100));
  if (error) {
    console.error("[shop] listDonHang", error);
    throw new Error("LIST_FAILED");
  }
  return attachDong((data ?? []) as DonRow[]);
}

export async function createDonFromGio(
  buyerId: string,
  input: {
    /** Giỏ post-kiosk — XOR với `cuaHangId`. */
    cotMocId?: string | null;
    /** Giỏ storefront — XOR với `cotMocId`. */
    cuaHangId?: string | null;
    loaiDon: ShopLoaiDon;
    idSuKien?: string | null;
    ghiChu?: string | null;
    /** Mã đơn client đã in trên hóa đơn — server validate + lưu. */
    maDon?: string | null;
    /** Bắt buộc true khi `mua_ngay` — server không tin checkbox client alone. */
    nguoiMuaChapNhanRuiRo?: boolean;
  },
): Promise<ShopDonHang> {
  const cotMocId =
    typeof input.cotMocId === "string" && input.cotMocId.trim()
      ? input.cotMocId.trim()
      : null;
  const cuaHangId =
    typeof input.cuaHangId === "string" && input.cuaHangId.trim()
      ? input.cuaHangId.trim()
      : null;
  if ((cotMocId == null) === (cuaHangId == null)) {
    throw new Error("CART_SCOPE_REQUIRED");
  }

  const gio = cotMocId
    ? await getGio(buyerId, cotMocId)
    : await getGioCuaHang(buyerId, cuaHangId!);
  if (gio.dong.length === 0) throw new Error("CART_EMPTY");

  const admin = createServiceRoleClient();
  let sellerId: string;
  if (cotMocId) {
    const { data: moc } = await admin
      .from("content_cot_moc")
      .select("id, id_nguoi_dung")
      .eq("id", cotMocId)
      .maybeSingle<{ id: string; id_nguoi_dung: string }>();
    if (!moc) throw new Error("POST_NOT_FOUND");
    sellerId = moc.id_nguoi_dung;
  } else {
    const { data: shop } = await admin
      .from("shop_cua_hang")
      .select("id, id_nguoi_dung")
      .eq("id", cuaHangId!)
      .eq("da_xoa", false)
      .maybeSingle<{ id: string; id_nguoi_dung: string }>();
    if (!shop) throw new Error("SHOP_NOT_FOUND");
    sellerId = shop.id_nguoi_dung;
  }
  if (sellerId === buyerId) throw new Error("CANNOT_BUY_OWN");

  if (input.loaiDon !== "mua_ngay") {
    throw new Error("LOAI_DON_UNSUPPORTED");
  }

  await assertShopNotTamDong(sellerId);

  if (input.nguoiMuaChapNhanRuiRo !== true) {
    throw new Error("BUYER_ACCEPTANCE_REQUIRED");
  }

  for (const d of gio.dong) {
    if (d.soLuongTon <= 0) throw new Error("STOCK_EMPTY");
    if (d.soLuong > d.soLuongTon) throw new Error("STOCK_INSUFFICIENT");
  }

  const { data: buyer } = await admin
    .from("user_nguoi_dung")
    .select("ten_hien_thi, slug")
    .eq("id", buyerId)
    .maybeSingle<{ ten_hien_thi: string | null; slug: string | null }>();
  const buyerLabel =
    buyer?.ten_hien_thi?.trim() || buyer?.slug?.trim() || "BUYER";

  const buyerPrefix = shopMaDonPrefix(buyerLabel);
  const clientMa =
    typeof input.maDon === "string" && isValidShopMaDon(input.maDon)
      ? normalizeShopMaDon(input.maDon)
      : null;
  /* Chỉ nhận mã client nếu prefix = tên người mua (khớp hóa đơn đã in). */
  let maDon =
    clientMa && clientMa.startsWith(`${buyerPrefix}-`)
      ? clientMa
      : buildShopMaDon(buyerLabel);

  const { payment } = await getShopCheckoutPayment(sellerId);
  if (!payment) {
    throw new Error("PAYMENT_REQUIRED");
  }
  const thanhToanSnapshot = buildThanhToanSnapshot(
    payment,
    maDon,
    gio.tongTien,
    gio.tienTe,
  );

  const chapNhan = {
    nguoi_mua_chap_nhan_luc: new Date().toISOString(),
    nguoi_mua_chap_nhan_van_ban: SHOP_BUYER_TRANSFER_DISCLAIMER,
    nguoi_mua_chap_nhan_phien_ban: SHOP_BUYER_TRANSFER_DISCLAIMER_VERSION,
  };

  let don: DonRow | null = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const snapshotForAttempt = {
      ...thanhToanSnapshot,
      noiDungCk: maDon,
    };
    const { data, error } = await admin
      .from("shop_don_hang")
      .insert({
        id_nguoi_mua: buyerId,
        id_nguoi_ban: sellerId,
        id_cot_moc: cotMocId,
        id_su_kien: input.idSuKien ?? null,
        loai_don: input.loaiDon,
        trang_thai: "cho_xac_nhan",
        tien_te: gio.tienTe,
        tong_tien: gio.tongTien,
        ghi_chu: input.ghiChu?.trim() || null,
        ma_don: maDon,
        dieu_khoan_snapshot: shopTermsSnapshot(),
        da_tru_kho: false,
        thanh_toan_snapshot: snapshotForAttempt,
        ...chapNhan,
      })
      .select(DON_SELECT)
      .single<DonRow>();
    if (!error && data) {
      don = data;
      break;
    }
    lastError = error;
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code)
        : "";
    /* 23505 = unique_violation (mã đơn trùng) → đổi mã rồi thử lại. */
    if (code !== "23505") break;
    maDon = buildShopMaDon(buyerLabel);
  }
  if (!don) {
    console.error("[shop] createDon", lastError);
    throw new Error("CREATE_FAILED");
  }

  const { error: dongErr } = await admin.from("shop_don_hang_dong").insert(
    gio.dong.map((d) => ({
      id_don_hang: don.id,
      id_bien_the: d.idBienThe,
      ten_snapshot: d.tenSanPham,
      nhan_snapshot: d.nhanBienThe,
      so_luong: d.soLuong,
      gia_don_vi: d.giaHienThi,
    })),
  );
  if (dongErr) {
    console.error("[shop] createDonDong", dongErr);
    await admin.from("shop_don_hang").delete().eq("id", don.id);
    throw new Error("CREATE_FAILED");
  }

  /* Trừ kho ngay (atomic) — tránh 2 buyer cùng lấy hết tồn. */
  {
    const deducted: Array<{ idBienThe: string; soLuong: number }> = [];
    try {
      for (const d of gio.dong) {
        const ok = await truKhoBienThe(d.idBienThe, d.soLuong);
        if (!ok) throw new Error("STOCK_INSUFFICIENT");
        deducted.push({ idBienThe: d.idBienThe, soLuong: d.soLuong });
      }
      const { error: flagErr } = await admin
        .from("shop_don_hang")
        .update({
          da_tru_kho: true,
          cap_nhat_luc: new Date().toISOString(),
        })
        .eq("id", don.id);
      if (flagErr) throw new Error("CREATE_FAILED");
    } catch (e) {
      for (const x of deducted.reverse()) {
        await hoanKhoBienThe(x.idBienThe, x.soLuong);
      }
      await admin.from("shop_don_hang").delete().eq("id", don.id);
      if (e instanceof Error && e.message === "STOCK_INSUFFICIENT") {
        throw e;
      }
      console.error("[shop] createDonTruKho", e);
      throw new Error("CREATE_FAILED");
    }
  }

  // Clear cart after order
  if (gio.id) {
    await admin.from("shop_gio_dong").delete().eq("id_gio", gio.id);
  }

  const fresh = await getDonHang(don.id);
  if (!fresh) throw new Error("CREATE_FAILED");
  return fresh;
}

/**
 * Tạo đơn từ **giỏ chung** cho MỘT seller (checkout theo shop).
 * Khác `createDonFromGio`: đọc từ giỏ chung (không scope post/shop), chỉ lấy
 * dòng thuộc `sellerId`, và sau khi tạo xong chỉ xóa dòng của seller đó khỏi
 * giỏ chung. Tự gửi card đơn (+ biên lai) vào inbox chat 1-1 với seller;
 * UI buyer không bắt buộc mở chat (row chuyển xanh).
 */
export async function createDonChungForSeller(
  buyerId: string,
  input: {
    sellerId: string;
    ghiChu?: string | null;
    maDon?: string | null;
    nguoiMuaChapNhanRuiRo?: boolean;
    bienLaiAnhUrl?: string | null;
    bienLaiAnhId?: string | null;
  },
): Promise<ShopDonHang> {
  const sellerId = input.sellerId?.trim();
  if (!sellerId) throw new Error("CART_SCOPE_REQUIRED");
  if (sellerId === buyerId) throw new Error("CANNOT_BUY_OWN");

  await assertShopNotTamDong(sellerId);

  const gio = await getGioChung(buyerId);
  const nhom = gio.nhom.find((n) => n.idNguoiBan === sellerId);
  if (!nhom || nhom.dong.length === 0) throw new Error("CART_EMPTY");

  if (input.nguoiMuaChapNhanRuiRo !== true) {
    throw new Error("BUYER_ACCEPTANCE_REQUIRED");
  }

  const bienLaiAnhUrl = input.bienLaiAnhUrl?.trim() || null;
  const bienLaiAnhId = input.bienLaiAnhId?.trim() || null;
  /* Bắt buộc đính kèm biên lai chuyển khoản (không nhận URL tạm blob:). */
  if (!bienLaiAnhUrl || bienLaiAnhUrl.startsWith("blob:")) {
    throw new Error("RECEIPT_REQUIRED");
  }

  for (const d of nhom.dong) {
    if (d.ngungBan) throw new Error("ITEM_UNAVAILABLE");
    if (d.soLuongTon <= 0) throw new Error("STOCK_EMPTY");
    if (d.soLuong > d.soLuongTon) throw new Error("STOCK_INSUFFICIENT");
  }

  const admin = createServiceRoleClient();
  const { data: buyer } = await admin
    .from("user_nguoi_dung")
    .select("ten_hien_thi, slug")
    .eq("id", buyerId)
    .maybeSingle<{ ten_hien_thi: string | null; slug: string | null }>();
  const buyerLabel =
    buyer?.ten_hien_thi?.trim() || buyer?.slug?.trim() || "BUYER";

  const buyerPrefix = shopMaDonPrefix(buyerLabel);
  const clientMa =
    typeof input.maDon === "string" && isValidShopMaDon(input.maDon)
      ? normalizeShopMaDon(input.maDon)
      : null;
  let maDon =
    clientMa && clientMa.startsWith(`${buyerPrefix}-`)
      ? clientMa
      : buildShopMaDon(buyerLabel);

  const { payment } = await getShopCheckoutPayment(sellerId);
  if (!payment) throw new Error("PAYMENT_REQUIRED");

  const thanhToanSnapshot = buildThanhToanSnapshot(
    payment,
    maDon,
    nhom.tongTien,
    nhom.tienTe,
  );

  const chapNhan = {
    nguoi_mua_chap_nhan_luc: new Date().toISOString(),
    nguoi_mua_chap_nhan_van_ban: SHOP_BUYER_TRANSFER_DISCLAIMER,
    nguoi_mua_chap_nhan_phien_ban: SHOP_BUYER_TRANSFER_DISCLAIMER_VERSION,
  };

  let don: DonRow | null = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const snapshotForAttempt = { ...thanhToanSnapshot, noiDungCk: maDon };
    const { data, error } = await admin
      .from("shop_don_hang")
      .insert({
        id_nguoi_mua: buyerId,
        id_nguoi_ban: sellerId,
        id_cot_moc: null,
        id_su_kien: null,
        loai_don: "mua_ngay",
        trang_thai: "cho_xac_nhan",
        tien_te: nhom.tienTe,
        tong_tien: nhom.tongTien,
        ghi_chu: input.ghiChu?.trim() || null,
        ma_don: maDon,
        dieu_khoan_snapshot: shopTermsSnapshot(),
        da_tru_kho: false,
        thanh_toan_snapshot: snapshotForAttempt,
        bien_lai_anh_url: bienLaiAnhUrl,
        bien_lai_anh_id: bienLaiAnhId,
        ...chapNhan,
      })
      .select(DON_SELECT)
      .single<DonRow>();
    if (!error && data) {
      don = data;
      break;
    }
    lastError = error;
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code)
        : "";
    if (code !== "23505") break;
    maDon = buildShopMaDon(buyerLabel);
  }
  if (!don) {
    console.error("[shop] createDonChung", lastError);
    throw new Error("CREATE_FAILED");
  }

  const { error: dongErr } = await admin.from("shop_don_hang_dong").insert(
    nhom.dong.map((d) => ({
      id_don_hang: don.id,
      id_bien_the: d.idBienThe,
      ten_snapshot: d.tenSanPham,
      nhan_snapshot: d.nhanBienThe,
      so_luong: d.soLuong,
      gia_don_vi: d.giaHienThi,
    })),
  );
  if (dongErr) {
    console.error("[shop] createDonChungDong", dongErr);
    await admin.from("shop_don_hang").delete().eq("id", don.id);
    throw new Error("CREATE_FAILED");
  }

  /* Trừ kho ngay (atomic). */
  {
    const deducted: Array<{ idBienThe: string; soLuong: number }> = [];
    try {
      for (const d of nhom.dong) {
        const ok = await truKhoBienThe(d.idBienThe, d.soLuong);
        if (!ok) throw new Error("STOCK_INSUFFICIENT");
        deducted.push({ idBienThe: d.idBienThe, soLuong: d.soLuong });
      }
      const { error: flagErr } = await admin
        .from("shop_don_hang")
        .update({ da_tru_kho: true, cap_nhat_luc: new Date().toISOString() })
        .eq("id", don.id);
      if (flagErr) throw new Error("CREATE_FAILED");
    } catch (e) {
      for (const x of deducted.reverse()) {
        await hoanKhoBienThe(x.idBienThe, x.soLuong);
      }
      await admin.from("shop_don_hang").delete().eq("id", don.id);
      if (e instanceof Error && e.message === "STOCK_INSUFFICIENT") throw e;
      console.error("[shop] createDonChungTruKho", e);
      throw new Error("CREATE_FAILED");
    }
  }

  /* Chỉ xóa dòng của seller này khỏi giỏ chung — các shop khác giữ nguyên. */
  await clearGioChungCuaSeller(buyerId, sellerId);

  const fresh = await getDonHang(don.id);
  if (!fresh) throw new Error("CREATE_FAILED");

  /* Inbox seller: tổng hợp đơn + biên lai. Lỗi chat không rollback đơn. */
  await notifySellerDonHangChat(fresh);

  return fresh;
}

async function truKhoBienThe(
  idBienThe: string,
  soLuong: number,
): Promise<boolean> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin.rpc("shop_tru_kho_bien_the", {
    p_id_bien_the: idBienThe,
    p_so_luong: soLuong,
  });
  if (error) {
    console.error("[shop] truKho", error);
    return false;
  }
  return data === true;
}

async function hoanKhoBienThe(
  idBienThe: string,
  soLuong: number,
): Promise<boolean> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin.rpc("shop_hoan_kho_bien_the", {
    p_id_bien_the: idBienThe,
    p_so_luong: soLuong,
  });
  if (error) {
    console.error("[shop] hoanKho", error);
    return false;
  }
  return data === true;
}

async function adjustStock(dongs: ShopDonHangDong[]): Promise<void> {
  const deducted: Array<{ idBienThe: string; soLuong: number }> = [];
  try {
    for (const d of dongs) {
      if (!d.idBienThe) continue;
      const ok = await truKhoBienThe(d.idBienThe, d.soLuong);
      if (!ok) throw new Error("STOCK_INSUFFICIENT");
      deducted.push({ idBienThe: d.idBienThe, soLuong: d.soLuong });
    }
  } catch (e) {
    for (const x of deducted.reverse()) {
      await hoanKhoBienThe(x.idBienThe, x.soLuong);
    }
    throw e;
  }
}

export async function confirmDonHang(
  actorId: string,
  donId: string,
  action: "da_nhan_tien" | "da_giao_tai_su_kien",
): Promise<ShopDonHang> {
  const don = await getDonHang(donId);
  if (!don) throw new Error("NOT_FOUND");
  if (don.idNguoiBan !== actorId) throw new Error("FORBIDDEN");
  if (don.trangThai !== "cho_xac_nhan") throw new Error("INVALID_STATE");

  if (action === "da_giao_tai_su_kien" && don.loaiDon !== "dat_truoc_nhan_su_kien") {
    throw new Error("INVALID_ACTION");
  }

  if (!don.daTruKho) {
    await adjustStock(don.dong);
  }

  const admin = createServiceRoleClient();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("shop_don_hang")
    .update({
      trang_thai: action,
      da_tru_kho: true,
      xac_nhan_luc: now,
      cap_nhat_luc: now,
    })
    .eq("id", donId);
  if (error) throw new Error("UPDATE_FAILED");

  const updated = await getDonHang(donId);
  if (!updated) throw new Error("NOT_FOUND");

  /* Cập nhật card chat sẵn có + đẩy xuống tin mới nhất — không tạo tin trùng. */
  await bumpDonHangChatMessage(updated, actorId);

  return updated;
}

/**
 * Tìm tin `ngu_canh.loai=don_hang` của đơn, cập nhật snapshot + `tao_luc`,
 * chuyển người gửi sang shop để người mua nhận như tin mới (unread).
 */
async function bumpDonHangChatMessage(
  don: ShopDonHang,
  actorId: string,
): Promise<void> {
  const admin = createServiceRoleClient();
  const ctx = donHangToChatContext(don);
  const now = new Date().toISOString();

  const { data: rows, error } = await admin
    .from("chat_tin_nhan")
    .select("id, id_phong, ngu_canh")
    .eq("da_xoa", false)
    .filter("ngu_canh->>loai", "eq", "don_hang")
    .filter("ngu_canh->>id", "eq", don.id)
    .order("tao_luc", { ascending: false })
    .limit(3);

  if (error) {
    console.error("[shop] bumpDonHangChat find", error);
    return;
  }
  const msg = rows?.[0] as
    | { id: string; id_phong: string; ngu_canh: unknown }
    | undefined;
  if (!msg) {
    /* Chưa có card (đơn cũ / chat lỗi lúc tạo) — tạo mới từ phía seller. */
    await notifySellerDonHangChat(don, { asSenderId: actorId });
    return;
  }

  const prev =
    msg.ngu_canh && typeof msg.ngu_canh === "object"
      ? (msg.ngu_canh as Record<string, unknown>)
      : null;
  const nextNguCanh: Record<string, unknown> = { ...ctx };
  if (prev && Array.isArray(prev.mentions)) {
    nextNguCanh.mentions = prev.mentions;
  }

  const { error: updErr } = await admin
    .from("chat_tin_nhan")
    .update({
      ngu_canh: nextNguCanh,
      tao_luc: now,
      id_nguoi_gui: actorId,
      noi_dung: SHOP_TRANG_THAI_DON_LABEL[don.trangThai],
    })
    .eq("id", msg.id);
  if (updErr) {
    console.error("[shop] bumpDonHangChat update", updErr);
    return;
  }

  await admin
    .from("chat_phong")
    .update({ cap_nhat_luc: now })
    .eq("id", msg.id_phong);
}

/**
 * Mở DM buyer↔seller và gửi card đơn đã tổng hợp (+ ảnh biên lai nếu có).
 * Không throw — lỗi chat chỉ log.
 */
export async function notifySellerDonHangChat(
  don: ShopDonHang,
  opts?: { asSenderId?: string },
): Promise<void> {
  const senderId = opts?.asSenderId?.trim() || don.idNguoiMua;
  const peerId =
    senderId === don.idNguoiMua ? don.idNguoiBan : don.idNguoiMua;
  if (!senderId || !peerId || senderId === peerId) return;

  try {
    const opened = await openDirectRoom(senderId, peerId);
    if (!opened.ok) {
      console.error("[shop] notifyDonHangChat open", opened.error);
      return;
    }
    const roomId = opened.thread.roomId;
    if (!roomId) return;

    const ctx = donHangToChatContext(don);
    const card = await sendRoomMessage(roomId, senderId, {
      body: ctx.tieuDe,
      nguCanh: ctx,
    });
    if (!card.ok) {
      console.error("[shop] notifyDonHangChat card", card.error);
      return;
    }

    const imageId = don.bienLaiAnhId?.trim();
    if (imageId) {
      const media = await sendRoomMessage(roomId, senderId, {
        cloudflareImageId: imageId,
        body: "Biên lai chuyển khoản",
      });
      if (!media.ok) {
        console.error("[shop] notifyDonHangChat bienLai", media.error);
      }
    }
  } catch (e) {
    console.error("[shop] notifyDonHangChat", e);
  }
}

export function donHangToChatContext(don: ShopDonHang): {
  loai: "don_hang";
  id: string;
  tieuDe: string;
  moTa: string;
  href: string;
} {
  const ma = don.maDon?.trim() || don.id.slice(0, 8);
  const loaiLabel =
    don.loaiDon === "mua_ngay" ? "Đã thanh toán" : "Thanh toán sau";
  const trangThaiLabel = SHOP_TRANG_THAI_DON_LABEL[don.trangThai];
  const lines = don.dong
    .map((d) => {
      const nhan =
        d.nhanSnapshot?.trim() && d.nhanSnapshot.trim() !== "Mặc định"
          ? ` (${d.nhanSnapshot.trim()})`
          : "";
      return `• ${d.tenSnapshot}${nhan} ×${d.soLuong} — ${d.giaDonVi.toLocaleString("vi-VN")} ${don.tienTe}`;
    })
    .join("\n");
  const tong = `${don.tongTien.toLocaleString("vi-VN")} ${don.tienTe}`;
  const ghiChu = (don.ghiChu ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("Hóa đơn thanh toán:"))
    .join(" ")
    .trim();
  const parts = [
    loaiLabel,
    `Tình trạng: ${trangThaiLabel}`,
    `Tổng: ${tong}`,
    lines,
  ];
  if (ghiChu) parts.push(`Ghi chú: ${ghiChu}`);
  return {
    loai: "don_hang",
    id: don.id,
    tieuDe: `Đơn ${ma}`,
    moTa: parts.filter(Boolean).join("\n"),
    href: `/ban-hang/don?id=${don.id}`,
  };
}
