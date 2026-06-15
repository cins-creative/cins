import "server-only";

import { fetchGalleryTotalCount } from "@/lib/journey/gallery-page-fetch";
import { countUserOrganizations } from "@/lib/journey/user-orgs-fetch";
import { countFriends } from "@/lib/social/ket-ban";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Count nhẹ cho nav switch — không hydrate timeline/gallery/friends. */
export async function fetchJourneySwitchNavCounts(params: {
  ownerId: string;
}): Promise<{
  journeyCount: number;
  galleryCount: number;
  friendCount: number;
  orgCount: number;
}> {
  const admin = createServiceRoleClient();
  const [{ count: tacPhamCount }, galleryCount, friendCount, orgCount] =
    await Promise.all([
    admin
      .from("content_tac_pham")
      .select("id", { count: "exact", head: true })
      .eq("id_nguoi_dung", params.ownerId),
    fetchGalleryTotalCount(params.ownerId),
    countFriends(params.ownerId),
    countUserOrganizations(params.ownerId),
  ]);

  return {
    journeyCount: tacPhamCount ?? 0,
    galleryCount,
    friendCount,
    orgCount,
  };
}
