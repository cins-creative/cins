import { Suspense, type ReactNode } from "react";

import { GoiYTheoDoiModule } from "@/components/cins/home-adaptive/modules/GoiYTheoDoiModule";
import { TheoDoiOrgModule } from "@/components/cins/home-adaptive/modules/TheoDoiOrgModule";
import {
  DuongToiDoModule,
  KhamPhaLinhVucModule,
  KhoaHocGoiYModule,
  LopHocCuaBanModule,
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
import { HangFeatureModule } from "@/components/cins/home-adaptive/modules/HangFeatureModule";
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
  lop_hoc_cua_ban: LopHocCuaBanModule,
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
  hang_feature: HangFeatureModule,
};

/** Chỗ giữ card trong lúc module stream về — cần `.ha-card` để cột không thu gọn. */
function ModuleStreamSkeleton() {
  return (
    <section className="ha-card ha-card--loading" aria-busy="true">
      <div className="ha-card-head">
        <span className="j-skel" style={{ height: 16, width: "45%" }} />
      </div>
      <div className="j-skel" style={{ height: 44, margin: "0 12px 8px" }} />
      <div className="j-skel" style={{ height: 44, margin: "0 12px 12px" }} />
    </section>
  );
}

/**
 * Dựng element module theo id đã resolve — **không await**, để 2 cột sidebar
 * stream độc lập thay vì chặn feed giữa (mỗi khối một Suspense riêng).
 * Key + data-ha-module = ModuleId — HomeLayoutEditProvider gom vào childMap.
 *
 * Khác bản cũ: khối trả `null` vẫn có wrapper trong childMap (chưa biết kết quả
 * lúc dựng cây) — slot rỗng được CSS `.ha-edit-slot-wrap:not(:has(.ha-card))`
 * thu gọn ở chế độ xem.
 */
export function renderHomeModules(
  ids: ModuleId[],
  ctx: HomeModuleCtx,
): ReactNode[] {
  return ids.map((id) => {
    const Module = MODULE_REGISTRY[id];
    return (
      <div key={id} data-ha-module={id} style={{ display: "contents" }}>
        <Suspense fallback={<ModuleStreamSkeleton />}>
          <Module ctx={ctx} />
        </Suspense>
      </div>
    );
  });
}
