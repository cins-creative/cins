import { Suspense } from "react";

import { AuthGateRoot } from "@/components/auth/AuthGateProvider";
import { CinsShell } from "@/components/cins/CinsShell";
import { HomeWorldJourneyMain } from "@/components/cins/home-v2/HomeWorldJourneyMain";
import { HomeWorldJourneySkeleton } from "@/components/cins/home-v2/HomeWorldJourney.skeleton";
import { BeMatPageTracker } from "@/components/social/BeMatPageTracker";
import { parseProfileGiaoDien } from "@/lib/journey/profile-theme";
import { computeUserShellTheme } from "@/lib/journey/user-shell-theme";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type Props = {
  profileId: string;
  includeGallery: boolean;
  includeVideo: boolean;
  includeShopFeed: boolean;
  editingLayout: boolean;
  initialView?: string;
  initialPlayId?: string;
};

export async function HomeAuthedPage({
  profileId,
  includeGallery,
  includeVideo,
  includeShopFeed,
  editingLayout,
  initialView,
  initialPlayId,
}: Props) {
  const admin = createServiceRoleClient();
  const { data: gdRow } = await admin
    .from("user_nguoi_dung")
    .select("giao_dien")
    .eq("id", profileId)
    .maybeSingle<{ giao_dien: unknown }>();
  const shellTheme = computeUserShellTheme(
    parseProfileGiaoDien(gdRow?.giao_dien).theme,
  );

  return (
    <CinsShell
      data-screen-label="Trang-chu"
      data-cins-authed-home="1"
      {...(shellTheme
        ? {
            "data-user-theme": "1",
            ...(shellTheme.hasAccent ? { "data-user-accent": "1" } : {}),
            ...(shellTheme.hasPattern || shellTheme.hasImage
              ? { "data-user-pattern": "1" }
              : {}),
            ...(shellTheme.hasImage ? { "data-user-bg": "image" } : {}),
            style: shellTheme.style,
          }
        : {})}
    >
      <AuthGateRoot initialAuthenticated>
        <BeMatPageTracker
          nguon={includeGallery ? "gallery" : "journey_home"}
        />
        <Suspense fallback={<HomeWorldJourneySkeleton />}>
          <HomeWorldJourneyMain
            includeGallery={includeGallery}
            includeVideo={includeVideo}
            includeShopFeed={includeShopFeed}
            editingLayout={editingLayout}
            initialView={initialView}
            initialPlayId={initialPlayId}
          />
        </Suspense>
      </AuthGateRoot>
    </CinsShell>
  );
}
