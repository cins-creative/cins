/**
 * Payload JSON preview khối home — client-safe (không server-only).
 */

import type { HomeDonHangItem } from "@/lib/cins/home-adaptive/role-types";
import type { SidebarUpcomingEvent } from "@/lib/cins/home-adaptive/sidebar-upcoming-types";
import type {
  FollowSuggestion,
  OrgFollowSuggestion,
} from "@/lib/cins/home-adaptive/suggestions-display";
import type { WjLinhVucAsideItem } from "@/lib/cins/worldJourneyGuestAside";

export type ModulePreviewCoHoiItem = {
  id: string;
  tieuDe: string;
  orgTen: string;
  orgSlug: string | null;
  avatarUrl: string | null;
  loaiHinhLabel: string;
  place: string;
  linhVucTen: string | null;
  salary: string | null;
  sub: string;
  href: string | null;
};

export type ModulePreviewPendingVerifyItem = {
  requestId: string;
  userName: string;
  userSlug: string | null;
  title: string;
  orgName: string;
  submittedAt: string;
};

export type ModulePreviewHocVienItem = {
  userId: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  khoaTen: string;
  milestoneHint: string;
};

export type ModulePreviewKhoaHocItem = {
  id: string;
  slug: string;
  ten: string;
  orgSlug: string;
  orgTen: string;
  sub: string;
  orgAvatarUrl: string | null;
  thumbnailUrl: string | null;
};

export type ModulePreviewScoutItem = {
  userId: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  sub: string;
};

export type ModulePreviewQueueRow = {
  key: string;
  title: string;
  sub: string;
  avatarUrl?: string | null;
};

export type ModulePreviewQueueId =
  | "quay_cua_toi"
  | "org_inbox"
  | "quan_ly_su_kien"
  | "ung_vien_moi"
  | "to_chuc_cua_ban"
  | "ung_tuyen_cua_toi"
  | "tin_nhan_ban_be"
  | "tin_nhan_to_chuc"
  | "tin_nhan_mua_ban"
  | "loi_moi_ket_ban"
  | "se_tham_gia"
  | "da_luu";

export type ModulePreviewPayload =
  | {
      id: "theo_doi_org";
      empty: false;
      allItems: SidebarUpcomingEvent[];
      myItems: SidebarUpcomingEvent[];
      myEventsTotal: number;
    }
  | { id: "theo_doi_org"; empty: true }
  | {
      id: "goi_y_theo_doi" | "nguoi_cung_nganh";
      empty: false;
      people: FollowSuggestion[];
    }
  | { id: "goi_y_theo_doi" | "nguoi_cung_nganh"; empty: true }
  | {
      id: "goi_y_studio" | "duong_toi_do";
      empty: false;
      orgs: OrgFollowSuggestion[];
    }
  | { id: "goi_y_studio" | "duong_toi_do"; empty: true }
  | {
      id: "kham_pha_linh_vuc";
      empty: false;
      linhVucs: WjLinhVucAsideItem[];
    }
  | { id: "kham_pha_linh_vuc"; empty: true }
  | {
      id: "khoa_hoc_goi_y";
      empty: false;
      courses: ModulePreviewKhoaHocItem[];
    }
  | { id: "khoa_hoc_goi_y"; empty: true }
  | {
      id: "ho_so_cua_ban";
      empty: false;
      percent: number;
      missing: string[];
      seeking: boolean;
      viewerSlug: string;
    }
  | { id: "ho_so_cua_ban"; empty: true }
  | {
      id: "co_hoi";
      empty: false;
      jobs: ModulePreviewCoHoiItem[];
    }
  | { id: "co_hoi"; empty: true }
  | {
      id: "cho_ban_duyet";
      empty: false;
      items: ModulePreviewPendingVerifyItem[];
    }
  | { id: "cho_ban_duyet"; empty: true }
  | {
      id: "hoc_vien_cua_ban";
      empty: false;
      items: ModulePreviewHocVienItem[];
    }
  | { id: "hoc_vien_cua_ban"; empty: true }
  | {
      id: "scout_tai_nang";
      empty: false;
      items: ModulePreviewScoutItem[];
    }
  | { id: "scout_tai_nang"; empty: true }
  | {
      id: "don_can_xu_ly" | "don_mua_cua_toi";
      empty: false;
      items: HomeDonHangItem[];
    }
  | { id: "don_can_xu_ly" | "don_mua_cua_toi"; empty: true }
  | {
      id: ModulePreviewQueueId;
      empty: false;
      rows: ModulePreviewQueueRow[];
      badge?: string;
    }
  | { id: ModulePreviewQueueId; empty: true };
