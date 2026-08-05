import "server-only";

import { getAvatarUrl } from "@/lib/journey/profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  isLoaiPhanHoiSuKien,
  type LoaiPhanHoiSuKien,
} from "@/lib/to-chuc/su-kien-dang-ky";
import { canViewerManageSuKien } from "@/lib/to-chuc/su-kien";
import type {
  SuKienQuanLyPayload,
  SuKienQuanLyThanhVien,
} from "@/lib/to-chuc/su-kien-quan-ly-types";

export type {
  SuKienQuanLyPayload,
  SuKienQuanLyStats,
  SuKienQuanLyThanhVien,
} from "@/lib/to-chuc/su-kien-quan-ly-types";

const TRANG_THAI_HUY = new Set(["tu_choi", "huy"]);
/** Avatar xếp chồng trên panel — list đầy đủ lazy khi mở popup. */
const ATTENDEE_FACEPILE = 5;
const ATTENDEE_LIST_LIMIT = 200;

type ActiveRow = {
  id_nguoi_dung: string;
  loai_phan_hoi: string;
  tao_luc: string;
};

async function assertCanLoad(
  actorId: string,
  orgId: string,
  suKienId: string,
): Promise<
  | {
      ok: true;
      admin: ReturnType<typeof createServiceRoleClient>;
      slotToiDa: number | null;
    }
  | { ok: false; error: string; status: number }
> {
  if (!(await canViewerManageSuKien(actorId, orgId))) {
    return { ok: false, error: "Không có quyền quản lý sự kiện.", status: 403 };
  }

  const admin = createServiceRoleClient();
  const { data: sk } = await admin
    .from("org_su_kien")
    .select("id, id_to_chuc, slot_toi_da")
    .eq("id", suKienId)
    .maybeSingle<{
      id: string;
      id_to_chuc: string;
      slot_toi_da: number | null;
    }>();

  if (!sk) {
    return { ok: false, error: "Không tìm thấy sự kiện.", status: 404 };
  }
  if (sk.id_to_chuc !== orgId) {
    return { ok: false, error: "Sự kiện không thuộc tổ chức này.", status: 404 };
  }

  return {
    ok: true,
    admin,
    slotToiDa:
      typeof sk.slot_toi_da === "number" && sk.slot_toi_da > 0
        ? sk.slot_toi_da
        : null,
  };
}

async function loadActiveDangKy(
  admin: ReturnType<typeof createServiceRoleClient>,
  suKienId: string,
  limit: number,
): Promise<{
  activeRows: ActiveRow[];
  soSeThamGia: number;
  soQuanTam: number;
}> {
  const { data: dangKyRows } = await admin
    .from("org_dang_ky_su_kien")
    .select("id_nguoi_dung, loai_phan_hoi, trang_thai, tao_luc")
    .eq("id_su_kien", suKienId)
    .order("tao_luc", { ascending: false })
    .limit(limit);

  let soSeThamGia = 0;
  let soQuanTam = 0;
  const activeRows: ActiveRow[] = [];

  for (const row of dangKyRows ?? []) {
    const r = row as {
      id_nguoi_dung?: string;
      loai_phan_hoi?: string;
      trang_thai?: string;
      tao_luc?: string;
    };
    if (!r.id_nguoi_dung || !r.loai_phan_hoi || !r.tao_luc) continue;
    if (TRANG_THAI_HUY.has(r.trang_thai ?? "")) continue;
    if (!isLoaiPhanHoiSuKien(r.loai_phan_hoi)) continue;
    if (r.loai_phan_hoi === "se_tham_gia") soSeThamGia += 1;
    if (r.loai_phan_hoi === "quan_tam") soQuanTam += 1;
    activeRows.push({
      id_nguoi_dung: r.id_nguoi_dung,
      loai_phan_hoi: r.loai_phan_hoi,
      tao_luc: r.tao_luc,
    });
  }

  return { activeRows, soSeThamGia, soQuanTam };
}

