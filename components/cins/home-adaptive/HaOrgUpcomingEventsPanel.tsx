"use client";

import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { HaOrgUpcomingListRow } from "@/components/cins/home-adaptive/HaOrgUpcomingListRow";
import { HaOrgUpcomingRow } from "@/components/cins/home-adaptive/HaOrgUpcomingRow";
import type { SidebarUpcomingEvent } from "@/lib/cins/home-adaptive/sidebar-upcoming-types";

type Tab = "all" | "mine";

type Props = {
  allItems: SidebarUpcomingEvent[];
  myItems: SidebarUpcomingEvent[];
  myEventsTotal: number;
  title?: string;
};

function EventList({ items }: { items: SidebarUpcomingEvent[] }) {
  if (items.length === 0) {
    return <p className="ha-card-empty">Chưa có sự kiện phù hợp.</p>;
  }
  const [featured, ...rest] = items;
  return (
    <ul className="ha-org-up-list">
      {featured ? <HaOrgUpcomingRow item={featured} /> : null}
      {rest.map((item) => (
        <HaOrgUpcomingListRow key={item.id} item={item} />
      ))}
    </ul>
  );
}

/** Sidebar sự kiện: head + toggle Tất cả / Quan tâm + list. */
export function HaOrgUpcomingEventsPanel({
  allItems,
  myItems,
  myEventsTotal,
  title = "Sự kiện",
}: Props) {
  const hasMine = myItems.length > 0;
  const hasAll = allItems.length > 0;
  const [tab, setTab] = useState<Tab>(() => (hasMine ? "mine" : "all"));

  const activeItems = tab === "mine" ? myItems : allItems;
  const moreHref =
    tab === "mine" ? "/su-kien?tab=cua-ban" : "/su-kien";
  const showMore =
    tab === "mine" ? myEventsTotal > myItems.length : false;

  const tabs = useMemo(
    () =>
      [
        { id: "all" as const, label: "Tất cả" },
        { id: "mine" as const, label: "Quan tâm" },
      ] as const,
    [],
  );

  if (!hasAll && !hasMine) return null;

  return (
    <section className="ha-card ha-card--notify">
      {/* Tabs ngoài ha-card-head để vẫn hiện khi edit mode ẩn head. */}
      <div className="ha-org-up-head">
        <div className="ha-card-head">
          <CalendarDays size={16} strokeWidth={2} aria-hidden />
          <span className="ha-card-title">{title}</span>
        </div>
        <div
          className="ha-org-up-tabs"
          role="tablist"
          aria-label="Lọc sự kiện"
        >
          {tabs.map((t) => {
            const disabled =
              (t.id === "all" && !hasAll) || (t.id === "mine" && !hasMine);
            const selected = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={selected}
                disabled={disabled}
                className={`ha-org-up-tab${selected ? " is-active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
      <div role="tabpanel">
        <EventList items={activeItems} />
        {showMore ? (
          <p className="ha-org-up-more">
            <Link href={moreHref} prefetch={false}>
              Xem thêm
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}
