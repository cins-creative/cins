/** Types shared client/server — không import server-only. */

export type XoaBlocker = {
  loai: string;
  soLuong: number;
  nhan: string;
  duongDan?: string | null;
};

export type XoaCanhBao = {
  loai: string;
  soLuong: number;
  nhan: string;
};

export type XoaPreflight = {
  coTheXoa: boolean;
  blockers: XoaBlocker[];
  canhBao: XoaCanhBao[];
};
