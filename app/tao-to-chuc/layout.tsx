import { AuthGateRoot } from "@/components/auth/AuthGateProvider";
import { CinsShell } from "@/components/cins/CinsShell";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";

import "@/app/login/login.css";
import "./tao-to-chuc.css";

export default async function TaoToChucLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentSessionAndProfile();
  const initialAuthenticated = Boolean(session?.profile);

  return (
    <AuthGateRoot initialAuthenticated={initialAuthenticated}>
      <CinsShell data-screen-label="Tao-to-chuc">{children}</CinsShell>
    </AuthGateRoot>
  );
}
