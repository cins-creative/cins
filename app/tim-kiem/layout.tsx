import type { ReactNode } from "react";

import { AuthGateRoot } from "@/components/auth/AuthGateProvider";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";

import "@/app/cins-huong-nghiep-hub.css";
/* Card người dùng tái dùng thẻ bạn bè (.j-friend-*) + nút kết bạn/theo dõi. */
import "@/app/[slug]/journey/journey.css";
import "./tim-kiem.css";

export default async function TimKiemLayout({
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
