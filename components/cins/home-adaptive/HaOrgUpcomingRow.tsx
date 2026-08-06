import { HaOrgUpCountdown } from "@/components/cins/home-adaptive/HaOrgUpCountdown";
import { HaOrgPopoverChip } from "@/components/cins/home-adaptive/HaOrgPopoverChip";
import { HaOrgUpEventPopover } from "@/components/cins/home-adaptive/HaOrgUpEventPopover";
import { sidebarEventPopoverItem } from "@/lib/cins/home-adaptive/sidebar-event-popover";
import type { SidebarUpcomingEvent } from "@/lib/cins/home-adaptive/sidebar-upcoming-types";

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

function dateRangeLine(dateLabel: string): string | null {
  const clean = dateLabel.replace(/\s*·\s*Đang diễn ra$/, "").trim();
  if (!clean.includes("–")) return null;
  return clean;
}

function overlayBadge(item: SidebarUpcomingEvent, isLive: boolean) {
  // "Đang diễn ra" / quầy / tag — trên banner. RSVP / Quan tâm xuống chân countdown.
  const live = isLive ? (
    <span className="ha-org-up-live">Đang diễn ra</span>
  ) : null;
  const quay =
    item.quayTrangThai === "da_duyet" ? (
      <span className="ha-org-up-quay">Quầy · Đã duyệt</span>
    ) : item.quayTrangThai === "cho_xu_ly" ? (
      <span className="ha-org-up-quay is-pending">Quầy · Chờ duyệt</span>
    ) : null;
  if (live || quay) {
    return (
      <>
        {live}
        {quay}
      </>
    );
  }
  if (item.subLabel && !item.phanHoi) {
    return <span className="ha-org-up-tag">{item.subLabel}</span>;
  }
  return null;
}

function footPhanHoi(item: SidebarUpcomingEvent) {
  if (item.quayTrangThai) return null;
  if (item.phanHoi === "se_tham_gia") {
    return <span className="ha-org-up-rsvp">Sẽ tham gia</span>;
  }
  if (item.phanHoi === "quan_tam") {
    return <span className="ha-org-up-interest">Quan tâm</span>;
  }
  return null;
}

/** Một dòng sự kiện sidebar trang chủ — card banner + meta. */
export function HaOrgUpcomingRow({ item }: { item: SidebarUpcomingEvent }) {
  const badge = dateBadge(item.dateLabel);
  const range = dateRangeLine(item.dateLabel);
  const isLive = item.status === "active";
  const overlay = overlayBadge(item, isLive);
  const phanHoi = footPhanHoi(item);
  const itemClass =
    item.phanHoi === "quan_tam"
      ? "ha-org-up-item ha-org-up-item--interest"
      : item.phanHoi === "se_tham_gia"
        ? "ha-org-up-item ha-org-up-item--rsvp"
        : item.kind === "moc"
          ? "ha-org-up-item ha-org-up-item--moc"
          : "ha-org-up-item";

  return (
    <li className={itemClass}>
      <HaOrgUpEventPopover
        item={sidebarEventPopoverItem(item)}
        cardClassName="ha-org-up ha-org-up--banner"
      >
        <div className="ha-org-up-banner" aria-hidden>
          {item.coverSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.coverSrc}
              alt=""
              className="ha-org-up-banner-img"
              loading="lazy"
            />
          ) : (
            <span className="ha-org-up-banner-fallback">
              {item.label.slice(0, 2).toUpperCase()}
            </span>
          )}
          <span className="ha-org-up-banner-shade" />
          {badge ? (
            <span
              className={`ha-org-up-date ha-org-up-date--overlay${isLive ? " ha-org-up-date--live" : ""}`}
            >
              <span className="ha-org-up-date-month">{badge.month}</span>
              <span className="ha-org-up-date-day">{badge.day}</span>
            </span>
          ) : null}
          {overlay ? (
            <span className="ha-org-up-banner-badge">{overlay}</span>
          ) : null}
        </div>
        <div className="ha-org-up-body">
          <p className="ha-org-up-title">{item.label}</p>
          <div className="ha-org-up-meta">
            <HaOrgPopoverChip
              orgSlug={item.orgSlug}
              orgName={item.orgName}
              orgLoai={item.orgLoai}
              orgAvatarUrl={item.orgAvatarUrl}
              wrapClassName="ha-org-up-org-chip"
              nameClassName="ha-org-up-org"
            />
            {range ? <span className="ha-org-up-range">{range}</span> : null}
          </div>
          <div className="ha-org-up-foot">
            <HaOrgUpCountdown
              batDauIso={item.batDauIso}
              ketThucIso={item.ketThucIso}
              status={item.status}
            />
            {phanHoi}
          </div>
        </div>
      </HaOrgUpEventPopover>
    </li>
  );
}
