import {
  sidebarEventHref,
  sidebarSuKienId,
  type SidebarUpcomingEvent,
} from "@/lib/cins/home-adaptive/sidebar-upcoming-events";

/** Dữ liệu popup card sidebar — hiện ngay khi mở, chi tiết fetch sau. */
export type HaOrgUpPopoverItem = {
  kind: "su_kien" | "moc";
  label: string;
  dateLabel: string;
  subLabel: string | null;
  orgName: string;
  orgSlug: string;
  orgLoai: string;
  orgAvatarUrl: string | null;
  coverSrc: string | null;
  batDauIso: string;
  ketThucIso: string | null;
  status: "active" | "upcoming";
  phanHoi: "quan_tam" | "se_tham_gia" | null;
  /** Slug (hoặc id) sự kiện để fetch chi tiết — `null` với mốc thông báo. */
  suKienKey: string | null;
  /** UUID `org_su_kien.id` — cần cho quan tâm / sẽ tham gia. */
  suKienId: string | null;
  orgId: string;
  href: string;
};

export function sidebarEventPopoverItem(
  item: SidebarUpcomingEvent,
): HaOrgUpPopoverItem {
  return {
    kind: item.kind,
    label: item.label,
    dateLabel: item.dateLabel,
    subLabel: item.subLabel,
    orgName: item.orgName,
    orgSlug: item.orgSlug,
    orgLoai: item.orgLoai,
    orgAvatarUrl: item.orgAvatarUrl,
    coverSrc: item.coverSrc,
    batDauIso: item.batDauIso,
    ketThucIso: item.ketThucIso,
    status: item.status,
    phanHoi: item.phanHoi,
    suKienKey:
      item.kind === "su_kien"
        ? item.suKienSlug?.trim() || sidebarSuKienId(item)
        : null,
    suKienId: item.kind === "su_kien" ? sidebarSuKienId(item) : null,
    orgId: item.orgId,
    href: sidebarEventHref(item),
  };
}
