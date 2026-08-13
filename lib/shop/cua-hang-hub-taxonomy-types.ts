/** Client-safe taxonomy payload cho hub `/shopping`. */

export type HubDanhMucChip = {
  slug: string;
  ten: string;
  thuTu: number;
  chaSlug: string | null;
  chaTen: string | null;
  chaThuTu: number | null;
};

export type HubFacetGiaTri = {
  slug: string;
  ten: string;
  nhom: string | null;
};

export type HubFacetChip = {
  slug: string;
  ten: string;
  kieu: "chon_nhieu" | "chon_mot";
  giaTri: HubFacetGiaTri[];
};

export type CuaHangHubTaxonomy = {
  danhMuc: HubDanhMucChip[];
  facets: HubFacetChip[];
};
