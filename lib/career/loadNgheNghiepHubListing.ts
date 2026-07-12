import { boPhanTen } from "@/lib/career/boPhanDisplay";
import { mapNgheArticlesToHubItems } from "@/lib/career/articleMappers";
import {
  careerMatchesActiveLinhVuc,
  collectBoPhanNhomIdsForHub,
} from "@/lib/career/articleNhomHub";
import { groupCareersByArticleNhomForLinhVuc } from "@/lib/career/hubSections";
import {
  listBoPhanNhomOrderForLinhVuc,
  orderHubSectionsByNhomThuTu,
} from "@/lib/career/hubNhomOrder";
import { groupLinhVucForSidebar } from "@/lib/career/groupLinhVuc";
import { resolveActiveLinhVuc } from "@/lib/career/resolveActiveLinhVuc";
import { listLinhVucForHub } from "@/lib/career/queries";
import type { CareerHubSection } from "@/lib/career/hubSections";
import type { LinhVucSidebarGroup } from "@/lib/career/groupLinhVuc";
import type { LinhVucRow, NgheNghiepHubItem } from "@/lib/career/types";
import { listNgheArticlesForHub } from "@/lib/articles/queries";
import { listCongDongOrgsForLinhVuc } from "@/lib/cong-dong/linh-vuc";
import type { CongDongOrgCategoryPreview } from "@/lib/cong-dong/categories";

export type NgheNghiepHubListingParams = {
  linh_vuc?: string;
  q?: string;
};

export type NgheNghiepHubListingData = {
  tab: "nghe";
  linhVucSidebarGroups: LinhVucSidebarGroup[];
  activeLinhVuc: LinhVucRow | null;
  searchQuery: string;
  groups: CareerHubSection[];
  sampleCareers: NgheNghiepHubItem[];
  showFallbackNote: boolean;
  communities: CongDongOrgCategoryPreview[];
  listError?: { reason: "no_env" | "query_error"; message?: string };
};

export async function loadNgheNghiepHubListing(
  params: NgheNghiepHubListingParams,
): Promise<NgheNghiepHubListingData> {
  const searchQuery = (params.q ?? "").trim();
  const linhVucs = await listLinhVucForHub();
  const { activeLv } = resolveActiveLinhVuc(linhVucs, params.linh_vuc);

  const ngheArticlesResult = await listNgheArticlesForHub(
    searchQuery
      ? { q: searchQuery, limit: 500 }
      : activeLv?.id
        ? { linhVucId: activeLv.id, limit: 500 }
        : { limit: 500 },
  );

  let filtered =
    ngheArticlesResult.ok && ngheArticlesResult.items.length > 0
      ? mapNgheArticlesToHubItems(ngheArticlesResult.items)
      : [];

  const showFallbackNote = false;

  if (activeLv && !searchQuery) {
    filtered = filtered.filter((n) => careerMatchesActiveLinhVuc(n, activeLv));
  }

  if (searchQuery) {
    const ql = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (n) =>
        (n.title_eng ?? "").toLowerCase().includes(ql) ||
        (n.title_vietnam ?? "").toLowerCase().includes(ql) ||
        (n.short_description ?? "").toLowerCase().includes(ql) ||
        (boPhanTen(n) ?? "").toLowerCase().includes(ql) ||
        (n.article_nhom?.ten ?? "").toLowerCase().includes(ql),
    );
  }

  const boPhanIdsForCatalog = collectBoPhanNhomIdsForHub(filtered);

  const nhomOrderCatalog = activeLv?.id
    ? await listBoPhanNhomOrderForLinhVuc(activeLv.id, boPhanIdsForCatalog)
    : [];

  const groupsRaw = groupCareersByArticleNhomForLinhVuc(filtered, activeLv);
  const groups =
    nhomOrderCatalog.length > 0
      ? orderHubSectionsByNhomThuTu(groupsRaw, nhomOrderCatalog)
      : groupsRaw;

  const communities =
    activeLv?.id && !searchQuery
      ? await listCongDongOrgsForLinhVuc(activeLv.id, 8)
      : [];

  return {
    tab: "nghe",
    linhVucSidebarGroups: groupLinhVucForSidebar(linhVucs),
    activeLinhVuc: activeLv,
    searchQuery,
    groups,
    sampleCareers: filtered,
    showFallbackNote,
    communities,
    listError: !ngheArticlesResult.ok
      ? {
          reason: ngheArticlesResult.reason,
          message: ngheArticlesResult.message,
        }
      : undefined,
  };
}
