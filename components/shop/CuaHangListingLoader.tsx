import { CuaHangListingClient } from "@/components/shop/CuaHangListingClient";
import { listPublicShopCuaHang } from "@/lib/shop/cua-hang-listing";

export async function CuaHangListingLoader() {
  const shops = await listPublicShopCuaHang();
  return <CuaHangListingClient shops={shops} />;
}
