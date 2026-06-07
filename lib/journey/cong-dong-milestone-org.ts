import "server-only";

import type { MilestoneCongDongOrg } from "@/components/journey/milestone-types";
import { getAvatarUrl, getProfileCoverUrl } from "@/lib/journey/profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type OrgRow = {
  id: string;
  ten: string;
  slug: string;
  loai_to_chuc: string;
  avatar_id: string | null;
  cover_id: string | null;
};

export async function loadCongDongOrgsForMilestones(
  orgIds: string[],
): Promise<Map<string, MilestoneCongDongOrg>> {
  const out = new Map<string, MilestoneCongDongOrg>();
  const unique = [...new Set(orgIds.filter(Boolean))];
  if (unique.length === 0) return out;

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select("id, ten, slug, loai_to_chuc, avatar_id, cover_id")
    .in("id", unique)
    .eq("loai_to_chuc", "cong_dong")
    .returns<OrgRow[]>();

  for (const org of data ?? []) {
    out.set(org.id, {
      orgId: org.id,
      name: org.ten,
      slug: org.slug,
      href: `/cong-dong/${org.slug}`,
      avatarUrl: getAvatarUrl(org.avatar_id) ?? null,
      coverUrl: getProfileCoverUrl(org.cover_id) ?? null,
      initial: org.ten.charAt(0).toUpperCase(),
    });
  }

  return out;
}
