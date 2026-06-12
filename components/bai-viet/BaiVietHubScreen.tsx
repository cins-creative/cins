import Link from "next/link";

import { NGHE_NGHIEP_HUB_PATH } from "@/lib/cins/hubPaths";

import { BaiVietArticleCard } from "@/components/bai-viet/BaiVietArticleCard";
import { BaiVietHubPageHead } from "@/components/bai-viet/BaiVietHubPageHead";
import { BaiVietHubPagination } from "@/components/bai-viet/BaiVietHubPagination";
import { BaiVietHubSidebar } from "@/components/bai-viet/BaiVietHubSidebar";
import {
  BAI_VIET_HUB_LOAI,
  buildBaiVietHubUrl,
  hubLoaiLabel,
  isHubLoaiId,
} from "@/lib/bai-viet/hub-loai";
import type { BlogHubResult, BlogHubRow } from "@/lib/bai-viet/types";

type Props = {
  result: BlogHubResult;
  loaiSlug: string;
  capDoSlug: string;
  q: string;
  page: number;
  pageSize: number;
};

function groupItemsByLoai(items: BlogHubRow[]) {
  return BAI_VIET_HUB_LOAI.map((loai, index) => ({
    id: loai.id,
    title: loai.label,
    index,
    items: items.filter((r) => r.loai_bai_viet === loai.id),
  })).filter((g) => g.items.length > 0);
}

export function BaiVietHubScreen({
  result,
  loaiSlug,
  capDoSlug,
  q,
  page,
  pageSize,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
  const showGrouped = !loaiSlug && !q;
  const sections = showGrouped ? groupItemsByLoai(result.items) : [];
  const flatItems = showGrouped ? [] : result.items;

  return (
    <div className="career-hub career-hub--hn bv-hub">
      <BaiVietHubPageHead
        activeLoai={loaiSlug}
        searchQuery={q}
        activeCapDo={capDoSlug}
      />

      <div className="hn-main">
        <BaiVietHubSidebar
          loaiTabs={result.loaiTabs}
          capDoOptions={result.capDoOptions}
          activeLoai={loaiSlug}
          activeCapDo={capDoSlug}
          q={q}
        />

        <div className="hn-content">
          {!result.ok && result.message ? (
            <p className="bv-hub-err" role="alert">
              {result.message}
            </p>
          ) : null}

          <section className="hn-ad-hero bv-hub-hero" aria-labelledby="bv-hub-hero-title">
            <div className="hn-ad-hero-text">
              <p className="hn-eyebrow">thư viện · khám phá</p>
              <h1 id="bv-hub-hero-title">
                <span className="em">Môn học &amp; kỹ năng</span>
                Thư viện nội dung CINs
              </h1>
              <p className="hn-ad-hero-desc">
                Môn học, keyword và phần mềm — tra cứu nhanh theo loại bài trên CINs. Nghề
                nghiệp và ngành học xem tại{" "}
                <Link href={NGHE_NGHIEP_HUB_PATH}>Hướng nghiệp</Link>.
              </p>
            </div>
          </section>

          {result.items.length === 0 ? (
            <div className="hn-empty">
              <p className="cins-body">Chưa có bài viết phù hợp bộ lọc.</p>
            </div>
          ) : showGrouped ? (
            sections.map((section) => (
              <section
                key={section.id}
                id={`bv-loai-${section.id}`}
                className="hn-dept"
                aria-labelledby={`bv-loai-${section.id}-title`}
              >
                <header className="hn-dept-head">
                  <div>
                    <h2 className="hn-dept-name" id={`bv-loai-${section.id}-title`}>
                      {section.title}
                      <span className="hn-dept-badge">
                        {String(section.index + 1).padStart(2, "0")} · {section.items.length}{" "}
                        bài
                      </span>
                    </h2>
                  </div>
                  <Link
                    href={buildBaiVietHubUrl({
                      loai: section.id,
                      cap_do: capDoSlug || undefined,
                    })}
                    className="hn-dept-tab"
                  >
                    Xem tất cả
                  </Link>
                </header>
                <ul className="hn-role-grid">
                  {section.items.map((row) => (
                    <BaiVietArticleCard key={row.id} row={row} />
                  ))}
                </ul>
              </section>
            ))
          ) : (
            <section className="hn-dept" aria-labelledby="bv-loai-filtered-title">
              <header className="hn-dept-head">
                <h2 className="hn-dept-name" id="bv-loai-filtered-title">
                  {loaiSlug && isHubLoaiId(loaiSlug)
                    ? hubLoaiLabel(loaiSlug)
                    : q
                      ? `Kết quả tìm “${q}”`
                      : "Tất cả bài viết"}
                  <span className="hn-dept-badge">{result.total} bài</span>
                </h2>
              </header>
              <ul className="hn-role-grid">
                {flatItems.map((row) => (
                  <BaiVietArticleCard key={row.id} row={row} />
                ))}
              </ul>
            </section>
          )}

          <BaiVietHubPagination
            page={page}
            totalPages={totalPages}
            total={result.total}
            pageSize={pageSize}
            loaiSlug={loaiSlug}
            capDoSlug={capDoSlug}
            q={q}
          />
        </div>
      </div>
    </div>
  );
}
