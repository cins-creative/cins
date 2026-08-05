import "server-only";

import { getCinsTaiChinh } from "@/lib/cins/tai-chinh-config";
import {
  roundVnd,
  ymdVnFromIso,
} from "@/lib/co-so/phi-config";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type OrgPhiDong = {
  id: string;
  idToChuc: string;
  idDonHocPhi: string | null;
  idKy: string | null;
  doanhThuVnd: number;
  tyLe: number;
  phiVnd: number;
  loaiTru: boolean;
  xacNhanLuc: string;
};

/**
 * Kỳ đang mở để gắn dòng phí mới (sau khi đã kích hoạt).
 * Ưu tiên kỳ bao phủ ngày xác nhận; không có → kỳ chua_tra/qua_han mới nhất.
 * Trước kích hoạt / chưa có kỳ → null (tích lũy id_ky IS NULL).
 */
async function findKyDangMo(
  orgId: string,
  xacNhanYmd: string,
): Promise<string | null> {
  const admin = createServiceRoleClient();
  const { data: activated } = await admin
    .from("org_phi_ky")
    .select("id")
    .eq("id_to_chuc", orgId)
    .eq("loai_ky", "kich_hoat")
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (!activated) return null;

  const { data: covering } = await admin
    .from("org_phi_ky")
    .select("id")
    .eq("id_to_chuc", orgId)
    .lte("tu_ngay", xacNhanYmd)
    .gte("den_ngay", xacNhanYmd)
    .in("trang_thai", ["chua_tra", "qua_han", "mien"])
    .order("ngay_chot", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (covering?.id) return covering.id;

  const { data: open } = await admin
    .from("org_phi_ky")
    .select("id")
    .eq("id_to_chuc", orgId)
    .in("trang_thai", ["chua_tra", "qua_han"])
    .order("ngay_chot", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();
  return open?.id ?? null;
}

/**
 * Ghi snapshot phí khi đơn HP → `da_nhan_tien`.
 * Idempotent theo `id_don_hoc_phi` (unique partial). Không throw — log nếu lỗi.
 */
export async function ghiPhiDongKhiXacNhanDon(input: {
  donId: string;
  orgId: string;
  doanhThuVnd: number;
  xacNhanLuc: string;
}): Promise<{ ok: true; created: boolean } | { ok: false; error: string }> {
  const doanhThu = roundVnd(input.doanhThuVnd);
  if (doanhThu <= 0) {
    return { ok: true, created: false };
  }

  try {
    const cfg = await getCinsTaiChinh();
    const tyLe = cfg.csdt.tyLe;
    const phi = roundVnd(doanhThu * tyLe);
    const admin = createServiceRoleClient();
    const xacNhanYmd = ymdVnFromIso(input.xacNhanLuc);
    const idKy = await findKyDangMo(input.orgId, xacNhanYmd);

    const { data: existing } = await admin
      .from("org_phi_dong")
      .select("id")
      .eq("id_don_hoc_phi", input.donId)
      .maybeSingle<{ id: string }>();
    if (existing?.id) {
      return { ok: true, created: false };
    }

    const { error } = await admin.from("org_phi_dong").insert({
      id_to_chuc: input.orgId,
      id_don_hoc_phi: input.donId,
      id_ky: idKy,
      doanh_thu_vnd: doanhThu,
      ty_le: tyLe,
      phi_vnd: phi,
      loai_tru: false,
      xac_nhan_luc: input.xacNhanLuc,
    });

    if (error) {
      /* 23505 = race: tiến trình khác đã ghi — coi như idempotent ok */
      if (error.code === "23505") {
        return { ok: true, created: false };
      }
      console.error("[csdt-phi] ghiPhiDong", error.message, {
        donId: input.donId,
        orgId: input.orgId,
      });
      return { ok: false, error: error.message };
    }

    if (idKy) await recalcKy(idKy);

    /* Lazy kích hoạt khi vừa vượt ngưỡng (không chờ mở trang Phí). */
    try {
      const { ensureKyKichHoat } = await import("@/lib/co-so/phi-ky");
      await ensureKyKichHoat(input.orgId);
    } catch (e) {
      console.error("[csdt-phi] ensureKyKichHoat after ghiDong", e);
    }

    return { ok: true, created: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[csdt-phi] ghiPhiDong exception", msg, {
      donId: input.donId,
    });
    return { ok: false, error: msg };
  }
}

/**
 * Đánh dấu loại trừ dòng phí (đơn huỷ sau khi đã nhận tiền).
 * Kỳ chưa `da_tra` → recalcKy. Kỳ đã trả → credit âm vào `dieu_chinh_vnd` kỳ đang mở.
 */
export async function loaiTruPhiDong(
  donId: string,
  lyDo: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { data: dong, error } = await admin
    .from("org_phi_dong")
    .update({
      loai_tru: true,
      ly_do_loai_tru: lyDo.trim().slice(0, 500) || "Loại trừ",
    })
    .eq("id_don_hoc_phi", donId)
    .eq("loai_tru", false)
    .select("id, id_to_chuc, id_ky, phi_vnd")
    .maybeSingle<{
      id: string;
      id_to_chuc: string;
      id_ky: string | null;
      phi_vnd: number | string;
    }>();

  if (error) {
    console.error("[csdt-phi] loaiTruPhiDong", error.message);
    return { ok: false, error: error.message };
  }
  if (!dong) return { ok: true };

  const phiVnd = Number(dong.phi_vnd) || 0;

  if (!dong.id_ky) {
    return { ok: true };
  }

  const { data: ky } = await admin
    .from("org_phi_ky")
    .select("id, trang_thai, dieu_chinh_vnd, ghi_chu")
    .eq("id", dong.id_ky)
    .maybeSingle<{
      id: string;
      trang_thai: string;
      dieu_chinh_vnd: number | string;
      ghi_chu: string | null;
    }>();

  if (!ky) return { ok: true };

  if (ky.trang_thai !== "da_tra") {
    await recalcKy(ky.id);
    return { ok: true };
  }

  /* Kỳ đã trả — không sửa kỳ cũ; credit âm vào kỳ đang mở (hoặc tạo ghi chú chờ A-3). */
  const credit = -Math.abs(roundVnd(phiVnd));
  const openId = await findKyDangMo(dong.id_to_chuc, ymdVnFromIso(new Date().toISOString()));
  if (openId && openId !== ky.id) {
    const { data: openKy } = await admin
      .from("org_phi_ky")
      .select("dieu_chinh_vnd, ghi_chu")
      .eq("id", openId)
      .maybeSingle<{ dieu_chinh_vnd: number | string; ghi_chu: string | null }>();
    const prev = Number(openKy?.dieu_chinh_vnd) || 0;
    const note = [
      openKy?.ghi_chu?.trim() || "",
      `Credit −${Math.abs(credit)}₫ từ huỷ đơn ${donId.slice(0, 8)} (kỳ đã trả ${ky.id.slice(0, 8)})`,
    ]
      .filter(Boolean)
      .join(" · ")
      .slice(0, 1000);
    await admin
      .from("org_phi_ky")
      .update({
        dieu_chinh_vnd: prev + credit,
        ghi_chu: note,
        cap_nhat_luc: new Date().toISOString(),
      })
      .eq("id", openId);
  } else {
    /* Chưa có kỳ mở — ghi chú trên dòng đã loại trừ (credit sẽ áp khi A-3 tạo kỳ). */
    console.warn(
      "[csdt-phi] loaiTru: kỳ đã trả nhưng chưa có kỳ mở để credit",
      { donId, kyId: ky.id, credit },
    );
  }

  return { ok: true };
}

/** SUM phi_vnd chưa vào kỳ, chưa loại trừ. */
export async function tinhPhiLuyKeChuaVaoKy(orgId: string): Promise<number> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_phi_dong")
    .select("phi_vnd")
    .eq("id_to_chuc", orgId)
    .is("id_ky", null)
    .eq("loai_tru", false);
  if (error) {
    console.error("[csdt-phi] tinhPhiLuyKe", error.message);
    return 0;
  }
  let sum = 0;
  for (const row of (data ?? []) as Array<{ phi_vnd: number | string }>) {
    sum += Number(row.phi_vnd) || 0;
  }
  return roundVnd(sum);
}

