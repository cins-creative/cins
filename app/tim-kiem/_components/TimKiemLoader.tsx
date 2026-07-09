import { parseSearchKindTab } from "@/lib/search/filter-hits";
import { runGlobalSearch } from "@/lib/search/global-search";

import { TimKiemEmptyState } from "./TimKiemEmptyState";
import { TimKiemResultsPanel } from "./TimKiemResultsPanel";
import { TimKiemSearchForm } from "./TimKiemSearchForm";

type Props = {
  q?: string;
  kind?: string;
};

export async function TimKiemLoader({ q, kind }: Props) {
  const activeKind = parseSearchKindTab(kind);
  const result = await runGlobalSearch({ q, kind: "all" });

  return (
    <div className="tk-page">
      <header className="tk-hero">
        <div className="tk-hero-blob tk-hero-blob--yellow" aria-hidden />
        <div className="tk-hero-blob tk-hero-blob--blue" aria-hidden />
        <div className="tk-hero-inner">
          <p className="tk-eyebrow">Tìm kiếm toàn site</p>
          <h1 className="tk-title">
            Tìm trên <span className="tk-title-accent">CINs</span>
          </h1>
          <p className="tk-lead">
            Nghề, ngành, tổ chức, người dùng và bài viết công khai — mỗi loại hiển thị
            theo layout phù hợp.
          </p>
          <TimKiemSearchForm query={result.query} kind={activeKind} />
        </div>
      </header>

      {result.query ? (
        <TimKiemResultsPanel
          query={result.query}
          initialKind={activeKind}
          hits={result.hits}
          message={result.message}
        />
      ) : (
        <div className="tk-body">
          <TimKiemEmptyState hasQuery={false} />
        </div>
      )}
    </div>
  );
}
