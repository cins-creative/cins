import type { ReactNode } from "react";

import { AuthGateRoot } from "@/components/auth/AuthGateProvider";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";

import "@/app/bai-viet/article-page.css";
import "@/app/bai-viet/article-layout-v2.css";
import "@/app/bai-viet/article-layout-nghe.css";
import "@/app/bai-viet/article-layout-keyword.css";
import "@/app/bai-viet/article-layout-software.css";
import "@/app/bai-viet/article-keyword-inline.css";
import "@/components/tag/entity-page.css";
import "@/app/bai-viet/entity-article.css";
import "@/app/[slug]/journey/journey.css";
import "@/app/[slug]/p/[postSlug]/post-page.css";
import "@/styles/article-content.css";
import "@/styles/article-rich-content.css";
import "@/app/login/login.css";

export default async function BaiVietLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getCurrentSessionAndProfile();
  const initialAuthenticated = Boolean(session?.profile);

  return (
    <AuthGateRoot initialAuthenticated={initialAuthenticated}>
      {children}
    </AuthGateRoot>
  );
}
