import { AuthGateRoot } from "@/components/auth/AuthGateProvider";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";

import "./co-so-page.css";

export default async function CoSoLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentSessionAndProfile();
  const initialAuthenticated = Boolean(session?.profile);

  return (
    <AuthGateRoot initialAuthenticated={initialAuthenticated}>
      {children}
    </AuthGateRoot>
  );
}
