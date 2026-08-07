import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

import { conNoHoaDon } from "./hoa-don-ma";
import { getHoaDonByMa, mapHoaDonDb, type CinsHoaDonRow } from "./hoa-don";

type HdDb = Parameters<typeof mapHoaDonDb>[0];

const HD_SELECT =
  "id, id_tk, id_dich_vu, tu_ngay, den_ngay, ngay_chot, thong_bao_luc, han_tra, so_tien_vnd, dieu_chinh_vnd, da_tra_vnd, trang_thai, ma_tham_chieu, tu_khai_da_tra_luc, tu_khai_lan, tu_khai_boi, nguon_bang, nguon_id";

function maskTk(raw: string | null | undefined): string | null {
  const s = (raw ?? "").replace(/\s+/g, "").trim();
  if (!s) return null;
  if (s.length <= 4) return `****${s}`;
  return `****${s.slice(-4)}`;
}

/**
 * Phân bổ số tiền vào các hoá đơn nợ của tk, ưu tiên hạn gần / quá hạn.
 * Trả về số còn lại chưa phân bổ.
 */
export async function phanBoVaoHoaDonNo(input: {
  idTk: string;
  idThanhToan: string;
  soTienVnd: number;
  /** Nếu có — ưu tiên hoá đơn khớp mã trước. */
  uuTienHoaDonId?: string | null;
}): Promise<{ daPhanBo: number; conLai: number; hoaDonIds: string[] }> {
  const admin = createServiceRoleClient();
  let conLai = Math.max(0, Math.round(input.soTienVnd));
  const hoaDonIds: string[] = [];
  if (conLai <= 0) return { daPhanBo: 0, conLai: 0, hoaDonIds };

  const { data: rows } = await admin
    .from("cins_hoa_don")
    .select(HD_SELECT)
    .eq("id_tk", input.idTk)
    .in("trang_thai", ["chua_tra", "qua_han"])
    .order("han_tra", { ascending: true });

  let list = ((rows ?? []) as HdDb[]).map(mapHoaDonDb);
  if (input.uuTienHoaDonId) {
    const idx = list.findIndex((h) => h.id === input.uuTienHoaDonId);
    if (idx > 0) {
      const [u] = list.splice(idx, 1);
      list = [u, ...list];
    }
  }

  for (const hd of list) {
    if (conLai <= 0) break;
    const no = conNoHoaDon(hd);
    if (no <= 0) continue;
    const apply = Math.min(conLai, no);
    const newDaTra = hd.daTraVnd + apply;
    const phai = Math.max(0, hd.soTienVnd + Math.round(hd.dieuChinhVnd));
    const done = newDaTra >= phai;
    const { error } = await admin
      .from("cins_hoa_don")
      .update({
        da_tra_vnd: newDaTra,
        trang_thai: done ? "da_tra" : hd.trangThai,
        cap_nhat_luc: new Date().toISOString(),
      })
      .eq("id", hd.id);
    if (error) {
      console.error("[billing] phanBo update hd", error.message);
      continue;
    }
    await admin.from("cins_phan_bo").insert({
      id_thanh_toan: input.idThanhToan,
      id_hoa_don: hd.id,
      so_tien_vnd: apply,
    });
    /* Dual-write legacy org_phi_ky */
    if (hd.nguonBang === "org_phi_ky" && hd.nguonId) {
    const patch: Record<string, unknown> = {
      da_tra_vnd: newDaTra,
      cap_nhat_luc: new Date().toISOString(),
    };
    if (done) patch.trang_thai = "da_tra";
    await admin.from("org_phi_ky").update(patch).eq("id", hd.nguonId);
    }
    if (hd.nguonBang === "shop_phi_ky" && hd.nguonId && done) {
      await admin
        .from("shop_phi_ky")
        .update({
          trang_thai: "da_tra",
          xac_nhan_luc: new Date().toISOString(),
          cap_nhat_luc: new Date().toISOString(),
        })
        .eq("id", hd.nguonId);
    }
    hoaDonIds.push(hd.id);
    conLai -= apply;
  }

  await admin
    .from("cins_thanh_toan")
    .update({ con_lai_vnd: conLai })
    .eq("id", input.idThanhToan);

  return {
    daPhanBo: Math.max(0, Math.round(input.soTienVnd) - conLai),
    conLai,
    hoaDonIds,
  };
}

/** Ghi thanh toán Sepay + phân bổ theo mã CK (cins_hoa_don trước). */
export async function ghiThanhToanSepayVaPhanBo(input: {
  sepayId: string;
  soTienVnd: number;
  noiDung: string | null;
  taiKhoanNguon: string | null;
  nhanLuc: string;
  maThamChieu: string | null;
}): Promise<{
  ok: true;
  duplicate?: boolean;
  matched: boolean;
  idThanhToan: string;
  hoaDonId: string | null;
}> {
  const admin = createServiceRoleClient();
  const { data: dup } = await admin
    .from("cins_thanh_toan")
    .select("id")
    .eq("sepay_id", input.sepayId)
    .maybeSingle<{ id: string }>();
  if (dup?.id) {
    /* Retry Sepay / poll — gửi lại biên nhận an toàn (Idempotency-Key). */
    const { voidGuiBienNhanThanhToan } = await import("./bien-nhan");
    voidGuiBienNhanThanhToan(dup.id);
    return {
      ok: true,
      duplicate: true,
      matched: false,
      idThanhToan: dup.id,
      hoaDonId: null,
    };
  }

  let hd: CinsHoaDonRow | null = null;
  if (input.maThamChieu) {
    hd = await getHoaDonByMa(input.maThamChieu);
  }

  const { data: tt, error } = await admin
    .from("cins_thanh_toan")
    .insert({
      id_tk: hd?.idTk ?? null,
      nguon: "sepay",
      sepay_id: input.sepayId,
      so_tien_vnd: Math.round(input.soTienVnd),
      con_lai_vnd: Math.round(input.soTienVnd),
      noi_dung: input.noiDung,
      tai_khoan_nguon: maskTk(input.taiKhoanNguon),
      nhan_luc: input.nhanLuc,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !tt) {
    if (error?.code === "23505") {
      return {
        ok: true,
        duplicate: true,
        matched: false,
        idThanhToan: "",
        hoaDonId: null,
      };
    }
    throw new Error(error?.message ?? "INSERT_TT_FAILED");
  }

  if (!hd) {
    return {
      ok: true,
      matched: false,
      idThanhToan: tt.id,
      hoaDonId: null,
    };
  }

  const pb = await phanBoVaoHoaDonNo({
    idTk: hd.idTk,
    idThanhToan: tt.id,
    soTienVnd: input.soTienVnd,
    uuTienHoaDonId: hd.id,
  });

  /* Biên nhận email — fire-and-forget, không được làm webhook 500. */
  if (pb.hoaDonIds.length > 0) {
    const { voidGuiBienNhanThanhToan } = await import("./bien-nhan");
    voidGuiBienNhanThanhToan(tt.id);
  }

  return {
    ok: true,
    matched: true,
    idThanhToan: tt.id,
    hoaDonId: hd.id,
  };
}
