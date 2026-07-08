import { Fragment, type ReactNode } from "react";

import {
  GoiYTheoDoiModule,
} from "@/components/cins/home-adaptive/modules/GoiYTheoDoiModule";
import { TheoDoiOrgModule } from "@/components/cins/home-adaptive/modules/TheoDoiOrgModule";
import {
  KhamPhaLinhVucModule,
  DuongToiDoModule,
  KhoaHocGoiYModule,
} from "@/components/cins/home-adaptive/modules/hoc";
import {
  CoHoiModule,
  GoiYStudioModule,
  HoSoCuaBanModule,
  LoiMoiXacNhanModule,
  NguoiCungNganhModule,
} from "@/components/cins/home-adaptive/modules/lam";
import {
  ChoBanDuyetModule,
  HocVienCuaBanModule,
  ScoutTaiNangModule,
} from "@/components/cins/home-adaptive/modules/day";
import type { HomeModuleCtx } from "@/components/cins/home-adaptive/types";
import { MODULE_LAYOUT, type ModuleId } from "@/lib/cins/home-adaptive/persona";

type ModuleComponent = (props: { ctx: HomeModuleCtx }) => ReactNode | Promise<ReactNode>;

/** Registry: ModuleId → component. Đổi nhóm = sửa MODULE_LAYOUT, không sửa đây. */
const MODULE_REGISTRY: Record<ModuleId, ModuleComponent> = {
  theo_doi_org: TheoDoiOrgModule,
  goi_y_theo_doi: GoiYTheoDoiModule,
  goi_y_studio: GoiYStudioModule,
  kham_pha_linh_vuc: KhamPhaLinhVucModule,
  duong_toi_do: DuongToiDoModule,
  khoa_hoc_goi_y: KhoaHocGoiYModule,
  ho_so_cua_ban: HoSoCuaBanModule,
  nguoi_cung_nganh: NguoiCungNganhModule,
  co_hoi: CoHoiModule,
  loi_moi_xac_nhan: LoiMoiXacNhanModule,
  cho_ban_duyet: ChoBanDuyetModule,
  hoc_vien_cua_ban: HocVienCuaBanModule,
  scout_tai_nang: ScoutTaiNangModule,
};

/** §7: khi seeking, đẩy `co_hoi` lên đầu cột phải cụm LÀM. */
function orderForSeeking(ids: ModuleId[], seeking: boolean): ModuleId[] {
  if (!seeking || !ids.includes("co_hoi")) return ids;
  return [
    "co_hoi",
    ...ids.filter((id) => id !== "co_hoi"),
  ] as ModuleId[];
}

/** Một cột module hoán theo persona. Mỗi module tự fetch data của nó. */
export async function HomeModuleColumn({
  side,
  ctx,
  prepend,
}: {
  side: "left" | "right";
  ctx: HomeModuleCtx;
  /** Nội dung chèn lên đầu cột (trong cùng <aside>, giữ nguyên lưới 3 cột). */
  prepend?: ReactNode;
}) {
  const baseIds = MODULE_LAYOUT[ctx.persona][side];
  const ids =
    side === "right" ? orderForSeeking(baseIds, ctx.seeking) : baseIds;

  const rendered = await Promise.all(
    ids.map((id) => Promise.resolve(MODULE_REGISTRY[id]({ ctx }))),
  );

  return (
    <aside
      className={`wj-guest-aside wj-guest-aside--${side} ha-col ha-col--${side}`}
      aria-label="Gợi ý theo nhóm"
    >
      {prepend}
      {rendered.map((node, i) => (
        <Fragment key={ids[i]}>{node}</Fragment>
      ))}
    </aside>
  );
}
