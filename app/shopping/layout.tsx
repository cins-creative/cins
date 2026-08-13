import { CinsShell } from "@/components/cins/CinsShell";

import "@/app/shopping/cua-hang-listing.css";

export default function CuaHangLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CinsShell data-screen-label="Cua-hang">{children}</CinsShell>;
}
