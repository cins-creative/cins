export type MainNavIcon =
  | "home"
  | "gallery"
  | "career"
  | "university"
  | "training"
  | "courses"
  | "business"
  | "events"
  | "blog"
  | "help"
  | "settings";

export type MainNavItem = {
  id: string;
  href: string;
  label: string;
  tip: string;
  icon: MainNavIcon;
  isActive: (pathname: string) => boolean;
};

export const MAIN_NAV_ITEMS: MainNavItem[] = [
  {
    id: "home",
    href: "/",
    label: "Trang chủ",
    tip: "Tin nóng, sự kiện, khoá học và trường nổi bật cập nhật hằng ngày",
    icon: "home",
    isActive: (p) => p === "/",
  },
  {
    id: "gallery",
    href: "/#gallery",
    label: "Gallery Portfolio",
    tip: "2,400+ tác phẩm sinh viên các trường — tìm cảm hứng, phong cách và kỹ thuật",
    icon: "gallery",
    isActive: () => false,
  },
  {
    id: "career",
    href: "/nghe-nghiep",
    label: "Khám phá nghề",
    tip: "120+ vị trí nghề: mô tả công việc, kỹ năng cần học, lương trung bình và lộ trình",
    icon: "career",
    isActive: (p) => p === "/nghe-nghiep" || p.startsWith("/nghe-nghiep/"),
  },
  {
    id: "university",
    href: "/#schools",
    label: "Trường đại học",
    tip: "38 trường đào tạo ngành sáng tạo — học phí, chương trình, học bổng và open day",
    icon: "university",
    isActive: () => false,
  },
  {
    id: "training",
    href: "/#training",
    label: "Cơ sở đào tạo",
    tip: "Trung tâm đào tạo ngắn hạn, học viện kỹ năng nghề và bootcamp chuyên ngành",
    icon: "training",
    isActive: () => false,
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
    id: "business",
    href: "/#business",
    label: "Doanh nghiệp",
    tip: "Studio, agency và công ty đang tuyển — danh sách thực tập, fulltime và freelance",
    icon: "business",
    isActive: () => false,
  },
  {
    id: "events",
    href: "/#events",
    label: "Sự kiện",
    tip: "Open day, talkshow, workshop và cuộc thi sắp diễn ra trong 30 ngày tới",
    icon: "events",
    isActive: () => false,
  },
  {
    id: "blog",
    href: "/bai-viet",
    label: "Blog",
    tip: "Bài viết chuyên sâu, hướng dẫn nghề và phỏng vấn người trong ngành sáng tạo",
    icon: "blog",
    isActive: (p) => p === "/bai-viet" || p.startsWith("/bai-viet/"),
  },
];

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
