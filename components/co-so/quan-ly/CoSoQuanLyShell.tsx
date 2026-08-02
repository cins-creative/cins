"use client";

import type { ReactNode } from "react";

import { OrgQuanLyShell } from "@/components/to-chuc/quan-ly/OrgQuanLyShell";
import type { CoSoQuanLySection } from "@/lib/to-chuc/co-so-routes";

type Props = {
  orgId: string;
  orgSlug: string;
  orgTen: string;
  active: CoSoQuanLySection;
  /** Founder tier (owner/admin) — hiện link Cài đặt tối cao bên phải nav. */
  isFounder?: boolean;
  children: ReactNode;
};

/** Wrapper mỏng — logic nằm ở `OrgQuanLyShell`. */
export function CoSoQuanLyShell(props: Props) {
  return <OrgQuanLyShell orgKind="co_so_dao_tao" {...props} />;
}
