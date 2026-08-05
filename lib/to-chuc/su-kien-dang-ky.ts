import "server-only";

import type { FeedFriendAttendee } from "@/components/journey/milestone-types";
import { getAvatarUrl } from "@/lib/journey/profile";
import { listFriends } from "@/lib/social/ket-ban";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  isLoaiPhanHoiSuKien,
  type LoaiPhanHoiSuKien,
} from "@/lib/to-chuc/su-kien-phan-hoi-types";

export {
  isLoaiPhanHoiSuKien,
  LOAI_PHAN_HOI_SU_KIEN,
  type LoaiPhanHoiSuKien,
} from "@/lib/to-chuc/su-kien-phan-hoi-types";

const TRANG_THAI_HUY = new Set(["tu_choi", "huy"]);

/** Tối đa bạn bè giữ lại mỗi loại phản hồi (tránh payload phình). */
const MAX_FRIEND_ATTENDEES = 30;

type DangKyRow = {
  id: string;
  loai_phan_hoi: string;
  trang_thai: string;
};

export type SuKienPhanHoiCounts = {
  soQuanTam: number;
  soSeThamGia: number;
};

export type SuKienBanBePhanHoi = {
  banBeQuanTam: FeedFriendAttendee[];
  banBeSeThamGia: FeedFriendAttendee[];
};

async function getSuKienMeta(suKienId: string): Promise<{
  orgId: string;
  slotToiDa: number | null;
} | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_su_kien")
    .select("id_to_chuc, slot_toi_da")
    .eq("id", suKienId)
    .maybeSingle<{ id_to_chuc: string; slot_toi_da: number | null }>();
  if (!data?.id_to_chuc) return null;
  return {
    orgId: data.id_to_chuc,
    slotToiDa:
      typeof data.slot_toi_da === "number" && data.slot_toi_da > 0
        ? data.slot_toi_da
        : null,
  };
}

export async function demDangKySeThamGia(
  suKienIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!suKienIds.length) return counts;

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_dang_ky_su_kien")
    .select("id_su_kien, loai_phan_hoi, trang_thai")
    .in("id_su_kien", suKienIds);

  for (const row of data ?? []) {
    const sid = (row as { id_su_kien?: string }).id_su_kien;
    const loai = (row as { loai_phan_hoi?: string }).loai_phan_hoi;
    const trangThai = (row as { trang_thai?: string }).trang_thai ?? "";
    if (!sid || loai !== "se_tham_gia" || TRANG_THAI_HUY.has(trangThai)) continue;
    counts.set(sid, (counts.get(sid) ?? 0) + 1);
  }
  return counts;
}

/** Đếm quan tâm + sẽ tham gia cho một sự kiện (cùng exclusion `trang_thai`). */
export async function demPhanHoiSuKien(
  suKienId: string,
): Promise<SuKienPhanHoiCounts> {
  const out: SuKienPhanHoiCounts = { soQuanTam: 0, soSeThamGia: 0 };
  if (!suKienId) return out;

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_dang_ky_su_kien")
    .select("loai_phan_hoi, trang_thai")
    .eq("id_su_kien", suKienId)
    .returns<Array<{ loai_phan_hoi: string; trang_thai: string }>>();

  for (const row of data ?? []) {
    if (TRANG_THAI_HUY.has(row.trang_thai ?? "")) continue;
    if (row.loai_phan_hoi === "se_tham_gia") out.soSeThamGia += 1;
    else if (row.loai_phan_hoi === "quan_tam") out.soQuanTam += 1;
  }
  return out;
}

/**
 * Bạn bè đã kết bạn (accepted) phản hồi sự kiện — tách quan_tam / se_tham_gia.
 * Fetch 2 bước (đăng ký → profile) rồi join JS: không phụ thuộc FK embed PostgREST.
 */
export async function layBanBePhanHoiSuKien(
  suKienId: string,
  viewerProfileId: string,
): Promise<SuKienBanBePhanHoi> {
  const empty: SuKienBanBePhanHoi = {
    banBeQuanTam: [],
    banBeSeThamGia: [],
  };
  if (!suKienId || !viewerProfileId) return empty;

  const friendIds = await listFriends(viewerProfileId);
  if (friendIds.length === 0) return empty;

  const admin = createServiceRoleClient();
  const { data: regs } = await admin
    .from("org_dang_ky_su_kien")
    .select("id_nguoi_dung, loai_phan_hoi, trang_thai")
    .eq("id_su_kien", suKienId)
    .in("id_nguoi_dung", friendIds)
    .in("loai_phan_hoi", ["quan_tam", "se_tham_gia"])
    .returns<
      Array<{
        id_nguoi_dung: string;
        loai_phan_hoi: string;
        trang_thai: string;
      }>
    >();

  const pairs: Array<{ userId: string; loai: LoaiPhanHoiSuKien }> = [];
  const userIds = new Set<string>();
  for (const row of regs ?? []) {
    if (TRANG_THAI_HUY.has(row.trang_thai ?? "")) continue;
    if (!isLoaiPhanHoiSuKien(row.loai_phan_hoi)) continue;
    pairs.push({ userId: row.id_nguoi_dung, loai: row.loai_phan_hoi });
    userIds.add(row.id_nguoi_dung);
  }
  if (pairs.length === 0) return empty;

  const { data: users } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .in("id", [...userIds])
    .returns<
      Array<{
        id: string;
        slug: string | null;
        ten_hien_thi: string | null;
        avatar_id: string | null;
      }>
    >();

  const byUser = new Map<string, FeedFriendAttendee>();
  for (const u of users ?? []) {
    const slug = u.slug?.trim();
    if (!slug) continue;
    const name = u.ten_hien_thi?.trim() || slug;
    byUser.set(u.id, {
      id: u.id,
      slug,
      name,
      avatarUrl: getAvatarUrl(u.avatar_id),
      initial: name.slice(0, 1).toUpperCase(),
    });
  }

  const banBeQuanTam: FeedFriendAttendee[] = [];
  const banBeSeThamGia: FeedFriendAttendee[] = [];
  for (const { userId, loai } of pairs) {
    const attendee = byUser.get(userId);
    if (!attendee) continue;
    if (loai === "se_tham_gia") {
      if (banBeSeThamGia.length < MAX_FRIEND_ATTENDEES) {
        banBeSeThamGia.push(attendee);
      }
    } else if (banBeQuanTam.length < MAX_FRIEND_ATTENDEES) {
      banBeQuanTam.push(attendee);
    }
  }

  return { banBeQuanTam, banBeSeThamGia };
}

