import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { fetchUserOrganizationsPage } from "@/lib/journey/user-orgs-fetch";

export const dynamic = "force-dynamic";

export type MyOrgItem = {
  id: string;
  slug: string;
  ten: string;
  loaiToChuc: string;
  loaiLabel: string;
  avatarUrl: string | null;
  href: string | null;
  vaiTro: string;
  vaiTroLabel: string;
};

export async function GET() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile?.id) {
    return NextResponse.json({ orgs: [] as MyOrgItem[] });
  }

  const { memberships } = await fetchUserOrganizationsPage(session.profile.id);
  const orgs: MyOrgItem[] = memberships.map((m) => ({
    id: m.org.id,
    slug: m.org.slug,
    ten: m.org.ten,
    loaiToChuc: m.org.loaiToChuc,
    loaiLabel: m.org.loaiLabel,
    avatarUrl: m.org.avatarUrl,
    href: m.org.href,
    vaiTro: m.vaiTro,
    vaiTroLabel: m.vaiTroLabel,
  }));

  return NextResponse.json({ orgs });
}
