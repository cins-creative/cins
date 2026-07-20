import {
  groupNhomNganhForSidebar,
  nganhMatchesActiveNhom,
} from "@/lib/nganh/groupNhomNganh";
import { groupNganhByNhomNganh } from "@/lib/nganh/hubSections";
import { listNganhArticlesForHub } from "@/lib/nganh/queries";
import type { NganhHubItem, NganhHubSection, NganhSidebarGroup } from "@/lib/nganh/types";

export type NganhHubListingParams = {
  q?: string;
  nhom?: string;
  /** Giới hạn catalog (hub `/tim-khoa-hoc` dùng mẫu nhỏ; hub ngành mặc định 500). */
  limit?: number;
};

export type NganhHubListingData = {
  searchQuery: string;
  nganhSidebarGroups: NganhSidebarGroup[];
  activeNhomId: string;
  activeNhomLabel: string | null;
  nganhGroups: NganhHubSection[];
  sampleNganh: NganhHubItem[];
  listError?: { reason: "no_env" | "query_error"; message?: string };
};

export async function loadNganhHubListing(
  params: NganhHubListingParams,
): Promise<NganhHubListingData> {
  const searchQuery = (params.q ?? "").trim();
  const nhomParam = (params.nhom ?? "").trim();

  const catalogLimit =
    typeof params.limit === "number" && Number.isFinite(params.limit)
      ? Math.min(500, Math.max(1, Math.floor(params.limit)))
      : 500;
  const catalogResult = await listNganhArticlesForHub({ limit: catalogLimit });
  const allNganh = catalogResult.ok ? catalogResult.items : [];
  const nganhSidebarGroups = groupNhomNganhForSidebar(allNganh);

  const activeNhomId =
    nhomParam && nganhSidebarGroups.some((g) => g.id === nhomParam)
      ? nhomParam
      : "";
  const activeNhomLabel =
    nganhSidebarGroups.find((g) => g.id === activeNhomId)?.heading ?? null;

  let filteredNganh = allNganh;
  if (activeNhomId) {
    filteredNganh = filteredNganh.filter((n) =>
      nganhMatchesActiveNhom(n, activeNhomId),
    );
  }
  if (searchQuery) {
    const ql = searchQuery.toLowerCase();
    filteredNganh = filteredNganh.filter(
      (n) =>
        (n.title ?? "").toLowerCase().includes(ql) ||
        (n.titleVi ?? "").toLowerCase().includes(ql) ||
        (n.titleEng ?? "").toLowerCase().includes(ql) ||
        (n.ma_nganh ?? "").toLowerCase().includes(ql) ||
        (n.short_description ?? "").toLowerCase().includes(ql) ||
        (n.article_nhom?.ten ?? "").toLowerCase().includes(ql),
    );
  }

  const nganhGroups = groupNganhByNhomNganh(filteredNganh);

  return {
    searchQuery,
    nganhSidebarGroups,
    activeNhomId,
    activeNhomLabel,
    nganhGroups,
    sampleNganh: filteredNganh,
    listError: !catalogResult.ok
      ? {
          reason: catalogResult.reason,
          message: catalogResult.message,
        }
      : undefined,
  };
}
