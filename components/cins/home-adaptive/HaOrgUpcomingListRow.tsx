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

function phanHoiLabel(item: SidebarUpcomingEvent): string | null {
  if (item.quayTrangThai === "da_duyet") return "Quầy · Đã duyệt";
  if (item.quayTrangThai === "cho_xu_ly") return "Quầy · Chờ duyệt";
  if (item.phanHoi === "se_tham_gia") return "Sẽ tham gia";
  if (item.phanHoi === "quan_tam") return "Quan tâm";
  return null;
}

/** Dòng sự kiện compact (không banner) — sidebar home. */
export function HaOrgUpcomingListRow({ item }: { item: SidebarUpcomingEvent }) {
  const badge = dateBadge(item.dateLabel);
  const isLive = item.status === "active";
  const phanHoi = phanHoiLabel(item);
  const isMoc = item.kind === "moc";
  const isQuay = Boolean(item.quayTrangThai);
  const itemClass =
    item.phanHoi === "quan_tam"
      ? "ha-org-up-item ha-org-up-item--interest"
      : item.phanHoi === "se_tham_gia"
        ? "ha-org-up-item ha-org-up-item--rsvp"
        : isQuay
          ? "ha-org-up-item ha-org-up-item--quay"
          : isMoc
            ? "ha-org-up-item ha-org-up-item--moc"
            : "ha-org-up-item";

  return (
    <li className={`${itemClass} ha-org-up-item--list`}>
      <HaOrgUpEventPopover
        item={sidebarEventPopoverItem(item)}
        cardClassName="ha-org-up-list-row"
      >
        <span className="ha-org-up-list-thumb" aria-hidden>
          {item.coverSrc ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={item.coverSrc} alt="" loading="lazy" />
          ) : (
            <span className="ha-org-up-list-thumb-fallback">
              {item.label.slice(0, 2).toUpperCase()}
            </span>
          )}
        </span>
        <span className="ha-org-up-list-body">
          <span className="ha-org-up-list-top">
            <span className="ha-org-up-list-title">{item.label}</span>
            {phanHoi ? (
              <span
                className={`ha-org-up-list-badge${
                  item.quayTrangThai
                    ? " is-quay"
                    : item.phanHoi === "se_tham_gia"
                      ? " is-rsvp"
                      : item.phanHoi === "quan_tam"
                        ? " is-interest"
                        : ""
                }`}
              >
                {phanHoi}
              </span>
            ) : isMoc ? (
              <span className="ha-org-up-list-badge is-moc">Thông báo</span>
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
          <span className="ha-org-up-list-time">
            {badge ? (
              <span
                className={`ha-org-up-list-date${isLive ? " is-live" : ""}`}
              >
                {badge.day} {badge.month}
              </span>
            ) : null}
            <HaOrgUpCountdown
              batDauIso={item.batDauIso}
              ketThucIso={item.ketThucIso}
              status={item.status}
            />
          </span>
        </span>
      </HaOrgUpEventPopover>
    </li>
  );
}
