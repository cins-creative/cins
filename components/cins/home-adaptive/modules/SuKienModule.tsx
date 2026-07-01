import { CalendarDays, MapPin } from "lucide-react";

import { ModuleCard, ModuleEmpty } from "@/components/cins/home-adaptive/ModuleCard";
import type { HomeModuleCtx } from "@/components/cins/home-adaptive/types";
import { loadSidebarUpcomingEvents } from "@/lib/cins/home-adaptive/sidebar-upcoming-events";
import { SU_KIEN_LOAI_BY_PERSONA } from "@/lib/cins/home-adaptive/persona";
import { loadUpcomingEventsForHome } from "@/lib/cong-dong/events";

const MONTHS = ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"];

function eventDate(iso: string): { month: string; day: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { month: "", day: "" };
  return { month: MONTHS[d.getMonth()] ?? "", day: String(d.getDate()).padStart(2, "0") };
}

/** Module "Sự kiện sắp tới" — bổ sung toàn cục khi org theo dõi chưa đủ (brief §5). */
export async function SuKienModule({ ctx }: { ctx: HomeModuleCtx }) {
  const loaiFilter = SU_KIEN_LOAI_BY_PERSONA[ctx.persona];
  const [sidebarEvents, globalEvents] = await Promise.all([
    loadSidebarUpcomingEvents(ctx.viewerId, loaiFilter, 2),
    loadUpcomingEventsForHome(loaiFilter, 4),
  ]);

  const sidebarEventIds = new Set(
    sidebarEvents.map((i) => i.id.replace(/^sk:/, "")),
  );
  const supplemental = globalEvents.filter((ev) => !sidebarEventIds.has(ev.id));
  const showGlobal = sidebarEvents.length === 0;

  if (!showGlobal && supplemental.length === 0) return null;

  const events = showGlobal ? globalEvents : supplemental;

  return (
    <ModuleCard icon={CalendarDays} title="Sự kiện sắp tới">
      {events.length === 0 ? (
        <ModuleEmpty>Chưa có sự kiện sắp tới cho nhóm của bạn.</ModuleEmpty>
      ) : (
        events.map((ev) => {
          const { month, day } = eventDate(ev.batDau);
          return (
            <div key={ev.id} className="ha-ev">
              <div className="ha-ev-date">
                <div className="ha-ev-month">{month}</div>
                <div className="ha-ev-day">{day}</div>
              </div>
              <div className="ha-ev-meta">
                <div className="ha-ev-name">{ev.tieuDe}</div>
                {ev.diaDiem ? (
                  <div className="ha-ev-loc">
                    <MapPin size={11} strokeWidth={2} aria-hidden />
                    {ev.diaDiem}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })
      )}
    </ModuleCard>
  );
}
