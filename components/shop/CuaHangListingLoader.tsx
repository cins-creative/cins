import { CuaHangListingClient } from "@/components/shop/CuaHangListingClient";
import { listPublicShopCuaHang } from "@/lib/shop/cua-hang-listing";
import { loadCuaHangHubTaxonomy } from "@/lib/shop/cua-hang-hub-taxonomy";

export async function CuaHangListingLoader() {
  const [shops, taxonomy] = await Promise.all([
    listPublicShopCuaHang(),
    loadCuaHangHubTaxonomy(),
  ]);
  return <CuaHangListingClient shops={shops} taxonomy={taxonomy} />;
}
