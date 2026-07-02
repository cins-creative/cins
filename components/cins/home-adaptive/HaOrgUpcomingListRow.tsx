import Link from "next/link";

import { HaOrgUpCountdown } from "@/components/cins/home-adaptive/HaOrgUpCountdown";
import { HaOrgPopoverChip } from "@/components/cins/home-adaptive/HaOrgPopoverChip";
import {
  sidebarEventHref,
  type SidebarUpcomingEvent,
} from "@/lib/cins/home-adaptive/sidebar-upcoming-events";

const MONTHS = [
  "Th1", "Th2", "Th3", "Th4", "Th5", "Th6",
  "Th7", "Th8", "Th9", "Th10", "Th11", "Th12",
];

function dateBadge(dateLabel: string): { month: string; day: string } | null {
  const match = dateLabel.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  const monthIdx = Number(match[2]) - 1;
  if (monthIdx < 0 || monthIdx > 11) return null;
  return {
    month: MONTHS[monthIdx] ?? "",
    day: match[1].padStart(2, "0"),
  };
}

function phanHoiLabel(item: SidebarUpcomingEvent): string | null {
  if (item.phanHoi === "se_tham_gia") return "Sẽ tham gia";
  if (item.phanHoi === "quan_tam") return "Quan tâm";
  return null;
}

/** Dòng sự kiện compact (không banner) — sidebar home. */
export function HaOrgUpcomingListRow({ item }: { item: SidebarUpcomingEvent }) {
  const badge = dateBadge(item.dateLabel);
  const isLive = item.status === "active";
  const phanHoi = phanHoiLabel(item);
  const itemClass =
    item.phanHoi === "quan_tam"
      ? "ha-org-up-item ha-org-up-item--interest"
      : item.phanHoi === "se_tham_gia"
        ? "ha-org-up-item ha-org-up-item--rsvp"
        : "ha-org-up-item";

  return (
    <li className={`${itemClass} ha-org-up-item--list`}>
      <Link
        href={sidebarEventHref(item)}
        className="ha-org-up-list-row"
        prefetch={false}
      >
        {badge ? (
          <span
            className={`ha-org-up-date ha-org-up-date--list${isLive ? " ha-org-up-date--live" : ""}`}
          >
            <span className="ha-org-up-date-month">{badge.month}</span>
            <span className="ha-org-up-date-day">{badge.day}</span>
          </span>
        ) : null}
        <span className="ha-org-up-list-body">
          <span className="ha-org-up-list-top">
            <span className="ha-org-up-list-title">{item.label}</span>
            {phanHoi ? (
              <span
                className={`ha-org-up-list-badge${item.phanHoi === "se_tham_gia" ? " is-rsvp" : " is-interest"}`}
              >
                {phanHoi}
              </span>
            ) : null}
          </span>
          <HaOrgPopoverChip
            orgSlug={item.orgSlug}
            orgName={item.orgName}
            orgLoai={item.orgLoai}
            orgAvatarUrl={item.orgAvatarUrl}
            wrapClassName="ha-org-up-list-org"
            nameClassName="ha-org-up-list-org-name"
          />
          <HaOrgUpCountdown
            batDauIso={item.batDauIso}
            ketThucIso={item.ketThucIso}
            status={item.status}
          />
        </span>
      </Link>
    </li>
  );
}
