import "server-only";

import { insertSocialThongBao } from "@/lib/social/thong-bao-insert";
import { applyShopGateFromSignals } from "@/lib/shop/gate";
import { loaiTruPhiDong } from "@/lib/shop/phi";
import { getDonHang } from "@/lib/shop/don-hang";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const SHOP_KHIEU_NAI_MOI_LOAI = "shop_khieu_nai_moi" as const;
export const SHOP_KHIEU_NAI_PHAN_XU_LOAI = "shop_khieu_nai_phan_xu" as const;

export type ShopLyDoKhieuNai =
  | "chua_giao"
  | "huy_khong_hoan"
  | "hang_sai"
  | "hang_loi"
  | "khac";

export type ShopTrangThaiKhieuNai =
  | "mo"
  | "cho_phan_hoi"
  | "dang_xu_ly"
  | "da_phan_xu"
  | "dong";

export type ShopKhieuNaiBangChung = {
  id: string;
  idNguoiGui: string;
  loai: string;
  anhId: string | null;
  anhUrl: string | null;
  ghiChu: string | null;
  taoLuc: string;
};

export type ShopKhieuNai = {
  id: string;
  idDonHang: string;
  idNguoiMua: string;
  idNguoiBan: string;
  lyDo: ShopLyDoKhieuNai;
  moTa: string | null;
  trangThai: ShopTrangThaiKhieuNai;
  phanQuyet: string | null;
  phanQuyetNghiengVe: "nguoi_mua" | "nguoi_ban" | "khong_ket_luan" | null;
  phanQuyetLuc: string | null;
  hanPhanHoi: string | null;
  taoLuc: string;
  bangChung: ShopKhieuNaiBangChung[];
  maDon?: string | null;
};

const LY_DO: ReadonlySet<string> = new Set([
  "chua_giao",
  "huy_khong_hoan",
  "hang_sai",
  "hang_loi",
  "khac",
]);

type KnRow = {
  id: string;
  id_don_hang: string;
  id_nguoi_mua: string;
  id_nguoi_ban: string;
  ly_do: ShopLyDoKhieuNai;
  mo_ta: string | null;
  trang_thai: ShopTrangThaiKhieuNai;
  phan_quyet: string | null;
  phan_quyet_nghieng_ve: string | null;
  phan_quyet_luc: string | null;
  han_phan_hoi: string | null;
  tao_luc: string;
};

const KN_SELECT =
  "id, id_don_hang, id_nguoi_mua, id_nguoi_ban, ly_do, mo_ta, trang_thai, phan_quyet, phan_quyet_nghieng_ve, phan_quyet_luc, han_phan_hoi, tao_luc";

function mapNghieng(
  v: string | null,
): ShopKhieuNai["phanQuyetNghiengVe"] {
  if (v === "nguoi_mua" || v === "nguoi_ban" || v === "khong_ket_luan") {
    return v;
  }
  return null;
}

async function attachBangChung(
  rows: KnRow[],
): Promise<ShopKhieuNai[]> {
  if (rows.length === 0) return [];
  const admin = createServiceRoleClient();
  const ids = rows.map((r) => r.id);
  const { data: bc } = await admin
    .from("shop_khieu_nai_bang_chung")
    .select("id, id_khieu_nai, id_nguoi_gui, loai, anh_id, anh_url, ghi_chu, tao_luc")
    .in("id_khieu_nai", ids)
    .order("tao_luc", { ascending: true });

  const byKn = new Map<string, ShopKhieuNaiBangChung[]>();
  for (const b of (bc ?? []) as Array<{
    id: string;
    id_khieu_nai: string;
    id_nguoi_gui: string;
    loai: string;
    anh_id: string | null;
    anh_url: string | null;
    ghi_chu: string | null;
    tao_luc: string;
  }>) {
    const list = byKn.get(b.id_khieu_nai) ?? [];
    list.push({
      id: b.id,
      idNguoiGui: b.id_nguoi_gui,
      loai: b.loai,
      anhId: b.anh_id,
      anhUrl: b.anh_url,
      ghiChu: b.ghi_chu,
      taoLuc: b.tao_luc,
    });
    byKn.set(b.id_khieu_nai, list);
  }

  const donIds = [...new Set(rows.map((r) => r.id_don_hang))];
  const { data: dons } = await admin
    .from("shop_don_hang")
    .select("id, ma_don")
    .in("id", donIds);
  const maByDon = new Map(
    ((dons ?? []) as Array<{ id: string; ma_don: string | null }>).map((d) => [
      d.id,
      d.ma_don,
    ]),
  );

  return rows.map((r) => ({
    id: r.id,
    idDonHang: r.id_don_hang,
    idNguoiMua: r.id_nguoi_mua,
    idNguoiBan: r.id_nguoi_ban,
    lyDo: r.ly_do,
    moTa: r.mo_ta,
    trangThai: r.trang_thai,
    phanQuyet: r.phan_quyet,
    phanQuyetNghiengVe: mapNghieng(r.phan_quyet_nghieng_ve),
    phanQuyetLuc: r.phan_quyet_luc,
    hanPhanHoi: r.han_phan_hoi,
    taoLuc: r.tao_luc,
    bangChung: byKn.get(r.id) ?? [],
    maDon: maByDon.get(r.id_don_hang) ?? null,
  }));
}

