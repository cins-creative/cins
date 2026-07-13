"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import type { ReactNode } from "react";

import { useKhoaHocFilters } from "@/app/tim-khoa-hoc/_components/khoa-hoc-filters";
import { KhoaHocListingCard } from "@/app/tim-khoa-hoc/_components/KhoaHocListingCard";
import { TimKhoaHocKhoaFilterBar } from "@/app/tim-khoa-hoc/_components/TimKhoaHocKhoaFilterBar";
import type { TimKhoaHocLoai } from "@/app/tim-khoa-hoc/_components/tim-khoa-hoc-params";
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
  const filters = useKhoaHocFilters(khoaItems);
  const showKhoaFilters = showKhoa && khoaItems.length > 0;

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
            showKhoaFilters={showKhoaFilters}
            total={khoaItems.length}
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

            {khoaItems.length === 0 ? (
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
                Không có khóa khớp bộ lọc — thử nới học phí hoặc đổi hình thức / mô hình.
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

          </section>
        ) : null}

        {nganhSection}
      </div>
    </>
  );
}
