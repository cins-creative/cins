import type { Metadata } from "next";

import { boPhanTen } from "@/lib/career/boPhanDisplay";
import { CareerHub } from "@/components/career/CareerHub";
import { CinsShell } from "@/components/cins/CinsShell";
import { SiteFooter } from "@/components/cins/SiteFooter";
import { groupCareersByBoPhan } from "@/lib/career/groupCareers";
import { groupLinhVucForSidebar } from "@/lib/career/groupLinhVuc";
import {
  listLinhVucForHub,
  listPublishedNgheForHub,
} from "@/lib/career/queries";

export const metadata: Metadata = {
  title: "Nghề nghiệp — Khám phá ngành sáng tạo thị giác | CINs",
  description:
    "Danh sách nghề nghiệp trong ngành sáng tạo thị giác tại Việt Nam — phim, game, hoạt hình, thiết kế và hơn thế nữa.",
};

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

  const [linhVucs, allCareers] = await Promise.all([
    listLinhVucForHub(),
    listPublishedNgheForHub(),
  ]);

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
        (boPhanTen(n) ?? "").toLowerCase().includes(ql),
    );
  }

  const groups = tab === "nghe" ? groupCareersByBoPhan(filtered) : [];
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
          sampleCareers={filtered}
          showFallbackNote={showFallbackNote}
        />
      </div>
      <SiteFooter />
    </CinsShell>
  );
}
