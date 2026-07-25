import { AuthGateRoot } from "@/components/auth/AuthGateProvider";
import { CinsChatShellBridge } from "@/components/cins/CinsChatShellBridge";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";

import "@/app/login/login.css";
import "./journey/journey.css";
import "./journey/image-grid.css";
import "@/styles/article-rich-content.css";
import "./p/new/editor.css";
import "./p/[postSlug]/post-page.css";

export default async function UserProfileLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  const session = await getCurrentSessionAndProfile();
  const initialAuthenticated = Boolean(session?.profile);

  return (
    <AuthGateRoot initialAuthenticated={initialAuthenticated}>
      <CinsChatShellBridge viewerProfileId={session?.profile?.id ?? null}>
        {children}
        {modal}
      </CinsChatShellBridge>
    </AuthGateRoot>
  );
}
