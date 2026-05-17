import type { Metadata } from "next";

import { boPhanTen } from "@/lib/career/boPhanDisplay";
import { CareerHub } from "@/components/career/CareerHub";
import { CinsShell } from "@/components/cins/CinsShell";
import { SiteFooter } from "@/components/cins/SiteFooter";
import { listNgheArticlesForHub } from "@/lib/articles/queries";
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
import { listLinhVucForHub } from "@/lib/career/queries";
import type { LinhVucRow } from "@/lib/career/types";
import {
  groupNhomNganhForSidebar,
  nganhMatchesActiveNhom,
} from "@/lib/nganh/groupNhomNganh";
import { groupNganhByNhomNganh } from "@/lib/nganh/hubSections";
import { listNganhArticlesForHub } from "@/lib/nganh/queries";

export const metadata: Metadata = {
  title: "Nghề nghiệp — Khám phá ngành sáng tạo thị giác | CINs",
  description:
    "Danh sách nghề nghiệp trong ngành sáng tạo thị giác tại Việt Nam — phim, game, hoạt hình, thiết kế và hơn thế nữa.",
};

export const dynamic = "force-dynamic";

type SearchParams = {
  linh_vuc?: string;
  tab?: string;
  q?: string;
  nhom?: string;
};

export default async function NgheNghiepIndexPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await props.searchParams;
  const tab = sp.tab === "nganh-hoc" ? "nganh-hoc" : "nghe";
  const qRaw = (sp.q ?? "").trim();

  const linhVucs = await listLinhVucForHub();

  const requestedRawEarly = sp.linh_vuc;
  const requestedEarly =
    typeof requestedRawEarly === "string"
      ? decodeURIComponent(requestedRawEarly).trim()
      : undefined;

  const slugMatchesEarly = (lv: LinhVucRow, q: string) => {
    const s = (lv.slug ?? "").trim().toLowerCase();
    const qn = q.trim().toLowerCase();
    if (!s || !qn) return false;
    if (s === qn) return true;
    const sCore = s.replace(/^lv-/, "");
    const qCore = qn.replace(/^lv-/, "");
    return sCore.length > 0 && sCore === qCore;
  };

  const defaultSlugEarly = linhVucs[0]?.slug ?? "";
  const activeSlugEarly =
    requestedEarly && linhVucs.some((l) => slugMatchesEarly(l, requestedEarly))
      ? (linhVucs.find((l) => slugMatchesEarly(l, requestedEarly))?.slug ?? "").trim() ||
        defaultSlugEarly
      : defaultSlugEarly;

  const activeLvEarly =
    linhVucs.find((l) => slugMatchesEarly(l, activeSlugEarly)) ?? linhVucs[0] ?? null;

  const ngheArticlesResult = await listNgheArticlesForHub(
    qRaw
      ? { limit: 500 }
      : activeLvEarly?.id
        ? { linhVucId: activeLvEarly.id, limit: 500 }
        : { limit: 500 },
  );

  const allCareers =
    ngheArticlesResult.ok && ngheArticlesResult.items.length > 0
      ? mapNgheArticlesToHubItems(ngheArticlesResult.items)
      : [];

  const activeLv = activeLvEarly;
  const activeSlug = activeSlugEarly;

  let filtered = allCareers;
  const showFallbackNote = false;

  if (activeLv && tab === "nghe" && !qRaw) {
    filtered = allCareers.filter((n) => careerMatchesActiveLinhVuc(n, activeLv));
  }

  if (qRaw) {
    const ql = qRaw.toLowerCase();
    filtered = filtered.filter(
      (n) =>
        (n.title_eng ?? "").toLowerCase().includes(ql) ||
        (n.title_vietnam ?? "").toLowerCase().includes(ql) ||
        (n.short_description ?? "").toLowerCase().includes(ql) ||
        (boPhanTen(n) ?? "").toLowerCase().includes(ql),
    );
  }

  const boPhanIdsForCatalog =
    tab === "nghe" ? collectBoPhanNhomIdsForHub(filtered) : [];

  const nhomOrderCatalog =
    tab === "nghe" && activeLv?.id
      ? await listBoPhanNhomOrderForLinhVuc(activeLv.id, boPhanIdsForCatalog)
      : [];

  const groupsRaw =
    tab === "nghe"
      ? groupCareersByArticleNhomForLinhVuc(filtered, activeLv)
      : [];
  const groups =
    tab === "nghe" && nhomOrderCatalog.length > 0
      ? orderHubSectionsByNhomThuTu(groupsRaw, nhomOrderCatalog)
      : groupsRaw;

  const linhVucSidebarGroups = groupLinhVucForSidebar(linhVucs);

  const nganhResult =
    tab === "nganh-hoc"
      ? await listNganhArticlesForHub({ limit: 500 })
      : { ok: true as const, items: [] };
  const allNganh = nganhResult.ok ? nganhResult.items : [];
  const nganhSidebarGroups = groupNhomNganhForSidebar(allNganh);
  const nhomParam = (sp.nhom ?? "").trim();
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
  if (qRaw && tab === "nganh-hoc") {
    const ql = qRaw.toLowerCase();
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
  const nganhGroups =
    tab === "nganh-hoc" ? groupNganhByNhomNganh(filteredNganh) : [];

  return (
    <CinsShell data-screen-label="Nghe-nghiep-index">
      <div className="career-page career-page--hub">
        <CareerHub
          tab={tab}
          linhVucSidebarGroups={linhVucSidebarGroups}
          activeLinhVuc={activeLv}
          searchQuery={qRaw}
          showLinhVucOnCards={Boolean(qRaw)}
          groups={groups}
          tagGroups={groups}
          sampleCareers={filtered}
          showFallbackNote={showFallbackNote}
          detailPathPrefix="/bai-viet"
          listError={
            !ngheArticlesResult.ok
              ? {
                  reason: ngheArticlesResult.reason,
                  message: ngheArticlesResult.message,
                }
              : undefined
          }
          nganhSidebarGroups={nganhSidebarGroups}
          activeNhomId={activeNhomId}
          activeNhomLabel={activeNhomLabel}
          nganhGroups={nganhGroups}
          sampleNganh={filteredNganh}
          nganhListError={
            tab === "nganh-hoc" && !nganhResult.ok
              ? {
                  reason: nganhResult.reason,
                  message: nganhResult.message,
                }
              : undefined
          }
        />
      </div>
      <SiteFooter />
    </CinsShell>
  );
}
