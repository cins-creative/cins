import { groupHitsByKind, runGlobalSearch } from "@/lib/search/global-search";
import type { SearchEntityKind } from "@/lib/search/types";

import { TimKiemEmptyState } from "./TimKiemEmptyState";
import { TimKiemKindTabs } from "./TimKiemKindTabs";
import { TimKiemResults } from "./TimKiemResults";
import { TimKiemSearchForm } from "./TimKiemSearchForm";

type Props = {
  q?: string;
  kind?: string;
};

function formatCount(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n);
}

export async function TimKiemLoader({ q, kind }: Props) {
  const result = await runGlobalSearch({ q, kind });
  const sectionKinds = groupHitsByKind(result.hits);
  const total = result.hits.length;
  const activeKind = result.kind;

  const statItems: Array<{ key: SearchEntityKind; label: string }> = [
    { key: "article", label: "Kiến thức" },
    { key: "khoa_hoc", label: "Khóa học" },
    { key: "org_tuyen_dung", label: "Tuyển dụng" },
    { key: "org", label: "Tổ chức" },
    { key: "user", label: "Người dùng" },
    { key: "user_post", label: "Journey" },
    { key: "org_post", label: "Bài org" },
  ];

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
        <div className="tk-body">
          <div className="tk-toolbar">
            <TimKiemKindTabs query={result.query} activeKind={activeKind} />
            {total > 0 ? (
              <p className="tk-summary">
                <strong>{formatCount(total)}</strong> kết quả cho &ldquo;
                {result.query}&rdquo;
              </p>
            ) : null}
          </div>

          {result.message ? (
            <p className="tk-message tk-message--err" role="alert">
              {result.message}
            </p>
          ) : null}

          {activeKind === "all" && total > 0 ? (
            <div className="tk-stat-row" aria-label="Phân bổ kết quả">
              {statItems.map(({ key, label }) =>
                result.counts[key] > 0 ? (
                  <span key={key} className="tk-stat-chip">
                    <strong>{formatCount(result.counts[key])}</strong> {label}
                  </span>
                ) : null,
              )}
            </div>
          ) : null}

          {total > 0 ? (
            <TimKiemResults
              hits={result.hits}
              sectionKinds={sectionKinds}
              query={result.query}
              activeKind={activeKind}
              counts={result.counts}
            />
          ) : (
            <TimKiemEmptyState hasQuery />
          )}
        </div>
      ) : (
        <div className="tk-body">
          <TimKiemEmptyState hasQuery={false} />
        </div>
      )}
    </div>
  );
}
