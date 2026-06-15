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
import "@/app/org-page-settings-modal.css";
import "@/app/cins-truong-listing.css";
import "@/components/tag/entity-page.css";
import "@/styles/article-rich-content.css";
/* JourneyPostModal — load sau truong CSS để byline/BL thắng cascade. */
import "@/app/[slug]/p/[postSlug]/post-page.css";

export default async function TruongDaiHocLayout({
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
