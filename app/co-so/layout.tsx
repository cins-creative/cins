import type { ReactNode } from "react";

import { AuthGateRoot } from "@/components/auth/AuthGateProvider";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";

import "@/app/[slug]/journey/image-grid.css";
import "@/app/[slug]/journey/journey.css";
import "@/app/[slug]/p/new/editor.css";
import "@/app/cins-inline-multi-image.css";
import "@/app/cins-truong-dai-hoc.css";
import "@/app/cins-truong-chi-tiet-v6.css";
import "@/app/cins-truong-inline-edit.css";
import "@/app/cins-truong-listing.css";
import "@/styles/article-rich-content.css";
import "./co-so-page.css";

export default async function CoSoLayout({
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
