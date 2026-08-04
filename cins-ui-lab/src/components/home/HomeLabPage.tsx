"use client";

import { GuestHomeLab } from "@/components/home/GuestHomeLab";
import { LoggedInHomeLab } from "@/components/home/LoggedInHomeLab";
import { useLab } from "@/components/lab/LabProvider";

/**
 * Lab Home page index.
 *
 * LOGIC_TOUCH:
 * - home.session-gate
 * - home.persona
 * - home.guest-data
 * - home.guest-login-panel
 * - home.feed
 * - home.sidebar-modules
 * - home.follow-org
 * - home.profile-completeness
 * - home.compose
 * - home.feed-boost
 */
export function HomeLabPage() {
  const { authenticated } = useLab();

  // LOGIC_TOUCH: home.session-gate
  // Real: app/page.tsx → getCurrentSessionAndProfile() branch
  // Mock: LabChrome session toggle
  // Apply: server session; remove chrome toggle from production
  if (authenticated) {
    return <LoggedInHomeLab />;
  }
  return (
    <div className="cins-shell--guest-home">
      <GuestHomeLab />
    </div>
  );
}
