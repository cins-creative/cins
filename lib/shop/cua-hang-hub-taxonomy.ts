import "server-only";

import { listDanhMucTree } from "@/lib/shop/danh-muc";
import type { CuaHangHubTaxonomy } from "@/lib/shop/cua-hang-hub-taxonomy-types";
import { listFandomChipsForHub } from "@/lib/shop/fandom";
import { listFacetsForHub } from "@/lib/shop/thuoc-tinh";

export async function loadCuaHangHubTaxonomy(): Promise<CuaHangHubTaxonomy> {
  const [danhMuc, facetsRaw, fandomChips] = await Promise.all([
    listDanhMucTree({ nganhHang: "merch", forHubFilter: true }),
    listFacetsForHub({ nganhHang: "merch" }),
    listFandomChipsForHub(),
  ]);

  // Bỏ facet DB `fandom` nếu còn sót; inject facet ảo từ article entity.
  const facets = facetsRaw
    .filter((f) => f.slug !== "fandom")
    .map((f) => ({
      slug: f.slug,
      ten: f.ten,
      kieu: f.kieu,
      giaTri: f.giaTri.map((g) => ({
        slug: g.slug,
        ten: g.ten,
        nhom: g.nhom,
      })),
    }));

  facets.unshift({
    slug: "fandom",
    ten: "Fandom",
    kieu: "chon_nhieu",
    giaTri: fandomChips.map((c) => ({
      slug: c.slug,
      ten: c.ten,
      nhom: null,
    })),
  });

  return {
    danhMuc: danhMuc.map((d) => ({
      slug: d.slug,
      ten: d.ten,
      thuTu: d.thuTu,
    })),
    facets,
  };
}
