import "server-only";

import type {
  AdminUserGrowth,
  AdminUserGrowthDays,
  AdminUserGrowthPoint,
} from "@/lib/admin/nguoi-dung-growth-types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type {
  AdminUserGrowth,
  AdminUserGrowthDays,
  AdminUserGrowthPoint,
} from "@/lib/admin/nguoi-dung-growth-types";

const VN_TZ = "Asia/Ho_Chi_Minh";

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function dateKeyVn(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function lastNDateKeysVn(days: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    keys.push(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: VN_TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d),
    );
  }
  return keys;
}

async function fetchAllTaoLuc(sinceIso: string): Promise<string[]> {
  const admin = createServiceRoleClient();
  const pageSize = 1000;
  const times: string[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await admin
      .from("user_nguoi_dung")
      .select("tao_luc")
      .gte("tao_luc", sinceIso)
      .order("tao_luc", { ascending: true })
      .range(from, from + pageSize - 1)
      .returns<Array<{ tao_luc: string }>>();
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    for (const row of rows) {
      if (row.tao_luc) times.push(row.tao_luc);
    }
    if (rows.length < pageSize) break;
    from += pageSize;
    if (from > 50_000) break;
  }
  return times;
}

function countByDay(times: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const iso of times) {
    const key = dateKeyVn(iso);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

function sumKeys(map: Map<string, number>, keys: string[]): number {
  let n = 0;
  for (const k of keys) n += map.get(k) ?? 0;
  return n;
}

export async function fetchAdminUserGrowth(
  daysInput: number = 30,
): Promise<AdminUserGrowth> {
  const days: AdminUserGrowthDays = daysInput <= 7 ? 7 : 30;
  const sinceIso = daysAgoIso(Math.max(60, days * 2));

  const [times, recentRes] = await Promise.all([
    fetchAllTaoLuc(sinceIso),
    createServiceRoleClient()
      .from("user_nguoi_dung")
      .select("id, ten_hien_thi, slug, email_lien_he, tao_luc")
      .order("tao_luc", { ascending: false })
      .limit(12)
      .returns<
        Array<{
          id: string;
          ten_hien_thi: string | null;
          slug: string;
          email_lien_he: string | null;
          tao_luc: string;
        }>
      >(),
  ]);

  if (recentRes.error) throw new Error(recentRes.error.message);

  const byDay = countByDay(times);
  const windowKeys = lastNDateKeysVn(days * 2);
  const prevKeys = windowKeys.slice(0, days);
  const currentKeys = windowKeys.slice(days);
  const keys30 = lastNDateKeysVn(30);
  const keys7 = lastNDateKeysVn(7);
  const todayKey = keys7[keys7.length - 1] ?? dateKeyVn(new Date().toISOString());

  const series: AdminUserGrowthPoint[] = currentKeys.map((date) => ({
    date,
    count: byDay.get(date) ?? 0,
  }));

  return {
    days,
    series,
    totals: {
      current: sumKeys(byDay, currentKeys),
      previous: sumKeys(byDay, prevKeys),
    },
    today: byDay.get(todayKey) ?? 0,
    last7: sumKeys(byDay, keys7),
    last30: sumKeys(byDay, keys30),
    recent: (recentRes.data ?? []).map((r) => ({
      id: r.id,
      tenHienThi: r.ten_hien_thi?.trim() || r.slug,
      slug: r.slug,
      email: r.email_lien_he?.trim() || null,
      taoLuc: r.tao_luc,
    })),
  };
}
