// Client-safe types & constants cho module Góp ý.
// KHÔNG import "server-only" ở đây — file này được dùng cả ở client component.

export type GopYTrangThai = "moi" | "dang_xu_ly" | "da_xu_ly" | "bo_qua";

export const GOP_Y_TRANG_THAI_LABEL: Record<GopYTrangThai, string> = {
  moi: "Mới",
  dang_xu_ly: "Đang xử lý",
  da_xu_ly: "Đã xử lý",
  bo_qua: "Bỏ qua",
};

export const GOP_Y_TRANG_THAI_ORDER: GopYTrangThai[] = [
  "moi",
  "dang_xu_ly",
  "da_xu_ly",
  "bo_qua",
];

export type CreateGopYInput = {
  idNguoiDung?: string | null;
  hoTen?: string | null;
  email?: string | null;
  noiDung: string;
  trangUrl?: string | null;
  anhUrl?: string | null;
  userAgent?: string | null;
};

export type CreateGopYResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export type UserBrief = {
  id: string;
  slug: string;
  tenHienThi: string;
  avatarSrc: string | null;
};

export type GopYItem = {
  id: string;
  hoTen: string | null;
  email: string | null;
  noiDung: string;
  trangUrl: string | null;
  anhUrl: string | null;
  userAgent: string | null;
  trangThai: GopYTrangThai;
  ghiChu: string | null;
  taoLuc: string;
  xuLyLuc: string | null;
  nguoiGui: UserBrief | null;
};
