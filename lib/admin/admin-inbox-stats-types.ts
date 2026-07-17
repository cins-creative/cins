/** Client-safe types cho admin inbox topbar. */

export type AdminInboxStats = {
  baoCao: number;
  gopY: number;
  dongGop: number;
  noiDungChoXacThuc: number;
  total: number;
};

export const EMPTY_ADMIN_INBOX_STATS: AdminInboxStats = {
  baoCao: 0,
  gopY: 0,
  dongGop: 0,
  noiDungChoXacThuc: 0,
  total: 0,
};