export async function layPhanHoiViewer(
  suKienId: string,
  profileId: string,
): Promise<LoaiPhanHoiSuKien | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_dang_ky_su_kien")
    .select("loai_phan_hoi, trang_thai")
    .eq("id_su_kien", suKienId)
    .eq("id_nguoi_dung", profileId)
    .maybeSingle<{ loai_phan_hoi: string; trang_thai: string }>();

  if (!data?.loai_phan_hoi || TRANG_THAI_HUY.has(data.trang_thai)) return null;
  return isLoaiPhanHoiSuKien(data.loai_phan_hoi) ? data.loai_phan_hoi : null;
}

/** Map sự kiện → loại phản hồi (quan tâm / sẽ tham gia) của viewer. */
export async function loadUserSuKienPhanHoiMap(
  profileId: string | null | undefined,
): Promise<Map<string, LoaiPhanHoiSuKien>> {
  const out = new Map<string, LoaiPhanHoiSuKien>();
  if (!profileId) return out;

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_dang_ky_su_kien")
    .select("id_su_kien, loai_phan_hoi, trang_thai")
    .eq("id_nguoi_dung", profileId)
    .returns<
      Array<{
        id_su_kien: string;
        loai_phan_hoi: string;
        trang_thai: string;
      }>
    >();

  for (const row of data ?? []) {
    if (TRANG_THAI_HUY.has(row.trang_thai)) continue;
    if (!isLoaiPhanHoiSuKien(row.loai_phan_hoi)) continue;
    out.set(row.id_su_kien, row.loai_phan_hoi);
  }
  return out;
}

export async function datPhanHoiSuKien(
  suKienId: string,
  profileId: string,
  loai: LoaiPhanHoiSuKien,
): Promise<
  | {
      ok: true;
      loai: LoaiPhanHoiSuKien | null;
      soDangKy: number;
      soQuanTam: number;
      soSeThamGia: number;
    }
  | { ok: false; error: string }
> {
  const meta = await getSuKienMeta(suKienId);
  if (!meta) return { ok: false, error: "Không tìm thấy sự kiện." };

  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("org_dang_ky_su_kien")
    .select("id, loai_phan_hoi, trang_thai")
    .eq("id_su_kien", suKienId)
    .eq("id_nguoi_dung", profileId)
    .maybeSingle<DangKyRow>();

  if (
    existing &&
    !TRANG_THAI_HUY.has(existing.trang_thai) &&
    existing.loai_phan_hoi === loai
  ) {
    const { error: delErr } = await admin
      .from("org_dang_ky_su_kien")
      .delete()
      .eq("id", existing.id);
    if (delErr) return { ok: false, error: delErr.message };
    const counts = await demPhanHoiSuKien(suKienId);
    return {
      ok: true,
      loai: null,
      soDangKy: counts.soSeThamGia,
      soQuanTam: counts.soQuanTam,
      soSeThamGia: counts.soSeThamGia,
    };
  }

  if (loai === "se_tham_gia" && meta.slotToiDa != null) {
    const counts = await demDangKySeThamGia([suKienId]);
    const current = counts.get(suKienId) ?? 0;
    const alreadySeThamGia =
      existing &&
      !TRANG_THAI_HUY.has(existing.trang_thai) &&
      existing.loai_phan_hoi === "se_tham_gia";
    if (!alreadySeThamGia && current >= meta.slotToiDa) {
      return { ok: false, error: "Sự kiện đã hết chỗ." };
    }
  }

  const payload = {
    id_su_kien: suKienId,
    id_nguoi_dung: profileId,
    loai_phan_hoi: loai,
    trang_thai: "da_duyet" as const,
  };

  if (existing && !TRANG_THAI_HUY.has(existing.trang_thai)) {
    const { error } = await admin
      .from("org_dang_ky_su_kien")
      .update(payload)
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await admin.from("org_dang_ky_su_kien").upsert(payload, {
      onConflict: "id_su_kien,id_nguoi_dung",
    });
    if (error) return { ok: false, error: error.message };
  }

  const counts = await demPhanHoiSuKien(suKienId);
  return {
    ok: true,
    loai,
    soDangKy: counts.soSeThamGia,
    soQuanTam: counts.soQuanTam,
    soSeThamGia: counts.soSeThamGia,
  };
}
