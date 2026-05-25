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

  const nganhResult = await listNganhArticlesForHub({ limit: 500 });
  const allNganh = nganhResult.ok ? nganhResult.items : [];
  const nganhSidebarGroups = groupNhomNganhForSidebar(allNganh);

  const activeNhomId =
    nhomParam && nganhSidebarGroups.some((g) => g.id === nhomParam)
      ? nhomParam
      : "";
  const activeNhomLabel =
    nganhSidebarGroups.find((g) => g.id === activeNhomId)?.heading ?? null;

  let filteredNganh = allNganh;
  if (activeNhomId) {
    filteredNganh = allNganh.filter((n) =>
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
    listError: !nganhResult.ok
      ? {
          reason: nganhResult.reason,
          message: nganhResult.message,
        }
      : undefined,
  };
}
