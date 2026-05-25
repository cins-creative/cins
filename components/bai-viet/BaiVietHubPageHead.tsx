import Link from "next/link";

import { hubLoaiLabel, isHubLoaiId } from "@/lib/bai-viet/hub-loai";

type Props = {
  activeLoai: string;
  searchQuery: string;
  activeCapDo: string;
};

export function BaiVietHubPageHead({
  activeLoai,
  searchQuery,
  activeCapDo,
}: Props) {
  const here = activeLoai && isHubLoaiId(activeLoai)
    ? hubLoaiLabel(activeLoai)
    : "Thư viện nội dung";

  return (
    <div className="hn-page-head">
      <div className="hn-page-head-inner">
        <div className="hn-head-row">
          <nav className="hn-crumbs" aria-label="Breadcrumb">
            <Link href="/">CINs</Link>
            <span className="hn-crumbs-sep" aria-hidden>
              ›
            </span>
            <span className="hn-crumbs-here">{here}</span>
          </nav>

          <form action="/bai-viet" method="get" className="hn-head-search" role="search">
            {activeLoai ? <input type="hidden" name="loai" value={activeLoai} /> : null}
            {activeCapDo ? (
              <input type="hidden" name="cap_do" value={activeCapDo} />
            ) : null}
            <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              type="search"
              name="q"
              defaultValue={searchQuery}
              placeholder="Tìm tên bài viết, keyword, môn học…"
              aria-label="Tìm bài viết"
            />
          </form>
        </div>
      </div>
    </div>
  );
}
