import type { Metadata } from "next";

import { boPhanTen } from "@/lib/career/boPhanDisplay";
import { CareerHub } from "@/components/career/CareerHub";
import { CinsShell } from "@/components/cins/CinsShell";
import { SiteFooter } from "@/components/cins/SiteFooter";
import { listNgheArticlesForHub } from "@/lib/articles/queries";
import { mapNgheArticlesToHubItems } from "@/lib/career/articleMappers";
import { groupCareersByBoPhan } from "@/lib/career/groupCareers";
import { groupLinhVucForSidebar } from "@/lib/career/groupLinhVuc";
import { listLinhVucForHub } from "@/lib/career/queries";

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
};

export default async function NgheNghiepIndexPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await props.searchParams;
  const tab = sp.tab === "nganh-hoc" ? "nganh-hoc" : "nghe";
  const qRaw = (sp.q ?? "").trim();

  const [linhVucs, ngheArticlesResult] = await Promise.all([
    listLinhVucForHub(),
    listNgheArticlesForHub(),
  ]);

  const allCareers =
    ngheArticlesResult.ok && ngheArticlesResult.items.length > 0
      ? mapNgheArticlesToHubItems(ngheArticlesResult.items)
      : [];

  const defaultSlug = linhVucs[0]?.slug ?? "";
  const requested = sp.linh_vuc;
  const activeSlug =
    requested && linhVucs.some((l) => l.slug === requested)
      ? requested
      : defaultSlug;

  const activeLv =
    linhVucs.find((l) => l.slug === activeSlug) ?? linhVucs[0] ?? null;

  let filtered = allCareers;
  let showFallbackNote = false;

  if (activeLv && tab === "nghe") {
    const inLinh = allCareers.filter(
      (n) => n.linh_vuc_id?.includes(activeLv.id),
    );
    if (inLinh.length > 0) {
      filtered = inLinh;
    } else if (allCareers.length > 0) {
      filtered = allCareers;
      showFallbackNote = true;
    }
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

  const groups = tab === "nghe" ? groupCareersByBoPhan(filtered) : [];

  /** Nghề gán đúng lĩnh vực đang chọn — dùng để nav tag, tránh liệt kê mọi bo_phan khi fallback hiển thị toàn DB */
  const inActiveLinhVuc =
    activeLv && tab === "nghe"
      ? allCareers.filter((n) => n.linh_vuc_id?.includes(activeLv.id))
      : null;
  const inActiveLinhIds =
    inActiveLinhVuc != null
      ? new Set(inActiveLinhVuc.map((n) => n.id))
      : null;

  const tagGroups =
    tab === "nghe" && inActiveLinhIds != null
      ? groups.filter((g) =>
          g.careers.some((c) => inActiveLinhIds.has(c.id)),
        )
      : groups;

  const linhVucSidebarGroups = groupLinhVucForSidebar(linhVucs);

  return (
    <CinsShell data-screen-label="Nghe-nghiep-index">
      <div className="career-page career-page--hub">
        <CareerHub
          tab={tab}
          linhVucSidebarGroups={linhVucSidebarGroups}
          activeLinhVuc={activeLv}
          searchQuery={qRaw}
          groups={groups}
          tagGroups={tagGroups}
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
        />
      </div>
      <SiteFooter />
    </CinsShell>
  );
}
