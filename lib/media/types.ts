export type MediaProviderId = "cloudflare" | "livekit";

export type MediaJoinToken = {
  provider: MediaProviderId;
  /** RealtimeKit authToken hoặc LiveKit JWT (Phase B). */
  token: string;
  /** Meeting / room id phía provider. */
  externalRoomId: string;
  /** chat_phong.id — neo CINs. */
  chatPhongId: string;
  /** Staff → host preset; HV → participant (cam tắt mặc định qua preset CF). */
  role: "staff" | "student";
};

export type MediaBangThongSnapshot = {
  provider: MediaProviderId;
  /** Tháng lịch UTC (YYYY-MM). */
  ky: string;
  freeGb: number;
  usedGb: number;
  percent: number;
  /** 70 | 85 | 95 khi chạm ngưỡng; null nếu dưới 70. */
  alertLevel: 70 | 85 | 95 | null;
  source: "cloudflare_graphql" | "unavailable" | "manual";
  note: string | null;
  fetchedAt: string;
};
