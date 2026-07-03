"use client";

import { createPortal } from "react-dom";

import {
  UserAccountMenu,
  type SwitchableAccount,
  type UserAccountProfile,
} from "@/components/cins/UserAccountMenu";

export function HomeV2TopbarUserMenu({
  mountEl,
  profile,
  savedAccounts = [],
}: {
  mountEl: HTMLElement | null;
  profile: UserAccountProfile | null;
  savedAccounts?: SwitchableAccount[];
}) {
  if (!mountEl || !profile) return null;

  return createPortal(
    <UserAccountMenu
      profile={profile}
      placement="topbar"
      savedAccounts={savedAccounts}
    />,
    mountEl,
  );
}
