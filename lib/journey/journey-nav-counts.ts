import "server-only";

import { fetchGalleryTotalCount } from "@/lib/journey/gallery-page-fetch";
import { countMutualFriends } from "@/lib/social/follow";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Count nhẹ cho nav switch — không hydrate timeline/gallery/friends. */
export async function fetchJourneySwitchNavCounts(params: {
  ownerId: string;
}): Promise<{
  journeyCount: number;
  galleryCount: number;
  friendCount: number;
}> {
  const admin = createServiceRoleClient();
  const [{ count: tacPhamCount }, galleryCount, friendCount] = await Promise.all([
    admin
      .from("content_tac_pham")
      .select("id", { count: "exact", head: true })
      .eq("id_nguoi_dung", params.ownerId),
    fetchGalleryTotalCount(params.ownerId),
    countMutualFriends(params.ownerId),
  ]);

  return {
    journeyCount: tacPhamCount ?? 0,
    galleryCount,
    friendCount,
  };
}
