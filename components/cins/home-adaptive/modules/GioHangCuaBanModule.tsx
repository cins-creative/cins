import { GioHangPanel } from "@/components/cins/home-adaptive/modules/GioHangCuaBanClient";
import type { HomeModuleCtx } from "@/components/cins/home-adaptive/types";
import { moduleItemLimit } from "@/components/cins/home-adaptive/types";
import { loadGioHangCuaBan } from "@/lib/cins/home-adaptive/gio-hang";

/** Chung · Giỏ chờ mua — mở panel giỏ chung topbar. */
export async function GioHangCuaBanModule({ ctx }: { ctx: HomeModuleCtx }) {
  const limit = moduleItemLimit(ctx, "gio_hang_cua_ban", 4);
  const { items, tongSoDong } = await loadGioHangCuaBan(ctx.viewerId, limit);
  return <GioHangPanel items={items} tongSoDong={tongSoDong} />;
}
