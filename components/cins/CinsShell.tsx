import type { ComponentPropsWithoutRef } from "react";

import { SiteNav } from "@/components/cins/SiteNav";

export function CinsShell({
  children,
  ...shellProps
}: ComponentPropsWithoutRef<"div"> & { children: React.ReactNode }) {
  return (
    <div className="cins-shell" {...shellProps}>
      <SiteNav />
      <main className="cins-main">{children}</main>
    </div>
  );
}
