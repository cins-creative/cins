import type { MediaCallMode } from "@/lib/media/call-mode";
import { mediaCallLabel } from "@/lib/media/call-mode";

export type ChatCuocGoiTrangThai =
  | "dang_goi"
  | "dang_dien_ra"
  | "ket_thuc"
  | "nho"
  | "tu_choi";

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
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
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
  };
}

export function buildCuocGoiNguCanh(notice: ChatCuocGoiNotice) {
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
  };
}
