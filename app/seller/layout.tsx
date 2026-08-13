import type { ReactNode } from "react";

import { CinsShell } from "@/components/cins/CinsShell";
import { BanHangShell } from "@/components/shop/BanHangShell";

export default function BanHangLayout({ children }: { children: ReactNode }) {
  return (
    <CinsShell data-screen-label="Ban-hang">
      <BanHangShell>{children}</BanHangShell>
    </CinsShell>
  );
}
