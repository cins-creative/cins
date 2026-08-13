import type { ReactNode } from "react";

import { AuthGateRoot } from "@/components/auth/AuthGateProvider";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";

import "@/app/login/login.css";
import "@/app/[slug]/journey/image-grid.css";
import "@/app/[slug]/journey/journey.css";
import "@/app/[slug]/p/new/editor.css";
import "@/app/articles/article-page.css";
import "@/app/articles/article-layout-v2.css";
import "@/app/articles/article-layout-nghe.css";
import "@/app/articles/article-layout-keyword.css";
import "@/components/tag/entity-page.css";
import "@/app/articles/entity-article.css";
import "@/styles/article-content.css";
import "@/styles/article-rich-content.css";
import "@/app/articles/article-keyword-inline.css";

export default async function FandomLayout({
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
