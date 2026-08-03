import { HaOrgUpcomingEventsPanel } from "@/components/cins/home-adaptive/HaOrgUpcomingEventsPanel";
import { WorldJourneyNotifyFab } from "@/components/cins/home-adaptive/WorldJourneyNotifyFab";
import type { HomeModuleCtx } from "@/components/cins/home-adaptive/types";
import { moduleItemLimit } from "@/components/cins/home-adaptive/types";
import { loadSidebarUpcomingEvents } from "@/lib/cins/home-adaptive/sidebar-upcoming-events";

/** Sidebar · sự kiện (Tất cả / Quan tâm + quầy) trong 1 block. */
export async function TheoDoiOrgModule({ ctx }: { ctx: HomeModuleCtx }) {
  const { allItems, myItems, myEventsTotal } = await loadSidebarUpcomingEvents(
    ctx.viewerId,
    [],
    moduleItemLimit(ctx, "theo_doi_org", 3),
  );

  if (allItems.length === 0 && myItems.length === 0) return null;

  const notifyCount = Math.max(
    myItems.length,
    allItems.length,
    myEventsTotal,
  );

  return (
    <WorldJourneyNotifyFab count={notifyCount}>
      <HaOrgUpcomingEventsPanel
        allItems={allItems}
        myItems={myItems}
        myEventsTotal={myEventsTotal}
      />
    </WorldJourneyNotifyFab>
  );
}
