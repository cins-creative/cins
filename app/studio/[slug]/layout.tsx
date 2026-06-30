import type { ReactNode } from "react";
import { Suspense } from "react";

import { AuthGateRoot } from "@/components/auth/AuthGateProvider";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { StudioDetailLoader } from "@/app/studio/[slug]/_components/StudioDetailLoader";
import StudioDetailLoading from "@/app/studio/[slug]/loading";

import "@/app/[slug]/journey/image-grid.css";
import "@/app/[slug]/journey/journey.css";
import "@/app/[slug]/p/new/editor.css";
import "@/app/cins-inline-multi-image.css";
import "@/app/cins-truong-dai-hoc.css";
import "@/app/cins-truong-chi-tiet-v6.css";
import "@/app/cins-truong-inline-edit.css";
import "@/app/cins-truong-listing.css";
import "@/components/tag/entity-page.css";
import "@/styles/article-rich-content.css";
import "@/app/co-so/co-so-page.css";
import "./studio-page.css";
import "@/app/[slug]/p/[postSlug]/post-page.css";

type Props = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

/** Shell + fetch một lần; đổi tab qua URL mà không remount layout. */
export default async function StudioSlugLayout({ children, params }: Props) {
  const { slug } = await params;
  const session = await getCurrentSessionAndProfile();
  const initialAuthenticated = Boolean(session?.profile);

  return (
    <AuthGateRoot initialAuthenticated={initialAuthenticated}>
      <Suspense fallback={<StudioDetailLoading />}>
        <StudioDetailLoader slug={slug} />
      </Suspense>
      {children}
    </AuthGateRoot>
  );
}
