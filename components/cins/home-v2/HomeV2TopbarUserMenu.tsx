"use client";

import { createPortal } from "react-dom";

import {
  UserAccountMenu,
  type UserAccountProfile,
} from "@/components/cins/UserAccountMenu";

export function HomeV2TopbarUserMenu({
  mountEl,
  profile,
}: {
  mountEl: HTMLElement | null;
  profile: UserAccountProfile | null;
}) {
  if (!mountEl || !profile) return null;

  return createPortal(
    <UserAccountMenu profile={profile} placement="topbar" />,
    mountEl,
  );
}
