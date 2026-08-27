import Link from "next/link";

import { webHref } from "@/lib/cins/manage-site";

export function SidebarBrandStaticLink() {
  return (
    <Link href={webHref("/")} className="sb-brand" aria-label="C.INS trang chủ">
      <span className="sb-brand-static" aria-hidden>
        <img src="/assets/logo-cins-icon.svg" alt="" />
      </span>
    </Link>
  );
}
