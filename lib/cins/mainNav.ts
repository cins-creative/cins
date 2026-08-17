import {
  isCoSoDaoTaoHubPath,
  isTimKhoaHocHubPath,
  isToChucHubPath,
  TIM_KHOA_HOC_HUB_PATH,
  TO_CHUC_HUB_PATH,
} from "@/lib/cins/hubPaths";

export type MainNavIcon =
  | "home"
  | "gallery"
  | "career"
  | "education"
  | "courses"
  | "community"
  | "shop"
  | "business"
  | "jobs"
  | "events"
  | "blog"
  | "profile"
  | "help"
  | "project"
  | "settings";

export type OrgFlyoutKind = "org" | "community";

function isToChucNavPath(pathname: string): boolean {
  return (
    isToChucHubPath(pathname) ||
    isCoSoDaoTaoHubPath(pathname) ||
    pathname === "/studio" ||
    pathname.startsWith("/studio/") ||
    pathname.startsWith("/academy/")
  );
}

export type MainNavItem = {
  id: string;
  href: string;
  label: string;
  tip: string;
  icon: MainNavIcon;
  isActive: (pathname: string) => boolean;
  /** Nếu có: hover item sẽ xổ ngang danh sách tổ chức của user theo nhóm này. */
  flyout?: OrgFlyoutKind;
  /** Chưa có trang — click mở overlay thông báo. */
  comingSoon?: boolean;
};

/**
 * Tạm ẩn tab Tuyển dụng trên sidebar.
 * Đặt `true` khi muốn bật lại.
 */
export const SHOW_MAIN_NAV_JOBS = false;

const MAIN_NAV_JOBS_ITEM: MainNavItem = {
  id: "jobs",
  href: "/jobs",
  label: "Tuyển dụng",
  tip: "Tin tuyển dụng đang mở từ studio, agency và doanh nghiệp ngành sáng tạo — vị trí, mức lương và hạn nộp",
  icon: "jobs",
  isActive: (p) => p === "/jobs" || p.startsWith("/jobs/"),
};

export const MAIN_NAV_ITEMS: MainNavItem[] = [
  {
    id: "home",
    href: "/",
    label: "Trang chủ",
    tip: "Tin nóng, sự kiện và World Journey — trang chủ CINs của bạn",
    icon: "home",
    isActive: (p) => p === "/",
  },
  {
    id: "org",
    href: TO_CHUC_HUB_PATH,
    label: "Tổ chức",
    tip: "Cơ sở đào tạo, trường đại học, studio và doanh nghiệp — tổ chức bạn quản lý và khám phá trên CINs",
    icon: "business",
    isActive: isToChucNavPath,
    flyout: "org",
  },
  {
    id: "courses",
    href: TIM_KHOA_HOC_HUB_PATH,
    label: "Tìm khoá học",
    tip: "Khoá học online & offline — từ nhập môn cho học sinh đến chuyên sâu cho người đi làm",
    icon: "courses",
    isActive: isTimKhoaHocHubPath,
  },
  {
    id: "community",
    href: "/community",
    label: "Cộng đồng",
    tip: "Cộng đồng nghề — thảo luận, chia sẻ kinh nghiệm và kết nối người trong ngành",
    icon: "community",
    isActive: (p) => p === "/community" || p.startsWith("/community/"),
    flyout: "community",
  },
  {
    id: "shops",
    href: "/shopping",
    label: "Cửa hàng",
    tip: "Cửa hàng đang mở trên CINs — goods, preorder và shop của người sáng tạo",
    icon: "shop",
    isActive: (p) => p === "/shopping" || p.startsWith("/shopping/"),
  },
  ...(SHOW_MAIN_NAV_JOBS ? [MAIN_NAV_JOBS_ITEM] : []),
  {
    id: "events",
    href: "/events",
    label: "Sự kiện",
    tip: "Open day, talkshow, workshop và cuộc thi sắp diễn ra trong 30 ngày tới",
    icon: "events",
    isActive: (p) => p === "/events" || p.startsWith("/events/"),
  },
];

/** id item KẾT THÚC một cụm — chèn đường kẻ ngay sau (trừ item cuối). */
export const MAIN_NAV_GROUP_BREAK_AFTER = new Set([
  "home",
  "courses",
  SHOW_MAIN_NAV_JOBS ? "jobs" : "shops",
]);

export const MAIN_NAV_FOOT_ITEMS: MainNavItem[] = [
  {
    id: "project",
    href: "/about",
    label: "Thông tin dự án",
    tip: "Tầm nhìn, triết lý sản phẩm và hướng phát triển của CINs",
    icon: "project",
    isActive: (p) => p === "/about",
  },
  {
    id: "help",
    href: "/support",
    label: "Trợ giúp",
    tip: "Câu hỏi thường gặp, hỗ trợ tài khoản và liên hệ với đội ngũ CINs",
    icon: "help",
    isActive: (p) => p === "/support" || p.startsWith("/support/"),
  },
];
