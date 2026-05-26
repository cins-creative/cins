import type { ComponentPropsWithoutRef } from "react";

import { CinsAppTopbar } from "@/components/cins/CinsAppTopbar";
import {
  CinsAppSidebar,
  SiteNavEffects,
} from "@/components/cins/SiteNav";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getAvatarUrl } from "@/lib/journey/profile";

/**
 * Async server component — fetch session để truyền profile xuống sidebar
 * (user card kiểu X: avatar + tên + handle + menu 3 chấm). Topbar vẫn tự
 * fetch session riêng nội bộ; không gộp ở đây để giữ split UI rõ ràng
 * (sidebar = nav + account card, topbar = quiz/asks).
 */
export async function CinsShell({
  children,
  ...shellProps
}: ComponentPropsWithoutRef<"div"> & { children: React.ReactNode }) {
  const session = await getCurrentSessionAndProfile();
  /* Chỉ truyền profile khi user đã có slug (qua onboarding). User mới đăng
     nhập chưa có slug → ẩn user card (tránh link tới `/journey` 404). */
  const sidebarProfile =
    session?.profile && session.profile.slug
      ? {
          slug: session.profile.slug,
          tenHienThi: session.profile.ten_hien_thi,
          avatarUrl: getAvatarUrl(session.profile.avatar_id),
        }
      : null;

  return (
    <div className="cins-shell" {...shellProps}>
      <SiteNavEffects />
      <CinsAppSidebar profile={sidebarProfile} />
      <div className="cins-shell-column">
        <CinsAppTopbar />
        <main className="cins-main">{children}</main>
      </div>
    </div>
  );
}
