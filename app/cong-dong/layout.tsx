import { AuthGateRoot } from "@/components/auth/AuthGateProvider";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";

import "@/app/login/login.css";
import "@/app/[slug]/journey/image-grid.css";
import "@/app/[slug]/journey/journey.css";
import "@/app/[slug]/p/[postSlug]/post-page.css";
import "@/app/[slug]/p/new/editor.css";
import "@/styles/article-rich-content.css";
import "@/app/cins-truong-dai-hoc.css";
import "@/app/cins-truong-chi-tiet-v6.css";
import "@/app/cins-truong-inline-edit.css";
import "@/app/co-so/co-so-page.css";
import "@/app/org-notify-fab.css";
import "./cong-dong.css";

export default async function CongDongLayout({
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
