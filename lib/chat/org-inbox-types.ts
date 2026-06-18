import type { ChatMessage } from "@/lib/chat/types";

/** Hội thoại org ↔ user trong inbox staff (tab Tin nhắn trang org). */
export type OrgInboxThreadStatus = "open" | "replied";

export type OrgInboxThread = {
  roomId: string;
  studentUserId: string;
  studentName: string;
  studentSlug: string;
  studentAvatarUrl: string | null;
  /** Quan hệ với org: Người lạ, Học viên, Giảng viên… */
  studentContactLabel: string;
  /** Giai đoạn Journey (Đang học, Đang làm…). */
  studentRole: string;
  subject: string;
  preview: string;
  lastAt: string;
  unread: boolean;
  unreadCount: number;
  status: OrgInboxThreadStatus;
};

export type OrgInboxThreadDetail = OrgInboxThread & {
  messages: ChatMessage[];
};
