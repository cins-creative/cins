import { ClipboardList, Package, ShoppingBag } from "lucide-react";

import {
  ModuleCard,
  ModuleEmpty,
} from "@/components/cins/home-adaptive/ModuleCard";
import {
  DonCanXuLyPanel,
  DonHangHomeList,
} from "@/components/cins/home-adaptive/modules/DonCanXuLyClient";
import { QuanLyKhoPanel } from "@/components/cins/home-adaptive/modules/QuanLyKhoPanel";
import type { HomeModuleCtx } from "@/components/cins/home-adaptive/types";
import { moduleItemLimit } from "@/components/cins/home-adaptive/types";
import { HOME_LAYOUT_ITEM_LIMIT_MAX } from "@/lib/cins/home-adaptive/layout-prefs";
import { loadQuanLyKho } from "@/lib/cins/home-adaptive/quan-ly-kho";
import {
  loadDonCanXuLy,
  loadDonMuaCuaToi,
} from "@/lib/cins/home-adaptive/role-fetches";

/** Shop · Đơn chờ xử lý. */
export async function DonCanXuLyModule({ ctx }: { ctx: HomeModuleCtx }) {
  const displayLimit = moduleItemLimit(ctx, "don_can_xu_ly");
  /** Fetch max để edit mode tăng số dòng không cần refetch. */
  const { items } = await loadDonCanXuLy(
    ctx.viewerId,
    HOME_LAYOUT_ITEM_LIMIT_MAX,
  );
  if (items.length === 0) {
    return (
      <ModuleCard
        icon={ClipboardList}
        title="Đơn chờ xử lý"
        moreHref="/seller/orders"
        moreLabel="Xem đơn hàng"
        className="ha-card--don"
      >
        <ModuleEmpty>Không có đơn chờ xử lý.</ModuleEmpty>
      </ModuleCard>
    );
  }

  return <DonCanXuLyPanel items={items} limit={displayLimit} />;
}

/** Buyer · Đơn tôi đặt. */
export async function DonMuaCuaToiModule({ ctx }: { ctx: HomeModuleCtx }) {
  const { items, total } = await loadDonMuaCuaToi(
    ctx.viewerId,
    moduleItemLimit(ctx, "don_mua_cua_toi"),
  );
  if (items.length === 0) {
    return (
      <ModuleCard
        icon={ShoppingBag}
        title="Đơn tôi đặt"
        className="ha-card--don"
      >
        <ModuleEmpty>Chưa có đơn đang theo dõi.</ModuleEmpty>
      </ModuleCard>
    );
  }

  return (
    <ModuleCard
      icon={ShoppingBag}
      title="Đơn tôi đặt"
      badge={String(total)}
      className="ha-card--don"
    >
      <DonHangHomeList items={items} total={total} mode="buyer" />
    </ModuleCard>
  );
}

/** Shop · Quầy sự kiện — đã gộp vào `theo_doi_org` tab Quan tâm. */
export async function QuayCuaToiModule(_props: { ctx: HomeModuleCtx }) {
  return null;
}

/** Shop · Tồn kho thấp / quản lý kho. */
export async function QuanLyKhoModule({ ctx }: { ctx: HomeModuleCtx }) {
  const limit = moduleItemLimit(ctx, "quan_ly_kho", 4);
  const { items, canhBao } = await loadQuanLyKho(
    ctx.viewerId,
    HOME_LAYOUT_ITEM_LIMIT_MAX,
  );

  if (items.length === 0) {
    return (
      <ModuleCard
        icon={Package}
        title="Quản lý kho hàng"
        moreHref="/seller/inventory"
        moreLabel="Mở kho"
        className="ha-card--kho"
      >
        <ModuleEmpty>Chưa có hàng trong kho.</ModuleEmpty>
      </ModuleCard>
    );
  }

  return (
    <QuanLyKhoPanel items={items} canhBao={canhBao} limit={limit} />
  );
}
