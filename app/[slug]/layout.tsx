import { AuthGateRoot } from "@/components/auth/AuthGateProvider";

import "@/app/login/login.css";
import "./journey/journey.css";
import "./journey/image-grid.css";
import "@/components/journey/journey-theme.css";
import "@/styles/article-rich-content.css";
import "./p/new/editor.css";
import "./p/[postSlug]/post-page.css";

/**
 * Không await session ở đây — nếu layout chặn, `loading.tsx` cũng không hiện kịp.
 * AuthGate hydrate từ cookie phía client; chat id hydrate trong CinsShell.
 */
export default function UserProfileLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  return (
    <AuthGateRoot initialAuthenticated={false}>
      {children}
      {modal}
    </AuthGateRoot>
  );
}
