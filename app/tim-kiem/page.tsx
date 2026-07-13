import { Suspense } from "react";
import type { Metadata } from "next";

import { TimKiemEmptyState } from "@/app/tim-kiem/_components/TimKiemEmptyState";
import { TimKiemKindStream } from "@/app/tim-kiem/_components/TimKiemKindStream";
import { TimKiemSearchForm } from "@/app/tim-kiem/_components/TimKiemSearchForm";
import { TimKiemSectionSkeleton } from "@/app/tim-kiem/_components/TimKiemSectionSkeleton";
import { TimKiemSectionSlot } from "@/app/tim-kiem/_components/TimKiemSectionSlot";
import { TimKiemStreamRoot } from "@/app/tim-kiem/_components/TimKiemStreamRoot";
import { CinsShell } from "@/components/cins/CinsShell";
import { SiteFooter } from "@/components/cins/SiteFooter";
import { parseSearchKindTab } from "@/lib/search/filter-hits";
import { SEARCH_ENTITY_KINDS } from "@/lib/search/types";

export const metadata: Metadata = {
  title: "Tìm kiếm | CINs",
  description:
    "Tìm nghề nghiệp, ngành học, trường, cơ sở đào tạo, studio, người dùng và bài viết công khai trên CINs.",
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  kind?: string;
}>;

function TimKiemHero({ query, kind }: { query: string; kind: string }) {
  return (
    <header className="tk-hero">
      <div className="tk-hero-blob tk-hero-blob--yellow" aria-hidden />
      <div className="tk-hero-blob tk-hero-blob--blue" aria-hidden />
      <div className="tk-hero-inner">
        <p className="tk-eyebrow">Tìm kiếm toàn site</p>
        <h1 className="tk-title">
          Tìm trên <span className="tk-title-accent">CINs</span>
        </h1>
        <p className="tk-lead">
          Nghề, ngành, tổ chức, người dùng và bài viết công khai — mỗi loại hiển
          thị theo layout phù hợp.
        </p>
        <TimKiemSearchForm query={query} kind={kind} />
      </div>
    </header>
  );
}

export default async function TimKiemPage(props: { searchParams: SearchParams }) {
  const sp = await props.searchParams;
  const q = (sp.q ?? "").trim();
  const activeKind = parseSearchKindTab(sp.kind);

  return (
    <CinsShell data-screen-label="Tim-kiem">
      <div className="tk-page">
        <TimKiemHero query={q} kind={activeKind} />

        {q ? (
          <TimKiemStreamRoot key={q} query={q} initialKind={activeKind}>
            {SEARCH_ENTITY_KINDS.map((entityKind) => (
              <TimKiemSectionSlot key={entityKind} entityKind={entityKind}>
                <Suspense
                  fallback={<TimKiemSectionSkeleton entityKind={entityKind} />}
                >
                  <TimKiemKindStream entityKind={entityKind} query={q} />
                </Suspense>
              </TimKiemSectionSlot>
            ))}
          </TimKiemStreamRoot>
        ) : (
          <div className="tk-body">
            <TimKiemEmptyState hasQuery={false} />
          </div>
        )}
      </div>
      <SiteFooter />
    </CinsShell>
  );
}
