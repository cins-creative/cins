/** Mock feed — MVP static, wire API sau. */

import type { WjFeedMediaKind } from "@/lib/cins/worldJourneyFeedFilters";
import { buildWorldJourneyFilterChips } from "@/lib/cins/worldJourneyFeedFilters";

export type WjTagTone = "violet" | "mint" | "blue" | "orange" | "yellow";

export type WjPostMock = {
  id: string;
  context?: string;
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
  /** Loại nội dung feed — lọc chip media. */
  feedMediaKind?: WjFeedMediaKind;
  /** Slug lĩnh vực — lọc chip `linh_vuc` (cùng slug career hub). */
  linhVucSlugs?: string[];
};

export const WORLD_JOURNEY_FILTER_CHIPS = buildWorldJourneyFilterChips();

export const WORLD_JOURNEY_SORT_OPTIONS = [
  "Mới nhất",
  "Đang sôi nổi",
  "Theo dõi",
  "Verified",
] as const;

export const MOCK_WORLD_JOURNEY_POSTS: WjPostMock[] = [
  {
    id: "1",
    author: {
      initials: "LH",
      name: "Linh Hà",
      org: "SV năm 2 · ĐH Mỹ thuật TP.HCM (HCMUFA)",
      tone: "violet",
    },
    time: "4 giờ trước",
    visibility: "Công khai",
    paragraphs: [
      "Mình vừa hoàn thiện 32 trang artbook ghi lại 2 tuần điền dã ở Bến Tre — từ chợ nổi Cái Mơn đến vườn dừa An Hiệp. Watercolor + bút sắt, vẽ tay 100%.",
    ],
    media: { kind: "artbook", verifiedFoot: "Đã verify bởi HCMUFA — Lớp K23 Hội họa" },
    tags: [
      { label: "#Watercolor", tone: "mint" },
      { label: "#Sketchbook", tone: "blue" },
      { label: "#HCMUFA", tone: "violet" },
    ],
    likes: 247,
    comments: 42,
    verifiedFoot: "Đã verify bởi HCMUFA — Lớp K23 Hội họa",
    feedMediaKind: "photo",
    linhVucSlugs: ["my-thuat", "lv-my-thuat"],
  },
  {
    id: "2",
    context: "Bạn theo dõi Tú Nguyễn",
    author: {
      initials: "TN",
      name: "Tú Nguyễn",
      org: "3D Animator · Studio Sparx*",
      tone: "blue",
      verified: true,
    },
    time: "Hôm qua, 18:30",
    visibility: "Công khai",
    pullquote:
      '"Bản trial 3D model nhân vật phim ngắn tốt nghiệp — version 4 sau 6 tuần."',
    paragraphs: [
      "Đây là vòng tinh chỉnh cuối trước khi rig. Tỉ lệ mặt vẫn cần co lại ~5%, sau đó vào texture pass.",
    ],
    media: {
      kind: "video",
      caption: "Turntable render — Maya + ZBrush, 24fps, 1080p",
      duration: "0:42",
    },
    tags: [
      { label: "#3DAnim", tone: "blue" },
      { label: "#Maya", tone: "violet" },
      { label: "#ZBrush", tone: "mint" },
    ],
    likes: 412,
    comments: 88,
    feedMediaKind: "video",
    linhVucSlugs: ["hoat-hinh", "lv-phim-hoat-hinh", "game"],
  },
  {
    id: "3",
    author: {
      initials: "MĐ",
      name: "Minh Đăng",
      org: "Game Designer · Sine Art",
      tone: "orange",
    },
    time: "8 giờ trước",
    visibility: "Công khai",
    paragraphs: [
      'Mình vẽ thử 4 panel comic về quy trình level design — từ "ý tưởng giấy ăn" đến "playable build". Cảnh báo: bóng dáng deadline xuất hiện ở panel 04.',
    ],
    media: { kind: "comic" },
    tags: [
      { label: "#GameDesign", tone: "yellow" },
      { label: "#LevelDesign", tone: "orange" },
      { label: "#Unity", tone: "blue" },
    ],
    likes: 189,
    comments: 27,
    feedMediaKind: "photo",
    linhVucSlugs: ["game", "lv-game"],
  },
  {
    id: "4",
    context: "Mentor bạn theo dõi",
    author: {
      initials: "MN",
      name: "Cô Mai Nga",
      org: "Concept Artist & Mentor · 12 năm nghề",
      tone: "mint",
      verified: true,
    },
    time: "Hôm qua, 09:15",
    visibility: "Công khai",
    pullquote:
      '"Concept artist trẻ thường bắt đầu từ render. Mình dạy các bạn bắt đầu từ thumbnail 5 phút — và bỏ đi 9 bản đầu tiên."',
    paragraphs: [
      "Mỗi tuần mình lại có một buổi mentor 1:1 miễn phí cho sinh viên năm 2-3 ngành Concept Art. Tuần này còn 2 slot — comment dưới nếu bạn muốn đăng ký.",
    ],
    media: { kind: "text-only" },
    tags: [
      { label: "#ConceptArt", tone: "mint" },
      { label: "#Mentor", tone: "violet" },
      { label: "#Mien Phi", tone: "blue" },
    ],
    likes: 95,
    comments: 18,
    feedMediaKind: "article",
    linhVucSlugs: ["my-thuat", "lv-my-thuat", "ui-ux"],
  },
];

export const MOCK_FOLLOW_SUGGESTIONS = [
  { initials: "HM", name: "Hà My", role: "Illustrator · Cú Mèo café", tone: "violet" },
  { initials: "TP", name: "Thái Phong", role: "Sound Designer · Epic Games VN", tone: "orange", verified: true },
  { initials: "NQ", name: "Ngọc Quyên", role: "Concept Artist · Freelance", tone: "mint" },
  { initials: "S*", name: "Sine Art", role: "Game Studio · Hà Nội", tone: "sparx", square: true, verified: true },
] as const;

export const MOCK_TRENDING_TAGS = [
  { label: "#GameJam", count: 142, bg: "var(--orange-soft)", color: "#94570B" },
  { label: "#Artbook miền Tây", count: 87, bg: "var(--mint-soft)", color: "var(--mint-ink)" },
  { label: "#VẽTay", count: 64, bg: "var(--blue-soft)", color: "var(--blue-dark)" },
  { label: "#ZBrush", count: 51, bg: "var(--violet-soft)", color: "#5B2D9F" },
  { label: "#TốtNghiệp2026", count: 38, bg: "var(--yellow-soft)", color: "var(--warn-ink)" },
] as const;

export const MOCK_UPCOMING_EVENTS = [
  {
    day: "25",
    month: "Th6",
    name: "Workshop ZBrush nhân vật phim ngắn",
    host: "Studio Sparx*",
    time: "19:00 · TP.HCM · Offline",
  },
  {
    day: "04",
    month: "Th7",
    name: "Talk: Pipeline pixel-art trong Unity",
    host: "Game Jam HN",
    time: "20:00 · Online · Zoom",
  },
] as const;
