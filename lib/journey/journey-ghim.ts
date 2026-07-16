import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

type JourneyGhimRow = {
  milestone_key: string;
  ghim_luc: string;
};

/** Map milestone_key → ghim_luc cho Journey timeline của chủ trang. */
export async function loadJourneyGhimByMilestoneKey(
  ownerUserId: string,
): Promise<Map<string, string>> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("user_journey_ghim")
    .select("milestone_key, ghim_luc")
    .eq("id_nguoi_dung", ownerUserId)
    .returns<JourneyGhimRow[]>();

  if (error || !data?.length) {
    return new Map();
  }

  const map = new Map<string, string>();
  for (const row of data) {
    const key = row.milestone_key?.trim();
    if (key) map.set(key, row.ghim_luc);
  }
  return map;
}

type JourneyGhimAttachable = {
  id: string;
  journeyGhimLuc?: string | null;
};

export function attachJourneyGhimToItems<T extends JourneyGhimAttachable>(
  items: T[],
  ghimByKey: ReadonlyMap<string, string>,
): T[] {
  if (ghimByKey.size === 0) return items;
  return items.map((item) => {
    const ghimLuc = ghimByKey.get(item.id) ?? null;
    if (!ghimLuc) {
      return item.journeyGhimLuc ? { ...item, journeyGhimLuc: null } : item;
    }
    return { ...item, journeyGhimLuc: ghimLuc };
  });
}
