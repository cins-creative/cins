import "server-only";

import { listDanhMucTree } from "@/lib/shop/danh-muc";
import type { CuaHangHubTaxonomy } from "@/lib/shop/cua-hang-hub-taxonomy-types";
import { listFacetsForHub } from "@/lib/shop/thuoc-tinh";

export async function loadCuaHangHubTaxonomy(): Promise<CuaHangHubTaxonomy> {
  const [danhMuc, facets] = await Promise.all([
    listDanhMucTree({ nganhHang: "merch", forHubFilter: true }),
    listFacetsForHub({ nganhHang: "merch" }),
  ]);

  return {
    danhMuc: danhMuc.map((d) => ({
      slug: d.slug,
      ten: d.ten,
      thuTu: d.thuTu,
    })),
    facets: facets.map((f) => ({
      slug: f.slug,
      ten: f.ten,
      kieu: f.kieu,
      giaTri: f.giaTri.map((g) => ({
        slug: g.slug,
        ten: g.ten,
        nhom: g.nhom,
      })),
    })),
  };
}
