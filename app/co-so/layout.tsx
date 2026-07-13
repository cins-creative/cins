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
import "@/components/tag/entity-page.css";
import "@/styles/article-rich-content.css";
/* Tab Tuyển dụng của cơ sở tái dùng component + style của studio (nút «Đăng tin
   mới», thẻ tin, popup chi tiết/sửa). Trên trang v6 `.sec-hdr` bị ẩn mặc định,
   file này chứa override `.sec-hdr.studio-jobs-hdr` để hiện lại header + nút. */
import "@/app/studio/[slug]/studio-page.css";
import "@/app/org-notify-fab.css";
import "./co-so-page.css";
/* JourneyPostModal — load sau truong CSS để byline/BL thắng cascade. */
import "@/app/[slug]/p/[postSlug]/post-page.css";

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
