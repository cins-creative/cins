"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";

import { useKhoaHocFilters } from "@/app/tim-khoa-hoc/_components/khoa-hoc-filters";
import { KhoaHocListingCard } from "@/app/tim-khoa-hoc/_components/KhoaHocListingCard";
import { TimKhoaHocKhoaFilterBar } from "@/app/tim-khoa-hoc/_components/TimKhoaHocKhoaFilterBar";
import type { TimKhoaHocLoai } from "@/app/tim-khoa-hoc/_components/tim-khoa-hoc-params";
import { TKH_KHOA_PAGE_SIZE } from "@/app/tim-khoa-hoc/_components/tim-khoa-hoc-page-size";
import type { KhoaHocListItem } from "@/lib/to-chuc/khoa-hoc-listing";

type Props = {
  q: string;
  loai: TimKhoaHocLoai;
  khoaItems: KhoaHocListItem[];
  khoaTotal: number;
  showKhoa: boolean;
  hasQuery: boolean;
  resultsBar: ReactNode;
  nganhSection: ReactNode;
};

export function TimKhoaHocHubShell({
  q,
  loai,
  khoaItems,
  khoaTotal,
  showKhoa,
  hasQuery,
  resultsBar,
  nganhSection,
}: Props) {
  const [items, setItems] = useState(khoaItems);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const filters = useKhoaHocFilters(items);
  const hasMore = showKhoa && items.length < khoaTotal;

  function loadMore() {
    if (pending || !hasMore) return;
    setError(null);
    startTransition(async () => {
      try {
        const qs = new URLSearchParams({
          offset: String(items.length),
          limit: String(TKH_KHOA_PAGE_SIZE),
        });
        if (q) qs.set("q", q);
        const res = await fetch(`/api/tim-khoa-hoc/khoa?${qs}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          setError("Không tải thêm được khóa học. Thử lại sau.");
          return;
        }
        const json = (await res.json()) as { items?: KhoaHocListItem[] };
        const next = json.items ?? [];
        if (next.length === 0) return;
        setItems((prev) => {
          const seen = new Set(prev.map((k) => k.id));
          const merged = [...prev];
          for (const item of next) {
            if (seen.has(item.id)) continue;
            seen.add(item.id);
            merged.push(item);
          }
          return merged;
        });
      } catch {
        setError("Không tải thêm được khóa học. Thử lại sau.");
      }
    });
  }

  return (
    <>
      <header className="tkh-hub-header">
        <div className="tkh-hub-header__glass" aria-hidden="true" />
        <span className="j-tlb-streak-slow" aria-hidden="true" />
        <div className="tkh-hub-header__inner">
          <TimKhoaHocKhoaFilterBar
            {...filters}
            q={q}
            loai={loai}
            showKhoaFilters={showKhoa && items.length > 0}
            total={items.length}
          />
        </div>
      </header>

      <div className="tkh-body">
        {resultsBar}

        {showKhoa ? (
          <section
            className="tkh-section"
            id="khoa-hoc-co-so"
            aria-labelledby="tkh-sec-khoa-title"
          >
            <header className="tkh-section-head tkh-section-head--compact">
              <div className="tkh-section-icon tkh-section-icon--mint" aria-hidden>
                <GraduationCap size={18} strokeWidth={2} />
              </div>
              <h2 className="tkh-section-title" id="tkh-sec-khoa-title">
                Khóa học cơ sở đào tạo
              </h2>
              {!hasQuery && khoaTotal > 0 ? (
                <p className="tkh-section-meta">
                  <strong>{khoaTotal}</strong> đang mở
                </p>
              ) : null}
            </header>

            {items.length === 0 ? (
              <p className="tkh-empty tkh-empty--section">
                {hasQuery
                  ? "Không có khóa học khớp từ khóa — thử tên khác hoặc bỏ bộ lọc."
                  : "Hiện chưa có khóa học nào đang mở đăng ký. Theo dõi cơ sở đào tạo yêu thích hoặc thử "}
                {!hasQuery ? (
                  <>
                    <Link href="/tim-kiem" prefetch={false}>
                      tìm kiếm toàn sàn
                    </Link>
                    .
                  </>
                ) : null}
              </p>
            ) : filters.filtered.length === 0 ? (
              <p className="tkh-empty tkh-empty--section">
                Không có khóa khớp bộ lọc — thử nới học phí hoặc đổi hình thức / mô hình
                {hasMore ? ", hoặc xem thêm khóa bên dưới." : "."}
              </p>
            ) : (
              <ul className="tkh-grid">
                {filters.filtered.map((khoa) => (
                  <li key={khoa.id}>
                    <KhoaHocListingCard khoa={khoa} />
                  </li>
                ))}
              </ul>
            )}

            {hasMore ? (
              <div className="tkh-load-more-wrap">
                <button
                  type="button"
                  className="tkh-load-more"
                  onClick={loadMore}
                  disabled={pending}
                >
                  {pending
                    ? "Đang tải…"
                    : `Xem thêm khóa học (${items.length}/${khoaTotal})`}
                </button>
                {error ? <p className="tkh-load-more-error">{error}</p> : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {nganhSection}
      </div>
    </>
  );
}