async function mapThanhVien(
  admin: ReturnType<typeof createServiceRoleClient>,
  rows: ActiveRow[],
): Promise<SuKienQuanLyThanhVien[]> {
  const userIds = [...new Set(rows.map((r) => r.id_nguoi_dung))];
  const umap = new Map<
    string,
    {
      ten_hien_thi: string | null;
      slug: string | null;
      avatar_id: string | null;
    }
  >();
  if (userIds.length) {
    const { data: users } = await admin
      .from("user_nguoi_dung")
      .select("id, ten_hien_thi, slug, avatar_id")
      .in("id", userIds);
    for (const u of (users ?? []) as Array<{
      id: string;
      ten_hien_thi: string | null;
      slug: string | null;
      avatar_id: string | null;
    }>) {
      umap.set(u.id, {
        ten_hien_thi: u.ten_hien_thi,
        slug: u.slug,
        avatar_id: u.avatar_id,
      });
    }
  }

  return rows.map((r) => {
    const u = umap.get(r.id_nguoi_dung);
    return {
      id: r.id_nguoi_dung,
      ten: u?.ten_hien_thi ?? null,
      slug: u?.slug ?? null,
      avatarUrl: getAvatarUrl(u?.avatar_id ?? null),
      loai: r.loai_phan_hoi as LoaiPhanHoiSuKien,
      taoLuc: r.tao_luc,
    };
  });
}

/** Ưu tiên «sẽ tham gia» cho facepile. */
function pickFacepileRows(rows: ActiveRow[], limit: number): ActiveRow[] {
  const join = rows.filter((r) => r.loai_phan_hoi === "se_tham_gia");
  const interest = rows.filter((r) => r.loai_phan_hoi === "quan_tam");
  return [...join, ...interest].slice(0, limit);
}

export async function loadSuKienQuanLy(
  actorId: string,
  orgId: string,
  suKienId: string,
): Promise<
  | { ok: true; data: SuKienQuanLyPayload }
  | { ok: false; error: string; status: number }
> {
  const gate = await assertCanLoad(actorId, orgId, suKienId);
  if (!gate.ok) return gate;

  const [{ activeRows, soSeThamGia, soQuanTam }, { data: quayRows }] =
    await Promise.all([
      loadActiveDangKy(gate.admin, suKienId, ATTENDEE_LIST_LIMIT),
      gate.admin
        .from("shop_quay_su_kien")
        .select("trang_thai")
        .eq("id_su_kien", suKienId)
        .limit(200),
    ]);

  let soChoDuyetNoiDung = 0;
  let soDaDuyetNoiDung = 0;
  for (const row of quayRows ?? []) {
    const tt = (row as { trang_thai?: string }).trang_thai;
    if (tt === "cho_xu_ly") soChoDuyetNoiDung += 1;
    if (tt === "da_duyet") soDaDuyetNoiDung += 1;
  }

  const thanhVien = await mapThanhVien(
    gate.admin,
    pickFacepileRows(activeRows, ATTENDEE_FACEPILE),
  );

  return {
    ok: true,
    data: {
      stats: {
        soSeThamGia,
        soQuanTam,
        soChoDuyetNoiDung,
        soDaDuyetNoiDung,
        slotToiDa: gate.slotToiDa,
      },
      thanhVien,
    },
  };
}

/** Danh sách đầy đủ đăng ký — lazy khi mở popup facepile. */
export async function loadSuKienQuanLyThanhVien(
  actorId: string,
  orgId: string,
  suKienId: string,
): Promise<
  | { ok: true; thanhVien: SuKienQuanLyThanhVien[] }
  | { ok: false; error: string; status: number }
> {
  const gate = await assertCanLoad(actorId, orgId, suKienId);
  if (!gate.ok) return gate;

  const { activeRows } = await loadActiveDangKy(
    gate.admin,
    suKienId,
    ATTENDEE_LIST_LIMIT,
  );
  const thanhVien = await mapThanhVien(gate.admin, activeRows);
  return { ok: true, thanhVien };
}
