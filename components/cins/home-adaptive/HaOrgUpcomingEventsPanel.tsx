import Link from "next/link";

import { HaOrgUpcomingListRow } from "@/components/cins/home-adaptive/HaOrgUpcomingListRow";
import { HaOrgUpcomingRow } from "@/components/cins/home-adaptive/HaOrgUpcomingRow";
import type { SidebarUpcomingEvent } from "@/lib/cins/home-adaptive/sidebar-upcoming-events";

type Props = {
  items: SidebarUpcomingEvent[];
  myEventsTotal: number;
};

/** Sidebar sự kiện: 1 banner + tối đa 2 dòng listing + Xem thêm. */
export function HaOrgUpcomingEventsPanel({ items, myEventsTotal }: Props) {
  if (items.length === 0) return null;

  const [featured, ...rest] = items;

  return (
    <>
      <ul className="ha-org-up-list">
        {featured ? <HaOrgUpcomingRow item={featured} /> : null}
        {rest.map((item) => (
          <HaOrgUpcomingListRow key={item.id} item={item} />
        ))}
      </ul>
      {myEventsTotal > 3 ? (
        <p className="ha-org-up-more">
          <Link href="/su-kien?tab=cua-ban" prefetch={false}>
            Xem thêm
          </Link>
        </p>
      ) : null}
    </>
  );
}
