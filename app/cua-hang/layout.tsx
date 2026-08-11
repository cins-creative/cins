import { CinsShell } from "@/components/cins/CinsShell";

import "@/app/cua-hang/cua-hang-listing.css";

export default function CuaHangLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CinsShell data-screen-label="Cua-hang">{children}</CinsShell>;
}
