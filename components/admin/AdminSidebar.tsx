"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { section: "Nội dung" },
  { href: "/admin/bai-viet", label: "Bài viết", icon: "doc" },
  { href: "/admin/noi-dung-dang", label: "Nội dung đăng", icon: "grid" },
  { href: "/admin/tuyen-dung", label: "Tuyển dụng", icon: "briefcase" },
  { href: "/admin/tag", label: "Quản lý Tag", icon: "tag" },
  { href: "/admin/bao-cao", label: "Báo cáo", icon: "flag" },
  { href: "/admin/giao-dich", label: "Giao dịch", icon: "cart" },
  { href: "/admin/gop-y", label: "Góp ý", icon: "message" },
  { section: "Tổ chức" },
  { href: "/admin/to-chuc", label: "Tổ chức", icon: "org" },
  { href: "/admin/nganh", label: "Ngành đào tạo", icon: "edu" },
  { href: "/admin/mon-thi", label: "Môn & khối thi", icon: "subject" },
  { section: "Users" },
  { href: "/admin/nguoi-dung", label: "Người dùng", icon: "users" },
  { section: "Hệ thống" },
  { href: "/admin/linh-vuc", label: "Lĩnh vực", icon: "grid" },
  { href: "/admin/analytics", label: "Analytics", icon: "chart" },
] as const;

function NavIcon({ name }: { name: string }) {
  const p = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "doc":
      return (
        <svg {...p}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      );
    case "briefcase":
      return (
        <svg {...p}>
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      );
    case "tag":
      return (
        <svg {...p}>
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      );
    case "org":
      return (
        <svg {...p}>
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      );
    case "edu":
      return (
        <svg {...p}>
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      );
    case "check":
      return (
        <svg {...p}>
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      );
    case "subject":
      return (
        <svg {...p}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <line x1="8" y1="7" x2="16" y2="7" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      );
    case "users":
      return (
        <svg {...p}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "grid":
      return (
        <svg {...p}>
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      );
    case "chart":
      return (
        <svg {...p}>
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
    case "flag":
      return (
        <svg {...p}>
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" y1="22" x2="4" y2="15" />
        </svg>
      );
    case "cart":
      return (
        <svg {...p}>
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      );
    case "message":
      return (
        <svg {...p}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "edit":
      return (
        <svg {...p}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      );
    case "sql":
      return (
        <svg {...p}>
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
          <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
        </svg>
      );
    default:
      return null;
  }
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar-col" aria-label="Điều hướng admin">
      <div className="admin-sidebar-panel">
        <div className="sidebar-logo">
          <Link href="/" className="sidebar-logo-link">
            <img
              src="/assets/logo-cins-wide.svg"
              alt="C.INS"
              className="sidebar-logo-img"
            />
            <small>Admin nội bộ</small>
          </Link>
        </div>

        <nav className="sidebar-nav">
          {NAV.map((item, i) => {
            if ("section" in item) {
              return (
                <div key={`sec-${i}`} className="nav-section">
                  {item.section}
                </div>
              );
            }
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item${active ? " active" : ""}`}
              >
                <NavIcon name={item.icon} />
                <span className="nav-item-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="sidebar-avatar" aria-hidden>
              C
            </div>
            <div className="sidebar-user-info">
              <p>CINS Admin</p>
              <small>Owner</small>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
