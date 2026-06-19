import type { WjFeedMediaKind } from "@/lib/cins/worldJourneyFeedFilters";
import type { CheDoHienThiMoc } from "@/lib/journey/journey-visible-clause";

export type WjTagTone = "violet" | "mint" | "blue" | "orange" | "yellow";

/** Một mục feed World Journey — wire từ API sau. */
export type WjFeedPost = {
  id: string;
  context?: string;
  authorUserId: string;
  cheDoHienThi: Exclude<CheDoHienThiMoc, "cong_dong">;
  /** Demo MVP — quan hệ viewer ↔ tác giả (server fetch gán sẵn). */
  viewerIsFriend: boolean;
  viewerIsFollowing: boolean;
  author: {
    initials: string;
    name: string;
    org: string;
    tone: "violet" | "blue" | "orange" | "mint" | "sparx";
    verified?: boolean;
    square?: boolean;
  };
  time: string;
  visibility: string;
  paragraphs?: string[];
  pullquote?: string;
  media?:
    | { kind: "artbook"; verifiedFoot: string }
    | { kind: "video"; caption: string; duration: string }
    | { kind: "comic" }
    | { kind: "text-only" };
  tags: { label: string; tone: WjTagTone }[];
  likes: number;
  comments: number;
  verifiedFoot?: string;
  feedMediaKind?: WjFeedMediaKind;
  linhVucSlugs?: string[];
};
