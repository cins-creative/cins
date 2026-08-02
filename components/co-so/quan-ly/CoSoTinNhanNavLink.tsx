"use client";

import { OrgTinNhanNavLink } from "@/components/to-chuc/quan-ly/OrgTinNhanNavLink";

type Props = {
  orgId: string;
  orgSlug: string;
  active: boolean;
};

/** Wrapper mỏng — logic nằm ở `OrgTinNhanNavLink`. */
export function CoSoTinNhanNavLink({ orgId, orgSlug, active }: Props) {
  return (
    <OrgTinNhanNavLink
      orgKind="co_so_dao_tao"
      orgId={orgId}
      orgSlug={orgSlug}
      active={active}
    />
  );
}
