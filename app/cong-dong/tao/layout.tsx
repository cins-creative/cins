import { CinsShell } from "@/components/cins/CinsShell";

import "@/app/login/login.css";
import "@/app/tao-to-chuc/tao-to-chuc.css";

export default function TaoCongDongLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <CinsShell data-screen-label="Tao-cong-dong">{children}</CinsShell>
  );
}
