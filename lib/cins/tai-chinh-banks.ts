/**
 * Danh sách ngân hàng phổ biến cho STK nhận phí CINs.
 * `code` = mã VietQR (img.vietqr.io) — lưu vào `cins_cau_hinh_tai_chinh.bank_bin`.
 * Client-safe (không server-only).
 */
export const CINS_BANK_OPTIONS: ReadonlyArray<{
  code: string;
  ten: string;
}> = [
  { code: "VCB", ten: "Vietcombank" },
  { code: "TCB", ten: "Techcombank" },
  { code: "MB", ten: "MB Bank" },
  { code: "BIDV", ten: "BIDV" },
  { code: "ICB", ten: "VietinBank" },
  { code: "VBA", ten: "Agribank" },
  { code: "ACB", ten: "ACB" },
  { code: "TPB", ten: "TPBank" },
  { code: "VPB", ten: "VPBank" },
  { code: "STB", ten: "Sacombank" },
  { code: "HDB", ten: "HDBank" },
  { code: "VIB", ten: "VIB" },
  { code: "MSB", ten: "MSB" },
  { code: "OCB", ten: "OCB" },
  { code: "SHB", ten: "SHB" },
  { code: "EIB", ten: "Eximbank" },
  { code: "LPB", ten: "LPBank" },
  { code: "SEAB", ten: "SeABank" },
  { code: "CAKE", ten: "CAKE" },
  { code: "TIMO", ten: "Timo" },
] as const;

export function tenNganHangTuCode(code: string | null | undefined): string | null {
  if (!code?.trim()) return null;
  const c = code.trim().toUpperCase();
  const hit = CINS_BANK_OPTIONS.find((b) => b.code === c);
  return hit?.ten ?? null;
}
