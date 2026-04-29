"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { MsIcon } from "@/components/cins/MsIcon";

export function SiteNav() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isCareer =
    pathname === "/nghe-nghiep" || pathname.startsWith("/nghe-nghiep/");

  return (
    <header className="site-nav" role="banner">
      <div className="site-nav-inner">
        <Link href="/" className="site-nav-brand">
          <img src="/assets/logo-cins.png" alt="CINs" width={112} height={28} />
        </Link>

        <nav className="site-nav-desktop" aria-label="Điều hướng chính">
          <Link
            href="/"
            className={`site-nav-link${isHome ? " is-active" : ""}`}
          >
            Trang chủ
          </Link>
          <Link
            href="/nghe-nghiep"
            className={`site-nav-link${isCareer ? " is-active" : ""}`}
          >
            Hướng nghiệp
          </Link>
          <Link href="#" className="site-nav-link">
            Trường Đại học
          </Link>
          <Link href="#" className="site-nav-link">
            Bài viết
          </Link>
        </nav>

        <div className="site-nav-end">
          <div className="site-nav-tools">
            <button
              type="button"
              className="site-nav-search-btn"
              aria-label="Tìm kiếm"
            >
              <MsIcon name="search" className="site-nav-search-ic" />
            </button>
            <Link href="#" className="site-nav-cta">
              Đăng ký miễn phí
            </Link>
          </div>

          <details className="site-nav-menu">
            <summary className="site-nav-menu-toggle" aria-label="Mở menu">
              <MsIcon name="menu" className="site-nav-menu-icon" />
            </summary>
            <div className="site-nav-menu-panel">
              <Link
                href="/"
                className={`site-nav-menu-link${isHome ? " is-active" : ""}`}
              >
                Trang chủ
              </Link>
              <Link
                href="/nghe-nghiep"
                className={`site-nav-menu-link${isCareer ? " is-active" : ""}`}
              >
                Hướng nghiệp
              </Link>
              <Link href="#" className="site-nav-menu-link">
                Trường Đại học
              </Link>
              <Link href="#" className="site-nav-menu-link">
                Bài viết
              </Link>
              <button
                type="button"
                className="site-nav-menu-search"
                aria-label="Tìm kiếm"
              >
                <MsIcon name="search" className="site-nav-ic" />
                Tìm kiếm
              </button>
              <div className="site-nav-menu-actions">
                <Link href="#" className="site-nav-menu-cta">
                  Đăng ký miễn phí
                </Link>
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
