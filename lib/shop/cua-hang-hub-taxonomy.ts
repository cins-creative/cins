import "server-only";

import { isDanhMucLa, listDanhMucTree, parentIdsOf } from "@/lib/shop/danh-muc";
import type { CuaHangHubTaxonomy } from "@/lib/shop/cua-hang-hub-taxonomy-types";
import { listFandomChipsForHub } from "@/lib/shop/fandom";
import { listFacetsForHub } from "@/lib/shop/thuoc-tinh";

export async function loadCuaHangHubTaxonomy(): Promise<CuaHangHubTaxonomy> {
  const [danhMuc, facetsRaw, fandomChips] = await Promise.all([
    listDanhMucTree({ nganhHang: "merch" }),
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
    ten: "Phân loại",
    kieu: "chon_nhieu",
    giaTri: fandomChips.map((c) => ({
      slug: c.slug,
      ten: c.ten,
      nhom: null,
    })),
  });

  const parentIds = parentIdsOf(danhMuc);
  const byId = new Map(danhMuc.map((d) => [d.id, d]));

  return {
    danhMuc: danhMuc
      .filter((d) => d.slug !== "khac" && isDanhMucLa(d, parentIds))
      .map((d) => {
        const cha = d.idCha ? byId.get(d.idCha) : null;
        return {
          slug: d.slug,
          ten: d.ten,
          thuTu: d.thuTu,
          chaSlug: cha?.slug ?? null,
          chaTen: cha?.ten ?? null,
          chaThuTu: cha?.thuTu ?? null,
        };
      }),
    facets,
  };
}