/** Cộng lại doanh thu + phí phải trả từ các dòng còn hiệu lực của kỳ. */
export async function recalcKy(kyId: string): Promise<void> {
  const admin = createServiceRoleClient();
  const { data: dongs } = await admin
    .from("org_phi_dong")
    .select("doanh_thu_vnd, phi_vnd, loai_tru, ty_le")
    .eq("id_ky", kyId);

  let doanhThu = 0;
  let phi = 0;
  let tyLeSum = 0;
  let n = 0;
  for (const d of (dongs ?? []) as Array<{
    doanh_thu_vnd: number | string;
    phi_vnd: number | string;
    loai_tru: boolean;
    ty_le: number | string;
  }>) {
    if (d.loai_tru) continue;
    doanhThu += Number(d.doanh_thu_vnd) || 0;
    phi += Number(d.phi_vnd) || 0;
    tyLeSum += Number(d.ty_le) || 0;
    n += 1;
  }

  const patch: Record<string, unknown> = {
    doanh_thu_ghi_nhan_vnd: roundVnd(doanhThu),
    phi_phai_tra_vnd: roundVnd(phi),
    cap_nhat_luc: new Date().toISOString(),
  };
  if (n > 0) {
    patch.ty_le = Number((tyLeSum / n).toFixed(4));
  }

  /* phi = 0 sau loại trừ → mien (nếu chưa trả) */
  const { data: ky } = await admin
    .from("org_phi_ky")
    .select("trang_thai, dieu_chinh_vnd, da_tra_vnd")
    .eq("id", kyId)
    .maybeSingle<{
      trang_thai: string;
      dieu_chinh_vnd: number | string;
      da_tra_vnd: number | string;
    }>();

  if (ky && ky.trang_thai !== "da_tra") {
    const phaiTra = Math.max(
      0,
      roundVnd(phi) + (Number(ky.dieu_chinh_vnd) || 0),
    );
    if (phaiTra <= 0) {
      patch.trang_thai = "mien";
    } else if (ky.trang_thai === "mien") {
      patch.trang_thai = "chua_tra";
    }
  }

  await admin.from("org_phi_ky").update(patch).eq("id", kyId);
}