export async function getKhieuNai(id: string): Promise<ShopKhieuNai | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("shop_khieu_nai")
    .select(KN_SELECT)
    .eq("id", id)
    .maybeSingle<KnRow>();
  if (!data) return null;
  const [mapped] = await attachBangChung([data]);
  return mapped ?? null;
}

export async function listKhieuNaiForUser(
  userId: string,
  role: "buyer" | "seller" | "either" = "either",
  limit = 40,
): Promise<ShopKhieuNai[]> {
  const admin = createServiceRoleClient();
  let q = admin.from("shop_khieu_nai").select(KN_SELECT);
  if (role === "buyer") q = q.eq("id_nguoi_mua", userId);
  else if (role === "seller") q = q.eq("id_nguoi_ban", userId);
  else q = q.or(`id_nguoi_mua.eq.${userId},id_nguoi_ban.eq.${userId}`);
  const { data, error } = await q
    .order("tao_luc", { ascending: false })
    .limit(Math.min(limit, 100));
  if (error) {
    console.error("[shop] listKhieuNai", error);
    throw new Error("LIST_FAILED");
  }
  return attachBangChung((data ?? []) as KnRow[]);
}

export async function listKhieuNaiChoAdmin(
  limit = 50,
): Promise<ShopKhieuNai[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("shop_khieu_nai")
    .select(KN_SELECT)
    .in("trang_thai", ["mo", "cho_phan_hoi", "dang_xu_ly"])
    .order("tao_luc", { ascending: true })
    .limit(limit);
  if (error) throw new Error("LIST_FAILED");
  return attachBangChung((data ?? []) as KnRow[]);
}

export async function listKhieuNaiTheoDon(
  actorId: string,
  donId: string,
): Promise<ShopKhieuNai[]> {
  const don = await getDonHang(donId);
  if (!don) throw new Error("NOT_FOUND");
  if (don.idNguoiMua !== actorId && don.idNguoiBan !== actorId) {
    throw new Error("FORBIDDEN");
  }
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("shop_khieu_nai")
    .select(KN_SELECT)
    .eq("id_don_hang", donId)
    .order("tao_luc", { ascending: false });
  return attachBangChung((data ?? []) as KnRow[]);
}

/** Buyer mở khiếu nại (đơn đã nhận tiền / hoàn thành / hủy có lý do). */
export async function moKhieuNai(
  buyerId: string,
  input: {
    idDonHang: string;
    lyDo: string;
    moTa?: string | null;
    anhUrl?: string | null;
    anhId?: string | null;
  },
): Promise<ShopKhieuNai> {
  const don = await getDonHang(input.idDonHang);
  if (!don) throw new Error("NOT_FOUND");
  if (don.idNguoiMua !== buyerId) throw new Error("FORBIDDEN");
  if (
    don.trangThai !== "da_nhan_tien" &&
    don.trangThai !== "hoan_thanh" &&
    don.trangThai !== "huy" &&
    don.trangThai !== "da_giao_tai_su_kien"
  ) {
    throw new Error("INVALID_STATE");
  }
  if (!LY_DO.has(input.lyDo)) throw new Error("LY_DO_INVALID");

  const admin = createServiceRoleClient();
  const { count } = await admin
    .from("shop_khieu_nai")
    .select("id", { count: "exact", head: true })
    .eq("id_don_hang", don.id)
    .in("trang_thai", ["mo", "cho_phan_hoi", "dang_xu_ly", "da_phan_xu"]);
  if ((count ?? 0) > 0) throw new Error("ALREADY_OPEN");

  const han = new Date(Date.now() + 72 * 3600_000).toISOString();
  const { data, error } = await admin
    .from("shop_khieu_nai")
    .insert({
      id_don_hang: don.id,
      id_nguoi_mua: don.idNguoiMua,
      id_nguoi_ban: don.idNguoiBan,
      ly_do: input.lyDo,
      mo_ta: input.moTa?.trim().slice(0, 2000) || null,
      trang_thai: "cho_phan_hoi",
      han_phan_hoi: han,
    })
    .select(KN_SELECT)
    .single<KnRow>();
  if (error || !data) {
    console.error("[shop] moKhieuNai", error);
    throw new Error("CREATE_FAILED");
  }

  const anhUrl = input.anhUrl?.trim();
  if (anhUrl && !anhUrl.startsWith("blob:")) {
    await admin.from("shop_khieu_nai_bang_chung").insert({
      id_khieu_nai: data.id,
      id_nguoi_gui: buyerId,
      loai: "anh",
      anh_url: anhUrl,
      anh_id: input.anhId?.trim() || null,
    });
  }

  await insertSocialThongBao(admin, {
    nguoi_nhan: don.idNguoiBan,
    loai: "thong_tin",
    loai_doi_tuong: SHOP_KHIEU_NAI_MOI_LOAI,
    id_doi_tuong: data.id,
    noi_dung: `Khiếu nại mới trên đơn ${don.maDon ?? don.id.slice(0, 8)}.`,
  });

  await applyShopGateFromSignals(don.idNguoiBan);

  const [mapped] = await attachBangChung([data]);
  if (!mapped) throw new Error("CREATE_FAILED");
  return mapped;
}

