"use client";

import Link from "next/link";

import {
  buildAdminBaiVietHref,
  type AdminArticleListParams,
  type AdminBaiVietTab,
} from "@/lib/admin/article-list-params";

type Props = {
  activeTab: AdminBaiVietTab;
  pendingDongGopCount?: number;
  listParams?: AdminArticleListParams;
  children: React.ReactNode;
};

export function AdminBaiVietTabShell({
  activeTab,
  pendingDongGopCount = 0,
  listParams = {},
  children,
}: Props) {
  const listHref = buildAdminBaiVietHref(listParams);
  const dongGopHref = buildAdminBaiVietHref(listParams, { tab: "dong-gop" });

  return (
    <>
      <header className="page-header admin-bai-viet-header">
        <div className="admin-bai-viet-header__copy">
          <h1 className="page-title">Bài viết & Tag</h1>
          {activeTab === "dong-gop" ? (
            <p className="page-subtitle">
              Thẩm định bản thảo cộng đồng — promote thành nội dung chính hoặc
              phản hồi contributor.
            </p>
          ) : null}
        </div>
      </header>

      <nav
        className="admin-bai-viet-tabs"
        aria-label="Phân loại bài viết"
      >
        <Link
          href={listHref}
          className={`admin-bai-viet-tab${activeTab === "list" ? " is-active" : ""}`}
          aria-current={activeTab === "list" ? "page" : undefined}
        >
          Danh sách
        </Link>
        <Link
          href={dongGopHref}
          className={`admin-bai-viet-tab${activeTab === "dong-gop" ? " is-active" : ""}`}
          aria-current={activeTab === "dong-gop" ? "page" : undefined}
        >
          Đóng góp
          {pendingDongGopCount > 0 ? (
            <span className="admin-bai-viet-tab-badge">
              {pendingDongGopCount > 99 ? "99+" : pendingDongGopCount}
            </span>
          ) : null}
        </Link>
      </nav>

      {children}
    </>
  );
}
