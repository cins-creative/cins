import { CuaHangListingClient } from "@/components/shop/CuaHangListingClient";
import { listPublicShopCuaHang } from "@/lib/shop/cua-hang-listing";
import { loadCuaHangHubTaxonomy } from "@/lib/shop/cua-hang-hub-taxonomy";
import type { CuaHangHubTaxonomy } from "@/lib/shop/cua-hang-hub-taxonomy-types";

const EMPTY_TAXONOMY: CuaHangHubTaxonomy = {
  danhMuc: [],
  facets: [],
};

type BrowseMode = "shop" | "mat-hang" | "hang";

export async function CuaHangListingLoader({
  browseMode,
}: {
  browseMode: BrowseMode;
}) {
  const needCatalog = browseMode === "mat-hang" || browseMode === "hang";
  const [shops, taxonomy] = await Promise.all([
    listPublicShopCuaHang(needCatalog ? "hang" : "shop"),
    needCatalog
      ? loadCuaHangHubTaxonomy()
      : Promise.resolve(EMPTY_TAXONOMY),
  ]);
  return (
    <CuaHangListingClient
      shops={shops}
      taxonomy={taxonomy}
      browseMode={browseMode}
    />
  );
}
