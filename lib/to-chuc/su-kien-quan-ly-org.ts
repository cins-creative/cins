import "server-only";

import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";
import { getStepStatus } from "@/lib/truong/timeline";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { demDangKySeThamGia } from "@/lib/to-chuc/su-kien-dang-ky";
import { canViewerManageSuKien } from "@/lib/to-chuc/su-kien";
import type {
  SuKienQuanLyOrgItem,
  SuKienQuanLyOrgPayload,
} from "@/lib/to-chuc/su-kien-quan-ly-types";

const LIST_LIMIT = 40;

/**
 * Listing sự kiện đang/sắp diễn ra + số nội dung chờ duyệt (quầy / đăng ký).
 * Chỉ BTC (owner / admin / quản lý nội dung).
 */
export async function loadSuKienQuanLyOrg(
  actorId: string,
  orgId: string,
): Promise<
  | { ok: true; data: SuKienQuanLyOrgPayload }
  | { ok: false; error: string; status: number }
> {
  if (!(await canViewerManageSuKien(actorId, orgId))) {
    return { ok: false, error: "Không có quyền quản lý sự kiện.", status: 403 };
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_su_kien")
    .select("id, ten, cover_id, bat_dau, ket_thuc")
    .eq("id_to_chuc", orgId)
    .order("bat_dau", { ascending: true })
    .limit(120);

  if (error) {
    return { ok: false, error: error.message, status: 500 };
  }

  const liveRows = (data ?? [])
    .map((row) => {
      const r = row as {
        id: string;
        ten: string;
        cover_id: string | null;
        bat_dau: string;
        ket_thuc: string | null;
      };
      const status = getStepStatus(r.bat_dau, r.ket_thuc);
      if (status !== "active" && status !== "upcoming") return null;
      return { ...r, status };
    })
    .filter((r): r is NonNullable<typeof r> => r != null)
    .slice(0, LIST_LIMIT);

  if (!liveRows.length) {
    return { ok: true, data: { suKien: [], tongChoDuyet: 0 } };
  }

  const ids = liveRows.map((r) => r.id);
  const [joinCounts, { data: quayRows }] = await Promise.all([
    demDangKySeThamGia(ids),
    admin
      .from("shop_quay_su_kien")
      .select("id_su_kien, trang_thai")
      .in("id_su_kien", ids)
      .eq("trang_thai", "cho_xu_ly")
      .limit(500),
  ]);

  const pendingBySuKien = new Map<string, number>();
  for (const row of quayRows ?? []) {
    const sid = (row as { id_su_kien?: string }).id_su_kien;
    if (!sid) continue;
    pendingBySuKien.set(sid, (pendingBySuKien.get(sid) ?? 0) + 1);
  }

  const suKien: SuKienQuanLyOrgItem[] = liveRows.map((r) => ({
    id: r.id,
    ten: r.ten,
    batDau: r.bat_dau,
    ketThuc: r.ket_thuc,
    coverSrc: r.cover_id
      ? resolveTruongImageSrcSync(r.cover_id, ["public", "cover", "medium"])
      : null,
    status: r.status,
    soSeThamGia: joinCounts.get(r.id) ?? 0,
    soChoDuyetNoiDung: pendingBySuKien.get(r.id) ?? 0,
  }));

  /* Ưu tiên sự kiện có chờ duyệt, rồi đang diễn ra, rồi theo ngày. */
  suKien.sort((a, b) => {
    if (a.soChoDuyetNoiDung !== b.soChoDuyetNoiDung) {
      return b.soChoDuyetNoiDung - a.soChoDuyetNoiDung;
    }
    if (a.status !== b.status) {
      return a.status === "active" ? -1 : 1;
    }
    return new Date(a.batDau).getTime() - new Date(b.batDau).getTime();
  });

  const tongChoDuyet = suKien.reduce((n, sk) => n + sk.soChoDuyetNoiDung, 0);

  return { ok: true, data: { suKien, tongChoDuyet } };
}
