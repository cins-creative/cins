"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useLab } from "@/components/lab/LabProvider";
import type { MockGiaiDoan } from "@/mocks/session";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/gallery", label: "Gallery" },
  { href: "/journey", label: "Journey" },
  { href: "/entity", label: "Entity" },
  { href: "/studio", label: "Studio" },
  { href: "/chat", label: "Chat" },
  { href: "/login", label: "Login" },
  { href: "/onboarding", label: "Onboarding" },
] as const;

const GIAI_DOAN_OPTIONS: { value: MockGiaiDoan; label: string }[] = [
  { value: "dang_hoc", label: "Đang học" },
  { value: "dang_lam", label: "Đang làm" },
  { value: "tim_viec", label: "Tìm việc" },
  { value: "freelance", label: "Freelance" },
  { value: "dang_day", label: "Đang dạy" },
];

export function LabChrome() {
  const pathname = usePathname();
  const {
    authenticated,
    setAuthenticated,
    giaiDoan,
    setGiaiDoan,
    persona,
  } = useLab();

  return (
    <header className="lab-chrome" data-lab-chrome>
      <span className="lab-chrome-brand">CINs UI Lab</span>
      <nav className="lab-chrome-nav" aria-label="Lab routes">
        {NAV.map((item) => {
          const current =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={current ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="lab-chrome-controls">
        <span className="lab-chrome-label">Session</span>
        <button
          type="button"
          className="lab-chrome-btn"
          aria-pressed={!authenticated}
          onClick={() => setAuthenticated(false)}
        >
          Guest
        </button>
        <button
          type="button"
          className="lab-chrome-btn"
          aria-pressed={authenticated}
          onClick={() => setAuthenticated(true)}
        >
          Logged-in
        </button>
        {authenticated ? (
          <>
            <span className="lab-chrome-label">giai_doan → {persona}</span>
            <select
              className="lab-chrome-select"
              value={giaiDoan}
              onChange={(e) => setGiaiDoan(e.target.value as MockGiaiDoan)}
              aria-label="Mock giai_doan"
            >
              {GIAI_DOAN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </>
        ) : null}
      </div>
    </header>
  );
}
