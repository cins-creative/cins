"use client";

import {
  CinsAppSidebar,
  SiteNavEffects,
} from "@/components/cins/SiteNav";

import "@/app/cins-app-nav.css";

/** Client boundary — sidebar + hiệu ứng nav (tránh Turbopack HMR lỗi factory). */
export function CinsShellNav() {
  return (
    <>
      <SiteNavEffects />
      <CinsAppSidebar />
    </>
  );
}
