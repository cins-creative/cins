/** Map tên ngân hàng người bán nhập → mã VietQR (img.vietqr.io). */
const BANK_ALIASES: Array<{ code: string; aliases: string[] }> = [
  { code: "VCB", aliases: ["vietcombank", "vcb", "ngoai thuong", "vietcom"] },
  { code: "TCB", aliases: ["techcombank", "tcb", "techcom"] },
  { code: "MB", aliases: ["mb bank", "mbbank", "mb", "quan doi"] },
  { code: "BIDV", aliases: ["bidv", "dau tu va phat trien"] },
  { code: "ICB", aliases: ["vietinbank", "vietin", "ctg", "cong thuong"] },
  { code: "VBA", aliases: ["agribank", "agri", "nong nghiep", "vba"] },
  { code: "ACB", aliases: ["acb", "a chau", "asia commercial"] },
  { code: "TPB", aliases: ["tpbank", "tpb", "tien phong"] },
  { code: "VPB", aliases: ["vpbank", "vpb"] },
  { code: "STB", aliases: ["sacombank", "stb", "sai gon thuong tin"] },
  { code: "HDB", aliases: ["hdbank", "hdb", "phat trien tp"] },
  { code: "VIB", aliases: ["vib", "quoc te"] },
  { code: "MSB", aliases: ["msb", "hang hai"] },
  { code: "OCB", aliases: ["ocb", "phuong dong"] },
  { code: "SHB", aliases: ["shb", "sai gon ha noi"] },
  { code: "EIB", aliases: ["eximbank", "eib", "xuat nhap khau"] },
  { code: "LPB", aliases: ["lpbank", "lienviet", "liên việt", "lvb", "lpb"] },
  { code: "SEAB", aliases: ["seabank", "seab", "dong a"] },
  { code: "BAB", aliases: ["bacabank", "bac a", "bab"] },
  { code: "PVCB", aliases: ["pvcombank", "pvcb", "dai chung"] },
  { code: "NAB", aliases: ["namabank", "nama", "nab"] },
  { code: "VCCB", aliases: ["vietcapital", "ban viet", "vccb"] },
  { code: "SCB", aliases: ["scb", "sai gon"] },
  { code: "PGB", aliases: ["pgbank", "pgb", "xang dau"] },
  { code: "KLB", aliases: ["kienlong", "klb"] },
  { code: "ABB", aliases: ["abbank", "an binh", "abb"] },
  { code: "BVB", aliases: ["baovietbank", "bao viet", "bvb"] },
  { code: "VIETBANK", aliases: ["vietbank", "viet bank"] },
  { code: "CAKE", aliases: ["cake"] },
  { code: "UBANK", aliases: ["ubank"] },
  { code: "TIMO", aliases: ["timo"] },
];

function normalizeBankKey(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Trả mã VietQR từ tên ngân hàng tự do; null nếu không khớp. */
export function resolveVietQrBankCode(nganHang: string): string | null {
  const key = normalizeBankKey(nganHang);
  if (!key) return null;
  for (const entry of BANK_ALIASES) {
    if (entry.aliases.some((a) => key === a || key.includes(a))) {
      return entry.code;
    }
  }
  // Người bán có thể đã nhập sẵn mã ngắn (VCB, TCB…).
  const compact = key.replace(/\s+/g, "").toUpperCase();
  if (/^[A-Z]{2,10}$/.test(compact)) return compact;
  return null;
}

export type BuildVietQrImageUrlInput = {
  nganHang: string;
  soTaiKhoan: string;
};

/**
 * Ảnh QR VietQR (PNG) — chỉ ngân hàng + STK.
 * Không gắn amount / addInfo / accountName vào QR.
 */
export function buildVietQrImageUrl(
  input: BuildVietQrImageUrlInput,
): string | null {
  const stk = input.soTaiKhoan.replace(/\s+/g, "").trim();
  if (!stk) return null;
  const bank = resolveVietQrBankCode(input.nganHang);
  if (!bank) return null;

  return `https://img.vietqr.io/image/${encodeURIComponent(bank)}-${encodeURIComponent(stk)}-qr_only.png`;
}
