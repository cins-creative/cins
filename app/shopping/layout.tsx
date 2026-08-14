import { AuthGateRoot } from "@/components/auth/AuthGateProvider";
import { CinsShell } from "@/components/cins/CinsShell";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";

import "@/app/shopping/cua-hang-listing.css";

export default async function CuaHangLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSessionAndProfile();
  return (
    <AuthGateRoot initialAuthenticated={Boolean(session?.profile)}>
      <CinsShell data-screen-label="Cua-hang">{children}</CinsShell>
    </AuthGateRoot>
  );
}
