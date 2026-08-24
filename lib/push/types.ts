import "server-only";

/** Nền tảng nhận push — khớp CHECK user_web_push_nen_tang_chk. */
export type PushNenTang = "web" | "ios" | "android";

export function isPushNenTang(v: unknown): v is PushNenTang {
  return v === "web" || v === "ios" || v === "android";
}

export type UserWebPushRow = {
  id: string;
  id_nguoi_dung: string;
  nen_tang: PushNenTang;
  endpoint: string | null;
  p256dh: string | null;
  auth: string | null;
  token: string | null;
  user_agent: string | null;
  tao_luc: string;
  cap_nhat_luc: string;
  mat_hieu_luc_luc: string | null;
};
