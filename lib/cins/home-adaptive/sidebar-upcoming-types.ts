/**
 * Types + pure helpers cho sidebar sự kiện — dùng được ở client lẫn server.
 * Loader DB giữ trong `sidebar-upcoming-events.ts` / `followed-org-upcoming.ts` (server-only).
 */

import { suKienDetailPath } from "@/lib/to-chuc/su-kien-routes";

export type FollowedOrgUpcomingItem = {
  id: string;
  kind: "su_kien" | "moc" | "khoa";
  orgId: string;
  orgSlug: string;
  orgName: string;
  orgLoai: string;
  href: string;
  label: string;
  dateLabel: string;
  subLabel: string | null;
  status: "active" | "upcoming";
  sortKey: number;
};

export type SidebarUpcomingEvent = FollowedOrgUpcomingItem & {
  kind: "su_kien" | "moc";
  phanHoi: "quan_tam" | "se_tham_gia" | null;
  coverSrc: string | null;
  orgAvatarUrl: string | null;
  batDauIso: string;
  ketThucIso: string | null;
  /** Slug URL `/su-kien/{slug}` khi có. */
  suKienSlug?: string | null;
  /**
   * Quầy shop của viewer tại sự kiện này — hiện ở tab «Quan tâm».
   * `cho_xu_ly` | `da_duyet`.
   */
  quayTrangThai?: "cho_xu_ly" | "da_duyet" | null;
};

export type SidebarUpcomingEventsBundle = {
  /** Discovery: org theo dõi + gợi ý + mốc. */
  allItems: SidebarUpcomingEvent[];
  /** Sự kiện viewer quan tâm / sẽ tham gia + quầy đã xin. */
  myItems: SidebarUpcomingEvent[];
  /** Số sự kiện RSVP/quan tâm (không gồm quầy). */
  myEventsTotal: number;
  /** @deprecated alias — mặc định tab Tất cả. */
  items: SidebarUpcomingEvent[];
};

export function sidebarSuKienId(item: SidebarUpcomingEvent): string {
  return item.id.replace(/^sk:/, "");
}

export function sidebarEventHref(item: SidebarUpcomingEvent): string {
  if (item.kind === "su_kien") {
    return suKienDetailPath(item.suKienSlug || sidebarSuKienId(item));
  }
  return item.href;
}
