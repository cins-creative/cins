export type AdminUserGrowthDays = 7 | 30;

export type AdminUserGrowthPoint = {
  date: string; // YYYY-MM-DD Asia/Ho_Chi_Minh
  count: number;
};

export type AdminUserGrowth = {
  days: AdminUserGrowthDays;
  series: AdminUserGrowthPoint[];
  totals: { current: number; previous: number };
  today: number;
  last7: number;
  last30: number;
  recent: Array<{
    id: string;
    tenHienThi: string;
    slug: string;
    email: string | null;
    taoLuc: string;
  }>;
};
