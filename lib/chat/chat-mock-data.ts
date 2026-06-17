export type ChatMessage = {
  id: string;
  from: "me" | "them";
  body: string;
  sentAt: string;
};

export type ChatParticipantKind = "user" | "org";

export type ChatThreadGroup = "ban_be" | "nguoi_la" | "to_chuc";

export type ChatOrgKind =
  | "co_so_dao_tao"
  | "truong_dai_hoc"
  | "cong_dong"
  | "studio";

export type ChatThread = {
  id: string;
  name: string;
  group: ChatThreadGroup;
  kind: ChatParticipantKind;
  orgKind?: ChatOrgKind;
  verified?: boolean;
  role: string;
  avatarInitial: string;
  avatarHue: number;
  preview: string;
  lastAt: string;
  unread: number;
  online?: boolean;
  typing?: boolean;
  messages: ChatMessage[];
};

export const CHAT_ORG_KIND_LABEL: Record<ChatOrgKind, string> = {
  co_so_dao_tao: "Cơ sở đào tạo",
  truong_dai_hoc: "Trường đại học",
  cong_dong: "Cộng đồng",
  studio: "Studio",
};

export const CHAT_PARTICIPANT_KIND_LABEL: Record<ChatParticipantKind, string> = {
  user: "Cá nhân",
  org: "Tổ chức",
};

export const CHAT_THREAD_GROUP_ORDER: ChatThreadGroup[] = [
  "ban_be",
  "nguoi_la",
  "to_chuc",
];

export const CHAT_THREAD_GROUP_LABEL: Record<ChatThreadGroup, string> = {
  ban_be: "Bạn bè",
  nguoi_la: "Người lạ",
  to_chuc: "Tổ chức",
};

