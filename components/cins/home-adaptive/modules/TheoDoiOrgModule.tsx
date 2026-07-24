import { CalendarDays } from "lucide-react";

import { HaOrgUpcomingEventsPanel } from "@/components/cins/home-adaptive/HaOrgUpcomingEventsPanel";
import { ModuleCard } from "@/components/cins/home-adaptive/ModuleCard";
import { WorldJourneyNotifyFab } from "@/components/cins/home-adaptive/WorldJourneyNotifyFab";
import type { HomeModuleCtx } from "@/components/cins/home-adaptive/types";
import { loadSidebarUpcomingEvents } from "@/lib/cins/home-adaptive/sidebar-upcoming-events";

/** Sidebar · tối đa 3 sự kiện / mốc (ưu tiên quan tâm / sẽ tham gia / org theo dõi). */
export async function TheoDoiOrgModule({ ctx }: { ctx: HomeModuleCtx }) {
  const { items, myEventsTotal } = await loadSidebarUpcomingEvents(
    ctx.viewerId,
    [],
    3,
  );

  if (items.length === 0) return null;

  /** Badge: tổng sự kiện của bạn nếu có; không thì số mục đang hiển thị. */
  const notifyCount = myEventsTotal > 0 ? myEventsTotal : items.length;

  return (
    <WorldJourneyNotifyFab count={notifyCount}>
      <ModuleCard
        icon={CalendarDays}
        title="Sự kiện & thông báo"
        className="ha-card--notify"
      >
        <HaOrgUpcomingEventsPanel
          items={items}
          myEventsTotal={myEventsTotal}
        />
      </ModuleCard>
    </WorldJourneyNotifyFab>
  );
}
