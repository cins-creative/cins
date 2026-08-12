import "server-only";

import { countPendingOrgMilestoneTagVerifies } from "@/lib/admin/pending-content-verify";
import type { AdminInboxStats } from "@/lib/admin/admin-inbox-stats-types";
import { countDongGopChoDuyetForAdmin } from "@/lib/article/dong-gop/admin-list";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type { AdminInboxStats } from "@/lib/admin/admin-inbox-stats-types";
export { EMPTY_ADMIN_INBOX_STATS } from "@/lib/admin/admin-inbox-stats-types";

const OPEN_STATUSES = ["moi", "dang_xu_ly"] as const;

async function countOpenBaoCao(): Promise<number> {
  try {
    const admin = createServiceRoleClient();
    const { count, error } = await admin
      .from("social_bao_cao")
      .select("id", { count: "exact", head: true })
      .eq("kenh", "admin")
      .in("trang_thai", [...OPEN_STATUSES]);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function countOpenGopY(): Promise<number> {
  try {
    const admin = createServiceRoleClient();
    const { count, error } = await admin
      .from("gop_y")
      .select("id", { count: "exact", head: true })
      .in("trang_thai", [...OPEN_STATUSES]);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function countOpenMoShop(): Promise<number> {
  try {
    const admin = createServiceRoleClient();
    const { count, error } = await admin
      .from("shop_dang_ky_mo")
      .select("id", { count: "exact", head: true })
      .in("trang_thai", ["moi", "cho_duyet"]);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function countOpenTranhChap(): Promise<number> {
  try {
    const admin = createServiceRoleClient();
    const [kn, phi] = await Promise.all([
      admin
        .from("shop_khieu_nai")
        .select("id", { count: "exact", head: true })
        .in("trang_thai", ["mo", "cho_phan_hoi", "dang_xu_ly"]),
      admin
        .from("shop_phi_ky")
        .select("id", { count: "exact", head: true })
        .in("trang_thai", ["chua_tra", "qua_han"])
        .not("bien_lai_anh_url", "is", null),
    ]);
    return (kn.error ? 0 : (kn.count ?? 0)) + (phi.error ? 0 : (phi.count ?? 0));
  } catch {
    return 0;
  }
}

async function countOpenDanhMuc(): Promise<number> {
  try {
    const admin = createServiceRoleClient();
    const { count, error } = await admin
      .from("shop_danh_muc_yeu_cau")
      .select("id", { count: "exact", head: true })
      .eq("trang_thai", "moi");
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function countNickSeedingChoDuyet(): Promise<number> {
  try {
    const admin = createServiceRoleClient();
    const { count, error } = await admin
      .from("auto_ban_thao")
      .select("id", { count: "exact", head: true })
      .eq("trang_thai", "cho_duyet");
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/** Đếm hàng đợi admin cần xử lý / duyệt. */
export async function countAdminInboxStats(): Promise<AdminInboxStats> {
  const [
    baoCao,
    gopY,
    dongGop,
    noiDungChoXacThuc,
    moShop,
    tranhChap,
    danhMuc,
    nickSeeding,
  ] = await Promise.all([
    countOpenBaoCao(),
    countOpenGopY(),
    countDongGopChoDuyetForAdmin(),
    countPendingOrgMilestoneTagVerifies().catch(() => 0),
    countOpenMoShop(),
    countOpenTranhChap(),
    countOpenDanhMuc(),
    countNickSeedingChoDuyet(),
  ]);

  return {
    baoCao,
    gopY,
    dongGop,
    noiDungChoXacThuc,
    moShop,
    tranhChap,
    danhMuc,
    nickSeeding,
    total:
      baoCao +
      gopY +
      dongGop +
      noiDungChoXacThuc +
      moShop +
      tranhChap +
      danhMuc +
      nickSeeding,
  };
}