export const MOCK_CHAT_THREADS: ChatThread[] = [
  {
    id: "c1",
    name: "Minh Anh Nguyễn",
    group: "ban_be",
    kind: "user",
    role: "Illustrator · HCM",
    avatarInitial: "M",
    avatarHue: 210,
    preview: "Portfolio em gửi ở link Behance nhé…",
    lastAt: "2026-06-17T16:45:00+07:00",
    unread: 2,
    online: true,
    messages: [
      {
        id: "c1m1",
        from: "them",
        body: "Chào bạn, mình thấy dự án UI trên Journey của bạn — rất hợp style mình đang tìm cho team.",
        sentAt: "2026-06-17T16:20:00+07:00",
      },
      {
        id: "c1m2",
        from: "me",
        body: "Cảm ơn bạn! Mình đang mở slot freelance từ tháng 7. Bạn cần support phần visual hay full UI?",
        sentAt: "2026-06-17T16:28:00+07:00",
      },
      {
        id: "c1m3",
        from: "them",
        body: "Portfolio em gửi ở link Behance nhé — phần character design là strength chính của em.",
        sentAt: "2026-06-17T16:45:00+07:00",
      },
    ],
  },
  {
    id: "c2",
    name: "Sine Art",
    group: "to_chuc",
    kind: "org",
    orgKind: "co_so_dao_tao",
    verified: true,
    role: "Cơ sở đào tạo · Verified",
    avatarInitial: "S",
    avatarHue: 155,
    preview: "Lớp Digital Painting khai giảng 12/7…",
    lastAt: "2026-06-17T14:10:00+07:00",
    unread: 0,
    online: true,
    messages: [
      {
        id: "c2m1",
        from: "them",
        body: "Chào bạn, Sine Art xác nhận bạn đã đăng ký buổi tư vấn ngành Digital Painting.",
        sentAt: "2026-06-17T13:50:00+07:00",
      },
      {
        id: "c2m2",
        from: "them",
        body: "Lớp Digital Painting khai giảng 12/7 — bạn có thể xem syllabus trên trang cơ sở.",
        sentAt: "2026-06-17T14:10:00+07:00",
      },
    ],
  },
  {
    id: "c3",
    name: "Trần Hoàng Long",
    group: "ban_be",
    kind: "user",
    role: "3D Artist · Studio",
    avatarInitial: "L",
    avatarHue: 265,
    preview: "… đang gõ",
    lastAt: "2026-06-17T11:30:00+07:00",
    unread: 0,
    typing: true,
    messages: [
      {
        id: "c3m1",
        from: "me",
        body: "Long ơi, file Blender mình export xong rồi — gửi qua Drive được không?",
        sentAt: "2026-06-17T11:15:00+07:00",
      },
      {
        id: "c3m2",
        from: "them",
        body: "Ok bạn, mình check qua chiều nay nhé.",
        sentAt: "2026-06-17T11:22:00+07:00",
      },
    ],
  },
  {
    id: "c4",
    name: "Cộng đồng Motion VN",
    group: "to_chuc",
    kind: "org",
    orgKind: "cong_dong",
    role: "Cộng đồng · 2.4k thành viên",
    avatarInitial: "M",
    avatarHue: 32,
    preview: "Admin: Workshop After Effects tuần sau…",
    lastAt: "2026-06-16T20:00:00+07:00",
    unread: 1,
    messages: [
      {
        id: "c4m1",
        from: "them",
        body: "Admin: Workshop After Effects tuần sau — đăng ký trước 20/6 để giữ slot.",
        sentAt: "2026-06-16T20:00:00+07:00",
      },
    ],
  },
  {
    id: "c5",
    name: "Phạm Thu Hà",
    group: "nguoi_la",
    kind: "user",
    role: "Học sinh lớp 12",
    avatarInitial: "H",
    avatarHue: 340,
    preview: "Em cảm ơn anh/chị đã tư vấn ạ!",
    lastAt: "2026-06-15T09:00:00+07:00",
    unread: 0,
    messages: [
      {
        id: "c5m1",
        from: "them",
        body: "Anh/chị cho em hỏi ngành Thiết kế đồ họa HUTECH có cần portfolio trước khi nộp hồ sơ không ạ?",
        sentAt: "2026-06-14T18:30:00+07:00",
      },
      {
        id: "c5m2",
        from: "me",
        body: "Nên có 5–8 work tốt nhất — sketchbook scan cũng được. Em gửi thêm link Journey nếu có nhé.",
        sentAt: "2026-06-14T19:15:00+07:00",
      },
      {
        id: "c5m3",
        from: "them",
        body: "Em cảm ơn anh/chị đã tư vấn ạ!",
        sentAt: "2026-06-15T09:00:00+07:00",
      },
    ],
  },
  {
    id: "c6",
    name: "ĐH Mỹ thuật TP.HCM",
    group: "to_chuc",
    kind: "org",
    orgKind: "truong_dai_hoc",
    verified: true,
    role: "Trường đại học · Verified",
    avatarInitial: "M",
    avatarHue: 12,
    preview: "Phòng TS đã cập nhật lịch phỏng vấn năng khiếu…",
    lastAt: "2026-06-14T15:40:00+07:00",
    unread: 0,
    messages: [
      {
        id: "c6m1",
        from: "them",
        body: "Chào bạn, ĐH Mỹ thuật TP.HCM xác nhận hồ sơ online của bạn đã vào vòng xét tuyển.",
        sentAt: "2026-06-14T14:55:00+07:00",
      },
      {
        id: "c6m2",
        from: "them",
        body: "Phòng TS đã cập nhật lịch phỏng vấn năng khiếu trên trang tuyển sinh — bạn kiểm tra email nhé.",
        sentAt: "2026-06-14T15:40:00+07:00",
      },
    ],
  },
  {
    id: "c7",
    name: "Pixel Forge Studio",
    group: "to_chuc",
    kind: "org",
    orgKind: "studio",
    verified: true,
    role: "Studio · Game art",
    avatarInitial: "P",
    avatarHue: 288,
    preview: "Brief UI mockup gửi lại file Figma giúp mình…",
    lastAt: "2026-06-13T10:20:00+07:00",
    unread: 0,
    messages: [
      {
        id: "c7m1",
        from: "them",
        body: "Chào bạn, Pixel Forge đang tìm UI designer part-time cho dự án mobile RPG.",
        sentAt: "2026-06-13T09:40:00+07:00",
      },
      {
        id: "c7m2",
        from: "me",
        body: "Mình quan tâm — bạn gửi thêm scope và timeline được không?",
        sentAt: "2026-06-13T09:58:00+07:00",
      },
      {
        id: "c7m3",
        from: "them",
        body: "Brief UI mockup gửi lại file Figma giúp mình — link trong tin trước nhé.",
        sentAt: "2026-06-13T10:20:00+07:00",
      },
    ],
  },
] satisfies ChatThread[];

export function formatChatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      ...(sameDay ? {} : { day: "2-digit", month: "2-digit" }),
    }).format(d);
  } catch {
    return iso;
  }
}

export function avatarBg(hue: number): string {
  return `hsl(${hue} 62% 42%)`;
}
