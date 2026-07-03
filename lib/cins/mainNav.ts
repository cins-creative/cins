import {
  CO_SO_DAO_TAO_HUB_PATH,
  isCoSoDaoTaoHubPath,
  isNgheNghiepHubPath,
  NGHE_NGHIEP_HUB_PATH,
} from "@/lib/cins/hubPaths";

export type MainNavIcon =
  | "home"
  | "gallery"
  | "career"
  | "education"
  | "courses"
  | "community"
  | "business"
  | "jobs"
  | "events"
  | "blog"
  | "profile"
  | "help"
  | "settings";

export type OrgFlyoutKind = "education" | "community" | "studio";

export type MainNavItem = {
  id: string;
  href: string;
  label: string;
  tip: string;
  icon: MainNavIcon;
  isActive: (pathname: string) => boolean;
  /** Nếu có: hover item sẽ xổ ngang danh sách tổ chức của user theo nhóm này. */
  flyout?: OrgFlyoutKind;
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
    id: "career",
    href: NGHE_NGHIEP_HUB_PATH,
    label: "Khám phá nghề",
    tip: "120+ vị trí nghề: mô tả công việc, kỹ năng cần học, lương trung bình và lộ trình",
    icon: "career",
    isActive: isNgheNghiepHubPath,
  },
  {
    id: "education",
    href: CO_SO_DAO_TAO_HUB_PATH,
    label: "Tổ chức giáo dục",
    tip: "Trường đại học và cơ sở đào tạo ngành sáng tạo — học phí, chương trình, học bổng và open day",
    icon: "education",
    isActive: isCoSoDaoTaoHubPath,
    flyout: "education",
  },
  {
    id: "courses",
    href: "/#courses",
    label: "Tìm khoá học",
    tip: "Khoá học online & offline — từ nhập môn cho học sinh đến chuyên sâu cho người đi làm",
    icon: "courses",
    isActive: () => false,
  },
  {
    id: "community",
    href: "/cong-dong",
    label: "Cộng đồng",
    tip: "Cộng đồng nghề — thảo luận, chia sẻ kinh nghiệm và kết nối người trong ngành",
    icon: "community",
    isActive: (p) => p === "/cong-dong" || p.startsWith("/cong-dong/"),
    flyout: "community",
  },
  {
    id: "business",
    href: "/studio",
    label: "Studio",
    tip: "Studio, agency và doanh nghiệp ngành sáng tạo — khám phá đội ngũ, dự án và cơ hội hợp tác",
    icon: "business",
    isActive: (p) => p === "/studio" || p.startsWith("/studio/"),
    flyout: "studio",
  },
  {
    id: "jobs",
    href: "/tuyen-dung",
    label: "Tuyển dụng",
    tip: "Tin tuyển dụng đang mở từ studio, agency và doanh nghiệp ngành sáng tạo — vị trí, mức lương và hạn nộp",
    icon: "jobs",
    isActive: (p) => p === "/tuyen-dung" || p.startsWith("/tuyen-dung/"),
  },
  {
    id: "events",
    href: "/su-kien",
    label: "Sự kiện",
    tip: "Open day, talkshow, workshop và cuộc thi sắp diễn ra trong 30 ngày tới",
    icon: "events",
    isActive: (p) => p === "/su-kien" || p.startsWith("/su-kien/"),
  },
];

/** id item KẾT THÚC một cụm — chèn đường kẻ ngay sau (trừ item cuối). */
export const MAIN_NAV_GROUP_BREAK_AFTER = new Set(["home", "courses", "jobs"]);

export const MAIN_NAV_FOOT_ITEMS: MainNavItem[] = [
  {
    id: "help",
    href: "/#help",
    label: "Trợ giúp",
    tip: "Câu hỏi thường gặp, hỗ trợ tài khoản và liên hệ với đội ngũ CINs",
    icon: "help",
    isActive: () => false,
  },
  {
    id: "settings",
    href: "/#settings",
    label: "Cài đặt",
    tip: "Cập nhật thông tin cá nhân, thông báo, quyền riêng tư và ngôn ngữ",
    icon: "settings",
    isActive: () => false,
  },
];
