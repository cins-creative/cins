/** Mock — hộp thư hỏi đáp tuyển sinh từ user (chưa nối chat_*) */

export type InboxThreadStatus = "open" | "replied" | "archived";

export type InboxMessage = {
  id: string;
  from: "user" | "school";
  body: string;
  sentAt: string;
};

export type InboxThread = {
  id: string;
  status: InboxThreadStatus;
  unread: boolean;
  userName: string;
  userRole: string;
  subject: string;
  preview: string;
  taggedAt: string;
  messages: InboxMessage[];
};

export const MOCK_INBOX_THREADS: InboxThread[] = [
  {
    id: "th-1",
    status: "open",
    unread: true,
    userName: "Phạm Thu Hà",
    userRole: "Học sinh lớp 12",
    subject: "Hỏi điều kiện xét tuyển ngành Điêu khắc",
    preview: "Em muốn hỏi khối H00 có cần thêm môn vẽ không ạ?",
    taggedAt: "2026-05-21T08:10:00+07:00",
    messages: [
      {
        id: "m1",
        from: "user",
        body: "Chào trường, em đang học lớp 12 tại TP.HCM. Em muốn hỏi khối H00 ngành Điêu khắc có bắt buộc thêm môn vẽ không ạ? Em có portfolio gốm tự học.",
        sentAt: "2026-05-21T08:10:00+07:00",
      },
    ],
  },
  {
    id: "th-2",
    status: "open",
    unread: true,
    userName: "Nguyễn Đức Kiên",
    userRole: "Phụ huynh",
    subject: "Học phí và ký túc xá 2026",
    preview: "Gia đình muốn biết mức học phí dự kiến…",
    taggedAt: "2026-05-20T19:22:00+07:00",
    messages: [
      {
        id: "m2",
        from: "user",
        body: "Kính gửi trường, gia đình nhà cháu đang tìm hiểu ngành Thiết kế đồ họa. Cho em hỏi học phí năm 2026 và điều kiện ở KTX ạ?",
        sentAt: "2026-05-20T19:22:00+07:00",
      },
    ],
  },
  {
    id: "th-3",
    status: "open",
    unread: true,
    userName: "Lê Minh Quân",
    userRole: "Sinh viên năm 2",
    subject: "Chuyển ngành từ Hội hoạ sang Đồ họa",
    preview: "Em đang học Hội hoạ nhưng muốn chuyển…",
    taggedAt: "2026-05-20T14:05:00+07:00",
    messages: [
      {
        id: "m3",
        from: "user",
        body: "Em là SV năm 2 ngành Hội hoạ, GPA 7.8. Em có thể xin chuyển ngành sang Đồ họa kỳ tới không và cần bổ sung hồ sơ gì?",
        sentAt: "2026-05-20T14:05:00+07:00",
      },
    ],
  },
  {
    id: "th-4",
    status: "replied",
    unread: false,
    userName: "Trần Ngọc Bích",
    userRole: "Ứng viên",
    subject: "Lịch Open Day tháng 6",
    preview: "Cảm ơn trường đã phản hồi…",
    taggedAt: "2026-05-18T10:00:00+07:00",
    messages: [
      {
        id: "m4a",
        from: "user",
        body: "Open Day tháng 6 đăng ký ở đâu ạ? Có cần mang portfolio không?",
        sentAt: "2026-05-18T10:00:00+07:00",
      },
      {
        id: "m4b",
        from: "school",
        body: "Chào bạn, Open Day 14/6 — đăng ký qua form trên fanpage trường. Nên mang sketchbook hoặc file PDF portfolio (tùy ngành).",
        sentAt: "2026-05-18T15:30:00+07:00",
      },
      {
        id: "m4c",
        from: "user",
        body: "Dạ em cảm ơn trường ạ!",
        sentAt: "2026-05-19T09:00:00+07:00",
      },
    ],
  },
  {
    id: "th-5",
    status: "open",
    unread: false,
    userName: "Võ Thanh Tùng",
    userRole: "Học sinh",
    subject: "Xét tuyển thẳng từ THPT chuyên",
    preview: "Em đạt giải HSQP cấp tỉnh môn Mỹ thuật…",
    taggedAt: "2026-05-17T11:40:00+07:00",
    messages: [
      {
        id: "m5",
        from: "user",
        body: "Em đạt giải nhất HSQP tỉnh môn Mỹ thuật. Em có được xét tuyển thẳng ngành Hội hoạ không ạ?",
        sentAt: "2026-05-17T11:40:00+07:00",
      },
    ],
  },
  {
    id: "th-6",
    status: "archived",
    unread: false,
    userName: "Hoàng Yến Nhi",
    userRole: "Phụ huynh",
    subject: "Đã giải quyết — cảm ơn",
    preview: "Thông tin đã rõ.",
    taggedAt: "2026-05-10T08:00:00+07:00",
    messages: [
      {
        id: "m6a",
        from: "user",
        body: "Hỏi về học bổng cho con em.",
        sentAt: "2026-05-10T08:00:00+07:00",
      },
      {
        id: "m6b",
        from: "school",
        body: "Trường đã gửi file PDF chính sách học bổng qua email.",
        sentAt: "2026-05-10T14:00:00+07:00",
      },
    ],
  },
];

export function formatInboxTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function inboxStatusLabel(status: InboxThreadStatus): string {
  switch (status) {
    case "open":
      return "Chưa trả lời";
    case "replied":
      return "Đã trả lời";
    case "archived":
      return "Lưu trữ";
    default:
      return status;
  }
}
