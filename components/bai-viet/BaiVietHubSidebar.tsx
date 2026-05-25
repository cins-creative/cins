import Link from "next/link";

import { buildBaiVietHubUrl } from "@/lib/bai-viet/hub-loai";
import type { BlogHubFilterNhom, BlogHubLoaiTab } from "@/lib/bai-viet/types";

type Props = {
  loaiTabs: BlogHubLoaiTab[];
  capDoOptions: BlogHubFilterNhom[];
  activeLoai: string;
  activeCapDo: string;
  q: string;
};

function ChevronDown() {
  return (
    <svg
      className="hn-rail-chev"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function BaiVietHubSidebar({
  loaiTabs,
  capDoOptions,
  activeLoai,
  activeCapDo,
  q,
}: Props) {
  const hasFilters = Boolean(activeLoai || activeCapDo || q);

  return (
    <aside className="hn-rail" aria-label="Lọc loại bài viết">
      <ul className="hn-rail-list">
        <li>
          <p className="bv-hub-rail-label">Loại bài viết</p>
          <ul className="hn-rail-sub hn-rail-sub--flat">
            <li>
              <Link
                href={buildBaiVietHubUrl({
                  cap_do: activeCapDo || undefined,
                  q: q || undefined,
                })}
                className={!activeLoai ? "is-on" : undefined}
              >
                Tất cả
              </Link>
            </li>
            {loaiTabs.map((tab) => (
              <li key={tab.id}>
                <Link
                  href={buildBaiVietHubUrl({
                    loai: tab.id,
                    cap_do: activeCapDo || undefined,
                    q: q || undefined,
                  })}
                  className={activeLoai === tab.id ? "is-on" : undefined}
                >
                  {tab.label}
                  <span className="hn-rail-badge">{tab.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </li>

        {capDoOptions.length > 0 ? (
          <li>
            <details className="hn-rail-group hn-rail-group--cap" open={Boolean(activeCapDo)}>
              <summary>
                <span className="hn-rail-label">Cấp độ</span>
                <ChevronDown />
              </summary>
              <ul className="hn-rail-sub">
                <li>
                  <Link
                    href={buildBaiVietHubUrl({
                      loai: activeLoai || undefined,
                      q: q || undefined,
                    })}
                    className={!activeCapDo ? "is-on" : undefined}
                  >
                    Tất cả cấp độ
                  </Link>
                </li>
                {capDoOptions.map((o) => (
                  <li key={o.slug}>
                    <Link
                      href={buildBaiVietHubUrl({
                        loai: activeLoai || undefined,
                        cap_do: o.slug,
                        q: q || undefined,
                      })}
                      className={activeCapDo === o.slug ? "is-on" : undefined}
                    >
                      {o.ten}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          </li>
        ) : null}
      </ul>

      {hasFilters ? (
        <Link href="/bai-viet" className="bv-hub-rail-reset">
          Xóa bộ lọc
        </Link>
      ) : null}
    </aside>
  );
}
