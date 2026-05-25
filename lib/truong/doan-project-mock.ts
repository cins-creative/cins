/** Mock — đồ án / project do user khác tag vào trang trường (chưa nối DB). */

export type TruongDoanProjectTile = "short" | "tall" | "square";

export type TruongDoanProjectItem = {
  id: string;
  /** Năm milestone / tốt nghiệp (mock). */
  nam: number;
  projectTitle: string;
  studentName: string;
  nganhLabel: string | null;
  milestoneTitle: string;
  href: string;
  coverSrc?: string | null;
  coverAlt?: string | null;
  coverGradient?: string | null;
  photoCount?: number | null;
  tile: TruongDoanProjectTile;
};

/** Năm có trong mock — chỉ dùng cho filter tab Đồ án (tách khỏi năm tuyển sinh). */
export function doanProjectYearOptions(
  projects: readonly TruongDoanProjectItem[] = MOCK_TRUONG_DOAN_PROJECTS,
): number[] {
  return [...new Set(projects.map((p) => p.nam))]
    .filter((y) => y >= 2000 && y <= 2100)
    .sort((a, b) => b - a);
}

export const MOCK_TRUONG_DOAN_PROJECTS: TruongDoanProjectItem[] = [
  {
    id: "doan-1",
    nam: 2025,
    projectTitle: "Đồ án tốt nghiệp — Bộ sưu tập gốm thủ công",
    studentName: "Nguyễn Minh Anh",
    nganhLabel: "Điêu khắc",
    milestoneTitle: "Triển lãm tốt nghiệp 2025",
    href: "/journey/minh-anh-nguyen/album-gom-2025",
    coverSrc: "/uploads/pasted-1777441560054-0.png",
    coverAlt: "Gốm thủ công — triển lãm tốt nghiệp",
    photoCount: 12,
    tile: "tall",
  },
  {
    id: "doan-2",
    nam: 2025,
    projectTitle: "Interactive poster — Thiết kế đồ họa",
    studentName: "Trần Quốc Bảo",
    nganhLabel: "Thiết kế đồ họa",
    milestoneTitle: "Dự án môn Trang trí màu",
    href: "/journey/quoc-bao-tran/poster-interactive",
    coverSrc: "/uploads/pasted-1777439223625-0.png",
    coverAlt: "Interactive poster — mockup",
    photoCount: 8,
    tile: "short",
  },
  {
    id: "doan-3",
    nam: 2024,
    projectTitle: "Sketchbook kỳ 2",
    studentName: "Lê Thảo Vy",
    nganhLabel: "Hội hoạ",
    milestoneTitle: "Hoàn thành chương trình năm 3",
    href: "/journey/thao-vy-le/sketchbook-ky2",
    coverSrc: "/uploads/pasted-1777439102025-0.png",
    coverAlt: "Sketchbook kỳ 2",
    photoCount: 24,
    tile: "square",
  },
  {
    id: "doan-4",
    nam: 2025,
    projectTitle: "Brand identity — Cộng đồng nghệ sĩ trẻ",
    studentName: "Phạm Đức Huy",
    nganhLabel: "Đồ họa",
    milestoneTitle: "Freelance cho studio địa phương",
    href: "/journey/duc-huy-pham/brand-case",
    coverSrc: "/uploads/pasted-1777438450952-0.png",
    coverAlt: "Brand identity case study",
    photoCount: 6,
    tile: "short",
  },
  {
    id: "doan-5",
    nam: 2026,
    projectTitle: "Không gian triển lãm tạm thời",
    studentName: "Võ Khánh Linh",
    nganhLabel: "Thiết kế không gian",
    milestoneTitle: "Đồ án chuyên ngành",
    href: "/journey/khanh-linh-vo/trien-lam-tam",
    coverSrc: "/uploads/pasted-1777439180662-0.png",
    coverAlt: "Mô hình không gian triển lãm",
    photoCount: 9,
    tile: "tall",
  },
  {
    id: "doan-6",
    nam: 2024,
    projectTitle: "Series in situ — Tranh sơn dầu",
    studentName: "Đặng Hoàng Nam",
    nganhLabel: "Hội họa",
    milestoneTitle: "Tốt nghiệp 2024",
    href: "/journey/hoang-nam-dang/series-in-situ",
    coverSrc: "/uploads/pasted-1777439168033-0.png",
    coverAlt: "Tranh sơn dầu in situ",
    photoCount: 15,
    tile: "square",
  },
  {
    id: "doan-7",
    nam: 2025,
    projectTitle: "Motion poster — Lễ hội âm nhạc",
    studentName: "Bùi Thùy Dung",
    nganhLabel: "Thiết kế đồ họa",
    milestoneTitle: "Dự án nhóm",
    href: "/journey/thuy-dung-bui/motion-poster",
    coverSrc: "/uploads/pasted-1777439197255-0.png",
    coverAlt: "Motion poster",
    photoCount: 5,
    tile: "short",
  },
  {
    id: "doan-8",
    nam: 2024,
    projectTitle: "Điêu khắc gỗ — Chuỗi hình tượng",
    studentName: "Ngô Văn Kiệt",
    nganhLabel: "Điêu khắc",
    milestoneTitle: "Triển lãm khoa",
    href: "/journey/van-kiet-ngo/go-tuong",
    coverGradient:
      "linear-gradient(145deg, #2A1505 0%, #5C2D0B 45%, #B5610C 100%)",
    photoCount: 11,
    tile: "tall",
  },
  {
    id: "doan-9",
    nam: 2026,
    projectTitle: "Zine minh họa — Đô thị ban đêm",
    studentName: "Trịnh Mai Phương",
    nganhLabel: "Đồ họa",
    milestoneTitle: "Môn minh họa báo chí",
    href: "/journey/mai-phuong-trinh/zine-do-thi",
    coverSrc: "/uploads/pasted-1777438003558-0.png",
    coverAlt: "Zine minh họa",
    photoCount: 18,
    tile: "square",
  },
];
