import type { OrgMembershipMilestoneRequestItem } from "@/lib/journey/membership-milestone-types";
import type { ChatMessage } from "@/lib/chat/types";

/** Hội thoại org ↔ user trong inbox staff (tab Tin nhắn trang org). */
export type OrgInboxThreadStatus = "open" | "replied";

export type OrgInboxEnrollment = {
  hocVienLopId: string;
  khoaId: string;
  tenKhoa: string;
  lopId: string | null;
  maLop: string | null;
};

export type OrgInboxThread = {
  roomId: string;
  studentUserId: string;
  studentName: string;
  studentSlug: string;
  studentAvatarUrl: string | null;
  /** Quan hệ với org: Người lạ, Học viên, Giảng viên… */
  studentContactLabel: string;
  /** Mã vai trò org — dùng màu badge (`giao_vien`, `hoc_vien`, …). */
  studentContactRole: string;
  /** Giai đoạn Journey (Đang học, Đang làm…). */
  studentRole: string;
  subject: string;
  preview: string;
  lastAt: string;
  unread: boolean;
  unreadCount: number;
  status: OrgInboxThreadStatus;
  /** Cột mốc danh tính chờ org duyệt — hiển thị card trong thread. */
  pendingVerification: OrgMembershipMilestoneRequestItem | null;
  /** Có đơn học phí `cho_thanh_toan` gắn HV này. */
  pendingDonHocPhi: boolean;
  /** Ghi danh khóa/lớp hiện có — dùng CTA gửi đơn / mở lớp. */
  enrollments: OrgInboxEnrollment[];
};

export type OrgInboxThreadDetail = OrgInboxThread & {
  messages: ChatMessage[];
};

export function inboxThreadNeedsAction(thread: OrgInboxThread): boolean {
  return (
    thread.unread ||
    Boolean(thread.pendingVerification) ||
    thread.pendingDonHocPhi
  );
}