/** Seller / buyer bổ sung bằng chứng hoặc ghi chú phản hồi. */
export async function themBangChungKhieuNai(
  actorId: string,
  knId: string,
  input: {
    anhUrl?: string | null;
    anhId?: string | null;
    ghiChu?: string | null;
  },
): Promise<ShopKhieuNai> {
  const kn = await getKhieuNai(knId);
  if (!kn) throw new Error("NOT_FOUND");
  if (kn.idNguoiMua !== actorId && kn.idNguoiBan !== actorId) {
    throw new Error("FORBIDDEN");
  }
  if (kn.trangThai === "dong") throw new Error("INVALID_STATE");

  const anhUrl = input.anhUrl?.trim() || null;
  const ghiChu = input.ghiChu?.trim().slice(0, 1000) || null;
  if (!anhUrl && !ghiChu) throw new Error("EVIDENCE_REQUIRED");
  if (anhUrl?.startsWith("blob:")) throw new Error("EVIDENCE_REQUIRED");

  const admin = createServiceRoleClient();
  await admin.from("shop_khieu_nai_bang_chung").insert({
    id_khieu_nai: knId,
    id_nguoi_gui: actorId,
    loai: anhUrl ? "anh" : "ghi_chu",
    anh_url: anhUrl,
    anh_id: input.anhId?.trim() || null,
    ghi_chu: ghiChu,
  });

  /* Seller phản hồi lần đầu → dang_xu_ly. */
  if (
    actorId === kn.idNguoiBan &&
    (kn.trangThai === "mo" || kn.trangThai === "cho_phan_hoi")
  ) {
    await admin
      .from("shop_khieu_nai")
      .update({
        trang_thai: "dang_xu_ly",
        cap_nhat_luc: new Date().toISOString(),
      })
      .eq("id", knId);
  }

  const fresh = await getKhieuNai(knId);
  if (!fresh) throw new Error("NOT_FOUND");
  return fresh;
}

/** Admin phán xử — không hoàn tiền; có thể loại trừ phí GMV. */
export async function adminPhanXuKhieuNai(
  adminId: string,
  knId: string,
  input: {
    nghiengVe: "nguoi_mua" | "nguoi_ban" | "khong_ket_luan";
    phanQuyet: string;
    dong?: boolean;
  },
): Promise<ShopKhieuNai> {
  const kn = await getKhieuNai(knId);
  if (!kn) throw new Error("NOT_FOUND");
  if (kn.trangThai === "dong") throw new Error("INVALID_STATE");

  const text = input.phanQuyet.trim().slice(0, 4000);
  if (text.length < 4) throw new Error("PHAN_QUYET_REQUIRED");

  const admin = createServiceRoleClient();
  const now = new Date().toISOString();
  const nextStatus: ShopTrangThaiKhieuNai = input.dong === false
    ? "da_phan_xu"
    : "dong";

  const { data, error } = await admin
    .from("shop_khieu_nai")
    .update({
      trang_thai: nextStatus,
      phan_quyet: text,
      phan_quyet_nghieng_ve: input.nghiengVe,
      phan_quyet_boi: adminId,
      phan_quyet_luc: now,
      cap_nhat_luc: now,
    })
    .eq("id", knId)
    .select(KN_SELECT)
    .maybeSingle<KnRow>();
  if (error || !data) throw new Error("UPDATE_FAILED");

  if (input.nghiengVe === "nguoi_mua") {
    await loaiTruPhiDong(
      kn.idDonHang,
      `Thua tranh chấp ${knId}: ${text.slice(0, 200)}`,
    );
  }

  for (const uid of [kn.idNguoiMua, kn.idNguoiBan]) {
    await insertSocialThongBao(admin, {
      nguoi_nhan: uid,
      loai: "thong_tin",
      loai_doi_tuong: SHOP_KHIEU_NAI_PHAN_XU_LOAI,
      id_doi_tuong: knId,
      noi_dung: `Khiếu nại đã được phán xử (${input.nghiengVe}). CINs không hoàn tiền — hai bên tự dàn xếp nếu cần.`,
    });
  }

  await applyShopGateFromSignals(kn.idNguoiBan);

  const [mapped] = await attachBangChung([data]);
  if (!mapped) throw new Error("UPDATE_FAILED");
  return mapped;
}

export const SHOP_LY_DO_KHIEU_NAI_LABEL: Record<ShopLyDoKhieuNai, string> = {
  chua_giao: "Chưa nhận hàng",
  huy_khong_hoan: "Hủy / không hoàn tiền",
  hang_sai: "Hàng sai mô tả",
  hang_loi: "Hàng lỗi",
  khac: "Khác",
};
