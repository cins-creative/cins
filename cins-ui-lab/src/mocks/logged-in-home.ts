/**
 * Logged-in home fixtures — feed + sidebar modules.
 *
 * LOGIC_TOUCH: home.feed
 * Real: fetchWorldJourneyFeedPageCached / gallery + WorldJourneyFeed client
 * Mock: static milestones; tab state local
 * Apply: reconnect feed fetch, infinite scroll, filter chips, boost
 */

export type FeedTab = "following" | "explore";

export type FeedItem = {
  id: string;
  authorName: string;
  authorSlug: string;
  timeLabel: string;
  body: string;
  hasMedia: boolean;
  source: FeedTab;
  liked?: boolean;
};

export type SuggestOrg = {
  id: string;
  name: string;
  role: string;
  following: boolean;
};

export type SuggestPerson = {
  id: string;
  name: string;
  role: string;
  following: boolean;
};

export type LinhVucChip = {
  slug: string;
  label: string;
  accent: string;
};

export const FEED_ITEMS: FeedItem[] = [
  {
    id: "f1",
    authorName: "Lan Nguyễn",
    authorSlug: "lan-nguyen",
    timeLabel: "2 giờ trước",
    body: "Vừa đóng milestone portfolio review — feedback từ mentor Sine Art.",
    hasMedia: true,
    source: "following",
  },
  {
    id: "f2",
    authorName: "ĐH Văn Lang",
    authorSlug: "van-lang",
    timeLabel: "Hôm qua",
    body: "Open Day ngành Thiết kế đồ họa — đăng ký sớm nhận tour xưởng.",
    hasMedia: true,
    source: "explore",
  },
  {
    id: "f3",
    authorName: "Khoa Trần",
    authorSlug: "khoa-tran",
    timeLabel: "3 ngày trước",
    body: "Character turnaround tuần này — đang thử lighting mới.",
    hasMedia: true,
    source: "following",
  },
  {
    id: "f4",
    authorName: "CINs Studio",
    authorSlug: "cins-studio",
    timeLabel: "4 ngày trước",
    body: "Tuyển junior motion designer — remote 2 ngày/tuần.",
    hasMedia: false,
    source: "explore",
  },
];

export const LINH_VUC_CHIPS: LinhVucChip[] = [
  { slug: "do-hoa", label: "Đồ họa", accent: "#1F74C9" },
  { slug: "animation", label: "Animation", accent: "#BB89F8" },
  { slug: "ux-ui", label: "UX/UI", accent: "#6EFEC0" },
  { slug: "game", label: "Game Art", accent: "#FDAD4C" },
];

export const SUGGEST_ORGS: SuggestOrg[] = [
  {
    id: "o1",
    name: "Sine Art",
    role: "Cơ sở đào tạo",
    following: false,
  },
  {
    id: "o2",
    name: "ĐH FPT",
    role: "Trường đại học",
    following: true,
  },
];

export const SUGGEST_PEOPLE: SuggestPerson[] = [
  {
    id: "p1",
    name: "Vy Phạm",
    role: "UI Designer",
    following: false,
  },
  {
    id: "p2",
    name: "Hùng Lê",
    role: "Concept Artist",
    following: false,
  },
];

export const COURSES_HOC = [
  { id: "kh1", title: "Digital Painting", org: "Sine Art" },
  { id: "kh2", title: "Figma for UI", org: "CINs Studio" },
];
