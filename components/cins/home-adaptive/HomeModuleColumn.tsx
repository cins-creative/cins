import { type ReactNode } from "react";

import { GoiYTheoDoiModule } from "@/components/cins/home-adaptive/modules/GoiYTheoDoiModule";
import { TheoDoiOrgModule } from "@/components/cins/home-adaptive/modules/TheoDoiOrgModule";
import {
  DuongToiDoModule,
  KhamPhaLinhVucModule,
  KhoaHocGoiYModule,
} from "@/components/cins/home-adaptive/modules/hoc";
import {
  CoHoiModule,
  GoiYStudioModule,
  HoSoCuaBanModule,
  NguoiCungNganhModule,
} from "@/components/cins/home-adaptive/modules/lam";
import {
  ChoBanDuyetModule,
  HocVienCuaBanModule,
  ScoutTaiNangModule,
} from "@/components/cins/home-adaptive/modules/day";
import {
  DonCanXuLyModule,
  DonMuaCuaToiModule,
  QuayCuaToiModule,
} from "@/components/cins/home-adaptive/modules/ban-hang";
import {
  OrgInboxModule,
  QuanLySuKienModule,
  ToChucCuaBanModule,
  UngVienMoiModule,
} from "@/components/cins/home-adaptive/modules/to-chuc-ops";
import {
  DaLuuModule,
  LoiMoiKetBanModule,
  SeThamGiaModule,
  UngTuyenCuaToiModule,
} from "@/components/cins/home-adaptive/modules/ket-noi";
import {
  TinNhanBanBeModule,
  TinNhanMuaBanModule,
  TinNhanToChucModule,
} from "@/components/cins/home-adaptive/modules/TinNhanModule";
import type { HomeModuleCtx } from "@/components/cins/home-adaptive/types";
import { moduleItemLimit } from "@/components/cins/home-adaptive/types";
import type { ModuleId } from "@/lib/cins/home-adaptive/persona";

type ModuleComponent = (props: {
  ctx: HomeModuleCtx;
}) => ReactNode | Promise<ReactNode>;

/** Registry: ModuleId → component. Đổi nhóm = sửa MODULE_LAYOUT / prefs, không sửa đây. */
export const MODULE_REGISTRY: Record<ModuleId, ModuleComponent> = {
  theo_doi_org: TheoDoiOrgModule,
  goi_y_theo_doi: GoiYTheoDoiModule,
  goi_y_studio: GoiYStudioModule,
  kham_pha_linh_vuc: KhamPhaLinhVucModule,
  duong_toi_do: DuongToiDoModule,
  khoa_hoc_goi_y: KhoaHocGoiYModule,
  ho_so_cua_ban: HoSoCuaBanModule,
  nguoi_cung_nganh: NguoiCungNganhModule,
  co_hoi: CoHoiModule,
  cho_ban_duyet: ChoBanDuyetModule,
  hoc_vien_cua_ban: HocVienCuaBanModule,
  scout_tai_nang: ScoutTaiNangModule,
  don_can_xu_ly: DonCanXuLyModule,
  don_mua_cua_toi: DonMuaCuaToiModule,
  quay_cua_toi: QuayCuaToiModule,
  org_inbox: OrgInboxModule,
  quan_ly_su_kien: QuanLySuKienModule,
  ung_vien_moi: UngVienMoiModule,
  to_chuc_cua_ban: ToChucCuaBanModule,
  ung_tuyen_cua_toi: UngTuyenCuaToiModule,
  tin_nhan_ban_be: ({ ctx }) => (
    <TinNhanBanBeModule limit={moduleItemLimit(ctx, "tin_nhan_ban_be")} />
  ),
  tin_nhan_to_chuc: ({ ctx }) => (
    <TinNhanToChucModule limit={moduleItemLimit(ctx, "tin_nhan_to_chuc")} />
  ),
  tin_nhan_mua_ban: ({ ctx }) => (
    <TinNhanMuaBanModule limit={moduleItemLimit(ctx, "tin_nhan_mua_ban")} />
  ),
  loi_moi_ket_ban: LoiMoiKetBanModule,
  se_tham_gia: SeThamGiaModule,
  da_luu: DaLuuModule,
};

/**
 * Render module theo id đã resolve. Chỉ giữ node khác null.
 * Key + data-ha-module = ModuleId — HomeLayoutEditProvider gom vào childMap.
 */
export async function renderHomeModules(
  ids: ModuleId[],
  ctx: HomeModuleCtx,
): Promise<ReactNode[]> {
  const rendered = await Promise.all(
    ids.map((id) => Promise.resolve(MODULE_REGISTRY[id]({ ctx }))),
  );

  const nodes: ReactNode[] = [];
  for (let i = 0; i < ids.length; i++) {
    if (rendered[i] == null) continue;
    nodes.push(
      <div key={ids[i]} data-ha-module={ids[i]} style={{ display: "contents" }}>
        {rendered[i]}
      </div>,
    );
  }
  return nodes;
}
