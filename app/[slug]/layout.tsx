import { AuthGateRoot } from "@/components/auth/AuthGateProvider";

import "./journey/journey.css";
import "./journey/image-grid.css";
import "@/components/journey/journey-theme.css";
import "@/styles/article-rich-content.css";
/* editor.css + post-page.css: trang p/ và overlay bài/compose tự import.
   Không gắn layout slug — tránh CSS editor chặn first paint hồ sơ/shop. */

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
