import Link from "next/link";

import { buildBaiVietHubUrl } from "@/lib/bai-viet/hub-loai";
import { buildPaginationItems } from "@/lib/bai-viet/pagination";

type Props = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  loaiSlug: string;
  capDoSlug: string;
  q: string;
};

export function BaiVietHubPagination({
  page,
  totalPages,
  total,
  pageSize,
  loaiSlug,
  capDoSlug,
  q,
}: Props) {
  if (totalPages <= 1) return null;

  const safePage = Math.min(Math.max(page, 1), totalPages);
  const from = (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);
  const items = buildPaginationItems(safePage, totalPages);

  const hrefFor = (p: number) =>
    buildBaiVietHubUrl({
      loai: loaiSlug || undefined,
      cap_do: capDoSlug || undefined,
      q: q || undefined,
      page: p > 1 ? p : undefined,
    });

  return (
    <nav className="bv-hub-pagination" aria-label="Phân trang danh sách">
      <p className="bv-hub-pagination-info">
        Hiển thị {from}–{to} / {total} bài
      </p>
      <div className="bv-hub-pagination-btns">
        {safePage > 1 ? (
          <Link href={hrefFor(safePage - 1)} className="bv-hub-page-btn" aria-label="Trang trước">
            ←
          </Link>
        ) : (
          <span className="bv-hub-page-btn bv-hub-page-btn--disabled" aria-hidden>
            ←
          </span>
        )}

        {items.map((item) =>
          item.kind === "ellipsis" ? (
            <span key={item.key} className="bv-hub-page-ellipsis" aria-hidden>
              …
            </span>
          ) : (
            <Link
              key={item.page}
              href={hrefFor(item.page)}
              className={`bv-hub-page-btn${item.page === safePage ? " is-active" : ""}`}
              aria-current={item.page === safePage ? "page" : undefined}
            >
              {item.page}
            </Link>
          ),
        )}

        {safePage < totalPages ? (
          <Link href={hrefFor(safePage + 1)} className="bv-hub-page-btn" aria-label="Trang sau">
            →
          </Link>
        ) : (
          <span className="bv-hub-page-btn bv-hub-page-btn--disabled" aria-hidden>
            →
          </span>
        )}
      </div>
    </nav>
  );
}
