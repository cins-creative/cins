import "server-only";

import { countPendingOrgMilestoneTagVerifies } from "@/lib/admin/pending-content-verify";
import type { AdminInboxStats } from "@/lib/admin/admin-inbox-stats-types";
import { countDongGopChoDuyetForAdmin } from "@/lib/article/dong-gop/admin-list";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type { AdminInboxStats } from "@/lib/admin/admin-inbox-stats-types";
export { EMPTY_ADMIN_INBOX_STATS } from "@/lib/admin/admin-inbox-stats-types";

const OPEN_STATUSES = ["moi", "dang_xu_ly"] as const;

async function countOpenBaoCao(): Promise<number> {
  const admin = createServiceRoleClient();
  const { count, error } = await admin
    .from("social_bao_cao")
    .select("id", { count: "exact", head: true })
    .eq("kenh", "admin")
    .in("trang_thai", [...OPEN_STATUSES]);

  if (error) return 0;
  return count ?? 0;
}

async function countOpenGopY(): Promise<number> {
  const admin = createServiceRoleClient();
  const { count, error } = await admin
    .from("gop_y")
    .select("id", { count: "exact", head: true })
    .in("trang_thai", [...OPEN_STATUSES]);

  if (error) return 0;
  return count ?? 0;
}

/** Đếm 4 hàng đợi admin cần xử lý / theo dõi. */
export async function countAdminInboxStats(): Promise<AdminInboxStats> {
  const [baoCao, gopY, dongGop, noiDungChoXacThuc] = await Promise.all([
    countOpenBaoCao(),
    countOpenGopY(),
    countDongGopChoDuyetForAdmin(),
    countPendingOrgMilestoneTagVerifies().catch(() => 0),
  ]);

  return {
    baoCao,
    gopY,
    dongGop,
    noiDungChoXacThuc,
    total: baoCao + gopY + dongGop + noiDungChoXacThuc,
  };
}
