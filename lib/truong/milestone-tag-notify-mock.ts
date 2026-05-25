/** Mock — thông báo SV tag milestone / đồ án vào trường (chưa nối DB). */

export type MilestoneTagNotifyStatus = "pending" | "approved" | "rejected";

export type MilestoneTagAlbum = {
  /** Tiêu đề trang nội dung / album user trình bày */
  title: string;
  /** Link bài viết / Journey của user */
  href: string;
  excerpt?: string | null;
  /** Ảnh cover mock (public path hoặc URL) */
  coverSrc?: string | null;
  coverAlt?: string | null;
  photoCount?: number | null;
  /** Fallback khi không có ảnh */
  coverGradient?: string | null;
};

export type MilestoneTagEvidence = {
  label: string;
  href?: string | null;
  kind: "link" | "file" | "text";
  detail?: string | null;
};

export type MilestoneTagNotifyItem = {
  id: string;
  status: MilestoneTagNotifyStatus;
  studentName: string;
  projectTitle: string;
  milestoneTitle: string;
  milestoneKind: "du_an" | "hoc" | "lam_viec" | "thanh_tuu";
  taggedAt: string;
  nganhLabel: string | null;
  /** Album — trang nội dung user tạo & trình bày */
  album: MilestoneTagAlbum;
  /** Bằng chứng học tại trường */
  evidence: MilestoneTagEvidence[];
};

export const MOCK_MILESTONE_TAG_NOTIFY: MilestoneTagNotifyItem[] = [
  {
    id: "mt-1",
    status: "pending",
    studentName: "Nguyễn Minh Anh",
    projectTitle: "Đồ án tốt nghiệp — Bộ sưu tập gốm thủ công",
    milestoneTitle: "Triển lãm tốt nghiệp 2025",
    milestoneKind: "du_an",
    taggedAt: "2026-05-20T14:32:00+07:00",
    nganhLabel: "Điêu khắc",
    album: {
      title: "Album đồ án — Gốm thủ công 2025",
      href: "/journey/minh-anh-nguyen/album-gom-2025",
      excerpt: "12 ảnh quá trình + bản mô tả triển lãm",
      coverSrc: "/uploads/pasted-1777441560054-0.png",
      coverAlt: "Gốm thủ công — triển lãm tốt nghiệp",
      photoCount: 12,
    },
    evidence: [
      {
        label: "Thẻ sinh viên MTS 2025",
        kind: "file",
        detail: "the-sinh-vien.jpg",
      },
      {
        label: "Xác nhận học tại trường (email org)",
        href: "mailto:tuyensinh@mtshcm.edu.vn",
        kind: "link",
      },
      {
        label: "Bảng điểm học kỳ 2 — năm 2024",
        kind: "file",
        detail: "bang-diem-hk2.pdf",
      },
    ],
  },
  {
    id: "mt-2",
    status: "pending",
    studentName: "Trần Quốc Bảo",
    projectTitle: "Interactive poster — Thiết kế đồ họa",
    milestoneTitle: "Dự án môn Trang trí màu",
    milestoneKind: "du_an",
    taggedAt: "2026-05-19T09:15:00+07:00",
    nganhLabel: "Thiết kế đồ họa",
    album: {
      title: "Trang dự án — Interactive poster",
      href: "/journey/quoc-bao-tran/poster-interactive",
      excerpt: "Video demo + mockup in situ",
      coverSrc: "/uploads/pasted-1777439223625-0.png",
      coverAlt: "Interactive poster — mockup",
      photoCount: 8,
    },
    evidence: [
      {
        label: "Giấy xác nhận sinh viên (scan)",
        kind: "file",
        detail: "giay-xac-nhan.pdf",
      },
      {
        label: "Link lớp học trên hệ thống trường",
        href: "https://example.edu.vn/lop/ttm-2024",
        kind: "link",
      },
    ],
  },
  {
    id: "mt-3",
    status: "pending",
    studentName: "Lê Thảo Vy",
    projectTitle: "Sketchbook kỳ 2",
    milestoneTitle: "Hoàn thành chương trình năm 3",
    milestoneKind: "hoc",
    taggedAt: "2026-05-18T16:48:00+07:00",
    nganhLabel: "Hội hoạ",
    album: {
      title: "Sketchbook — Kỳ 2 (Gallery)",
      href: "/journey/thao-vy-le/sketchbook-ky2",
      excerpt: "24 trang sketch + chú thích kỹ thuật",
      coverSrc: "/uploads/pasted-1777439102025-0.png",
      coverAlt: "Sketchbook kỳ 2",
      photoCount: 24,
    },
    evidence: [
      {
        label: "Ảnh chụp tại xưởng học (có logo trường)",
        kind: "file",
        detail: "xuong-hoc.jpg",
      },
    ],
  },
  {
    id: "mt-4",
    status: "approved",
    studentName: "Phạm Đức Huy",
    projectTitle: "Brand identity — Cộng đồng nghệ sĩ trẻ",
    milestoneTitle: "Freelance cho studio địa phương",
    milestoneKind: "lam_viec",
    taggedAt: "2026-05-10T11:00:00+07:00",
    nganhLabel: "Đồ họa",
    album: {
      title: "Case study — Brand Cộng đồng nghệ sĩ",
      href: "/journey/duc-huy-pham/brand-case",
      excerpt: "Logo, guideline, ứng dụng thương hiệu",
      coverSrc: "/uploads/pasted-1777438450952-0.png",
      coverAlt: "Brand identity case study",
      photoCount: 6,
    },
    evidence: [
      {
        label: "Hợp đồng thực tập (đã che thông tin nhạy cảm)",
        kind: "file",
        detail: "hop-dong-redacted.pdf",
      },
    ],
  },
  {
    id: "mt-5",
    status: "rejected",
    studentName: "Hoàng Ngọc Linh",
    projectTitle: "Video making-of (nháp)",
    milestoneTitle: "Giải khuyến khích cuộc thi nội bộ",
    milestoneKind: "thanh_tuu",
    taggedAt: "2026-05-08T08:22:00+07:00",
    nganhLabel: null,
    album: {
      title: "Making-of (nháp, chưa public)",
      href: "/journey/ngoc-linh-hoang/making-of-draft",
      excerpt: "Bản nháp — chưa xuất bản",
      coverGradient: "linear-gradient(135deg, #334155 0%, #64748b 100%)",
    },
    evidence: [
      {
        label: "Chưa đính kèm bằng chứng",
        kind: "text",
        detail: "User gửi lại sau",
      },
    ],
  },
];

export function milestoneKindLabel(
  kind: MilestoneTagNotifyItem["milestoneKind"],
): string {
  switch (kind) {
    case "du_an":
      return "Đồ án / dự án";
    case "hoc":
      return "Học tập";
    case "lam_viec":
      return "Làm việc";
    case "thanh_tuu":
      return "Thành tựu";
    default:
      return kind;
  }
}

export function formatTaggedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function notifyStatusLabel(status: MilestoneTagNotifyStatus): string {
  switch (status) {
    case "pending":
      return "Chờ duyệt";
    case "approved":
      return "Đã gắn";
    case "rejected":
      return "Từ chối";
    default:
      return status;
  }
}
