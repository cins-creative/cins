import "server-only";

import {
  capNhatTrangThaiKy,
  ensureKyKichHoat,
  ensureKyThang,
  type OrgPhiKyRow,
} from "@/lib/co-so/phi-ky";
import { tienPhaiTra } from "@/lib/co-so/phi-config";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { insertSocialThongBao } from "@/lib/social/thong-bao-insert";

export const CSDT_PHI_DEN_HAN_LOAI = "csdt_phi_den_han" as const;
export const CSDT_PHI_QUA_HAN_LOAI = "csdt_phi_qua_han" as const;

export type ChotKyPhiCsdtResult = {
  orgXuLy: number;
  kyKichHoatMoi: number;
  kyThangMoi: number;
  notiDenHan: number;
  notiQuaHan: number;
};

function fmtYmdVi(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${d}/${m}/${y}`;
}

async function listOrgIdsCanXuLyPhi(): Promise<string[]> {
  const admin = createServiceRoleClient();
  const [{ data: dong }, { data: ky }] = await Promise.all([
    admin.from("org_phi_dong").select("id_to_chuc"),
    admin.from("org_phi_ky").select("id_to_chuc"),
  ]);

  const ids = new Set<string>();
  for (const r of (dong ?? []) as Array<{ id_to_chuc: string }>) {
    if (r.id_to_chuc) ids.add(r.id_to_chuc);
  }
  for (const r of (ky ?? []) as Array<{ id_to_chuc: string }>) {
    if (r.id_to_chuc) ids.add(r.id_to_chuc);
  }
  return [...ids];
}

async function notifyFounders(
  orgId: string,
  ky: OrgPhiKyRow,
  loai: typeof CSDT_PHI_DEN_HAN_LOAI | typeof CSDT_PHI_QUA_HAN_LOAI,
  noiDung: string,
): Promise<number> {
  const admin = createServiceRoleClient();
  const { data: founders } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id_nguoi_dung")
    .eq("id_to_chuc", orgId)
    .in("vai_tro", ["owner", "admin"]);

  let n = 0;
  for (const row of (founders ?? []) as Array<{ id_nguoi_dung: string }>) {
    const r = await insertSocialThongBao(admin, {
      nguoi_nhan: row.id_nguoi_dung,
      loai: "thong_tin",
      loai_doi_tuong: loai,
      id_doi_tuong: ky.id,
      noi_dung: noiDung,
    });
    if (r.ok) n += 1;
  }
  return n;
}

function msgDenHan(ky: OrgPhiKyRow): string {
  const no = Math.max(
    0,
    tienPhaiTra(ky.phiPhaiTraVnd, ky.dieuChinhVnd) - ky.daTraVnd,
  );
  return `Phí nền tảng CINs kỳ chốt ${fmtYmdVi(ky.ngayChot)}: ${no.toLocaleString("vi-VN")}₫ — hạn ${fmtYmdVi(ky.hanTra)}. Mã CK ${ky.maThamChieu}.`;
}

function msgQuaHan(ky: OrgPhiKyRow): string {
  const no = Math.max(
    0,
    tienPhaiTra(ky.phiPhaiTraVnd, ky.dieuChinhVnd) - ky.daTraVnd,
  );
  return `Quá hạn phí nền tảng kỳ ${fmtYmdVi(ky.ngayChot)} (${no.toLocaleString("vi-VN")}₫) — đã khóa thêm ghi danh mới. Thanh toán mã ${ky.maThamChieu} để mở lại.`;
}

/**
 * Cron: lazy chốt kỳ mọi org đã có dòng/kỳ phí + thông báo founder.
 * Logic đúng vẫn chạy lazy khi mở dashboard; cron chỉ để đẩy noti kịp.
 */
export async function chotKyPhiCsdt(
  now = new Date(),
): Promise<ChotKyPhiCsdtResult> {
  const orgIds = await listOrgIdsCanXuLyPhi();
  let kyKichHoatMoi = 0;
  let kyThangMoi = 0;
  let notiDenHan = 0;
  let notiQuaHan = 0;

  for (const orgId of orgIds) {
    const admin = createServiceRoleClient();
    const { data: beforeRows } = await admin
      .from("org_phi_ky")
      .select("id")
      .eq("id_to_chuc", orgId);
    const beforeIds = new Set(
      ((beforeRows ?? []) as Array<{ id: string }>).map((r) => r.id),
    );

    const kichHoat = await ensureKyKichHoat(orgId, now);
    const thangMoi = await ensureKyThang(orgId, now);
    const { quaHanMoi } = await capNhatTrangThaiKy(orgId, now);

    const denHanTargets: OrgPhiKyRow[] = [];
    if (kichHoat && !beforeIds.has(kichHoat.id) && kichHoat.trangThai === "chua_tra") {
      kyKichHoatMoi += 1;
      denHanTargets.push(kichHoat);
    }
    for (const ky of thangMoi) {
      kyThangMoi += 1;
      if (ky.trangThai === "chua_tra") denHanTargets.push(ky);
    }

    for (const ky of denHanTargets) {
      notiDenHan += await notifyFounders(
        orgId,
        ky,
        CSDT_PHI_DEN_HAN_LOAI,
        msgDenHan(ky),
      );
    }
    for (const ky of quaHanMoi) {
      notiQuaHan += await notifyFounders(
        orgId,
        ky,
        CSDT_PHI_QUA_HAN_LOAI,
        msgQuaHan(ky),
      );
    }
  }

  return {
    orgXuLy: orgIds.length,
    kyKichHoatMoi,
    kyThangMoi,
    notiDenHan,
    notiQuaHan,
  };
}
