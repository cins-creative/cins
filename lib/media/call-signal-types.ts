import type { MediaCallMode } from "@/lib/media/call-mode";
import { mediaCallLabel } from "@/lib/media/call-mode";

export type ChatCuocGoiTrangThai =
  | "dang_goi"
  | "dang_dien_ra"
  | "ket_thuc"
  | "nho"
  | "tu_choi";

/** TTL token nhúng chuông (ms) — khớp RING_TIMEOUT + đệm. */
export const CUOC_GOI_JOIN_TOKEN_TTL_MS = 55_000;

/** Tin hệ thống cuộc gọi (`loai_tin=system`, `ngu_canh.loai=cuoc_goi`). */
export type ChatCuocGoiNotice = {
  mode: MediaCallMode;
  trangThai: ChatCuocGoiTrangThai;
  tenNguoiGoi: string;
  batDau: string;
  /** Thời điểm bắt máy (để tính thời lượng). */
  thamGiaLuc?: string | null;
  ketThuc?: string | null;
  thoiLuongS?: number | null;
  /**
   * AuthToken RealtimeKit cho callee (DM 1-1) — chỉ khi dang_goi.
   * TTL ngắn; hết hạn → fallback fetch token.
   */
  joinToken?: string | null;
  joinTokenExp?: string | null;
};

const TRANG_THAI: ChatCuocGoiTrangThai[] = [
  "dang_goi",
  "dang_dien_ra",
  "ket_thuc",
  "nho",
  "tu_choi",
];

const MODES: MediaCallMode[] = ["audio", "video", "screen"];

export function formatCallDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function modeCallShortLabel(mode: MediaCallMode): string {
  if (mode === "audio") return "Thoại";
  if (mode === "screen") return "Màn hình";
  return "Video";
}

/** Nội dung `noi_dung` + preview sidebar. */
export function cuocGoiMessageBody(
  mode: MediaCallMode,
  trangThai: ChatCuocGoiTrangThai,
  thoiLuongS?: number | null,
): string {
  const kind = mediaCallLabel(mode);
  if (trangThai === "dang_goi") return `${kind}…`;
  if (trangThai === "dang_dien_ra") return `Đang trong ${kind.toLowerCase()}`;
  if (trangThai === "nho") return `Cuộc gọi nhỡ · ${modeCallShortLabel(mode)}`;
  if (trangThai === "tu_choi") return `Đã từ chối · ${modeCallShortLabel(mode)}`;
  if (typeof thoiLuongS === "number" && thoiLuongS >= 0) {
    return `${kind} · ${formatCallDuration(thoiLuongS)}`;
  }
  return kind;
}

export function parseChatCuocGoi(raw: unknown): ChatCuocGoiNotice | null {
  let value: unknown = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object") return null;
  const r = value as Record<string, unknown>;
  if (r.loai !== "cuoc_goi") return null;
  const modeRaw = typeof r.mode === "string" ? r.mode : null;
  const trangThaiRaw = typeof r.trangThai === "string" ? r.trangThai : null;
  const tenNguoiGoi =
    typeof r.tieuDe === "string"
      ? r.tieuDe.trim()
      : typeof r.tenNguoiGoi === "string"
        ? r.tenNguoiGoi.trim()
        : "";
  const batDau = typeof r.batDau === "string" ? r.batDau : null;
  if (
    !modeRaw ||
    !MODES.includes(modeRaw as MediaCallMode) ||
    !trangThaiRaw ||
    !TRANG_THAI.includes(trangThaiRaw as ChatCuocGoiTrangThai) ||
    !tenNguoiGoi ||
    !batDau
  ) {
    return null;
  }
  const joinToken =
    typeof r.joinToken === "string" && r.joinToken.trim()
      ? r.joinToken.trim()
      : null;
  const joinTokenExp =
    typeof r.joinTokenExp === "string" ? r.joinTokenExp : null;

  return {
    mode: modeRaw as MediaCallMode,
    trangThai: trangThaiRaw as ChatCuocGoiTrangThai,
    tenNguoiGoi,
    batDau,
    ketThuc: typeof r.ketThuc === "string" ? r.ketThuc : null,
    thamGiaLuc: typeof r.thamGiaLuc === "string" ? r.thamGiaLuc : null,
    thoiLuongS:
      typeof r.thoiLuongS === "number" && Number.isFinite(r.thoiLuongS)
        ? Math.max(0, Math.floor(r.thoiLuongS))
        : null,
    joinToken:
      trangThaiRaw === "dang_goi" && joinToken && joinTokenExp
        ? joinToken
        : null,
    joinTokenExp:
      trangThaiRaw === "dang_goi" && joinToken && joinTokenExp
        ? joinTokenExp
        : null,
  };
}

export function isCuocGoiJoinTokenFresh(
  notice: Pick<ChatCuocGoiNotice, "joinToken" | "joinTokenExp" | "trangThai">,
): boolean {
  if (notice.trangThai !== "dang_goi") return false;
  if (!notice.joinToken?.trim() || !notice.joinTokenExp) return false;
  const exp = Date.parse(notice.joinTokenExp);
  return Number.isFinite(exp) && Date.now() < exp;
}

export function buildCuocGoiNguCanh(notice: ChatCuocGoiNotice) {
  const embedToken =
    notice.trangThai === "dang_goi" &&
    notice.joinToken?.trim() &&
    notice.joinTokenExp;

  return {
    loai: "cuoc_goi",
    mode: notice.mode,
    trangThai: notice.trangThai,
    tieuDe: notice.tenNguoiGoi,
    batDau: notice.batDau,
    ...(notice.thamGiaLuc ? { thamGiaLuc: notice.thamGiaLuc } : {}),
    ...(notice.ketThuc ? { ketThuc: notice.ketThuc } : {}),
    ...(typeof notice.thoiLuongS === "number"
      ? { thoiLuongS: notice.thoiLuongS }
      : {}),
    ...(embedToken
      ? {
          joinToken: notice.joinToken,
          joinTokenExp: notice.joinTokenExp,
        }
      : {}),
  };
}
