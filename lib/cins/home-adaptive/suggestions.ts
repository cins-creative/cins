import "server-only";

import { getAvatarUrl } from "@/lib/journey/profile";
import { resolvePersona, type GiaiDoan, type Persona } from "@/lib/cins/home-adaptive/persona";
import {
  CO_SO_DAO_TAO_LOAI,
  orgLoaiLabel,
  SCHOOL_ORG_LOAI,
  type FollowSuggestion,
  type OrgFollowSuggestion,
} from "@/lib/cins/home-adaptive/suggestions-display";
import { listFriends } from "@/lib/social/ket-ban";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";
import { orgPublicHref } from "@/lib/search/helpers";

export type { FollowSuggestion, OrgFollowSuggestion } from "@/lib/cins/home-adaptive/suggestions-display";
export {
  CO_SO_DAO_TAO_LOAI,
  orgFollowSubtitle,
  orgLoaiLabel,
  SCHOOL_ORG_LOAI,
} from "@/lib/cins/home-adaptive/suggestions-display";

type UserRow = {
  id: string;
  slug: string | null;
  ten_hien_thi: string | null;
  avatar_id: string | null;
  giai_doan: string | null;
};

/**
 * Gợi ý người để kết nối (module `goi_y_theo_doi` / `nguoi_cung_nganh`, feed promo).
 * Loại: bản thân · chưa xong onboarding (`giai_doan` null) · đã có quan hệ
 * `user_ket_ban` (pending / accepted / blocked) · đã theo dõi (legacy).
 * Ưu tiên hoạt động gần đây.
 */
export async function loadFollowSuggestions(
  viewerId: string,
  limit = 4,
): Promise<FollowSuggestion[]> {
  const admin = createServiceRoleClient();

  const [{ data: followed }, { data: ketBanRows }] = await Promise.all([
    admin
      .from("user_theo_doi")
      .select("id_doi_tuong")
      .eq("id_nguoi_theo_doi", viewerId)
      .eq("loai_doi_tuong", "nguoi_dung")
      .returns<Array<{ id_doi_tuong: string }>>(),
    admin
      .from("user_ket_ban")
      .select("id_nguoi_gui, id_nguoi_nhan")
      .or(`id_nguoi_gui.eq.${viewerId},id_nguoi_nhan.eq.${viewerId}`)
      .returns<Array<{ id_nguoi_gui: string; id_nguoi_nhan: string }>>(),
  ]);

  const excluded = new Set<string>([
    viewerId,
    ...(followed ?? []).map((r) => r.id_doi_tuong),
  ]);
  for (const row of ketBanRows ?? []) {
    excluded.add(
      row.id_nguoi_gui === viewerId ? row.id_nguoi_nhan : row.id_nguoi_gui,
    );
  }

  const { data } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id, giai_doan")
    .eq("trang_thai_tai_khoan", "dang_hoat_dong")
    .not("giai_doan", "is", null)
    .order("lan_cuoi_active", { ascending: false, nullsFirst: false })
    .limit(limit + excluded.size + 12)
    .returns<UserRow[]>();

  const out: FollowSuggestion[] = [];
  for (const row of data ?? []) {
    if (excluded.has(row.id) || !row.slug?.trim() || !row.giai_doan) continue;
    out.push({
      id: row.id,
      slug: row.slug.trim(),
      name: row.ten_hien_thi?.trim() || row.slug.trim(),
      avatarUrl: getAvatarUrl(row.avatar_id),
      giaiDoan: row.giai_doan,
      mutualCount: 0,
      isFriend: false,
    });
    if (out.length >= limit) break;
  }

  await attachMutualCounts(viewerId, out);
  return out;
}

/**
 * Tính số bạn chung giữa người xem và từng gợi ý — 1 query batch (tránh N+1).
 * Bạn = `user_ket_ban` trạng thái accepted (2 chiều).
 */
async function attachMutualCounts(
  viewerId: string,
  suggestions: FollowSuggestion[],
): Promise<void> {
  if (suggestions.length === 0) return;

  const viewerFriends = new Set(await listFriends(viewerId));
  if (viewerFriends.size === 0) return;

  const admin = createServiceRoleClient();
  const ids = suggestions.map((s) => s.id);
  const idList = ids.join(",");

  const { data: rows } = await admin
    .from("user_ket_ban")
    .select("id_nguoi_gui, id_nguoi_nhan")
    .eq("trang_thai", "accepted")
    .or(`id_nguoi_gui.in.(${idList}),id_nguoi_nhan.in.(${idList})`)
    .returns<Array<{ id_nguoi_gui: string; id_nguoi_nhan: string }>>();

  const idSet = new Set(ids);
  /* Map: gợi ý → tập bạn của họ (chỉ giữ bạn nằm trong friend-set người xem). */
  const mutualByUser = new Map<string, Set<string>>();
  for (const r of rows ?? []) {
    const guiIsSuggestion = idSet.has(r.id_nguoi_gui);
    const suggestionId = guiIsSuggestion ? r.id_nguoi_gui : r.id_nguoi_nhan;
    const friendId = guiIsSuggestion ? r.id_nguoi_nhan : r.id_nguoi_gui;
    if (!idSet.has(suggestionId)) continue;
    if (!viewerFriends.has(friendId)) continue;
    const set = mutualByUser.get(suggestionId) ?? new Set<string>();
    set.add(friendId);
    mutualByUser.set(suggestionId, set);
  }

  for (const s of suggestions) {
    s.mutualCount = mutualByUser.get(s.id)?.size ?? 0;
    s.isFriend = viewerFriends.has(s.id);
  }
}

/* ───────────────────────── Gợi ý theo dõi TỔ CHỨC (L21 #1) ───────────────────────── */

/**
 * Loại org *theo dõi được* để gợi ý (cộng đồng đi luồng "Tham gia" riêng — L21).
 * `doanh_nghiep` ẩn UI nhưng dùng chung template studio.
 */
const FOLLOWABLE_ORG_LOAI = [
  "truong_dai_hoc",
  "co_so_dao_tao",
  "studio",
  "doanh_nghiep",
] as const;

/** persona → loại org "hợp gu" (cộng điểm khi trùng). */
const PERSONA_ORG_LOAI: Record<Persona, string[]> = {
  hoc: ["truong_dai_hoc", "co_so_dao_tao"],
  lam: ["studio", "doanh_nghiep"],
  day: ["co_so_dao_tao", "truong_dai_hoc"],
};

type OrgRow = {
  id: string;
  slug: string | null;
  ten: string | null;
  loai_to_chuc: string;
  avatar_id: string | null;
  logo_id: string | null;
  tinh_thanh: string | null;
  trang_thai_hoat_dong: string | null;
};

function tinhThanhLabel(value: string | null): string {
  return value ? value.replace(/_/g, " ") : "";
}

/**
 * Gợi ý tổ chức để theo dõi (module `goi_y_theo_doi`, song song gợi ý người — L21 #1).
 * Chấm điểm: bạn chung theo dõi (mạnh nhất) + cùng tỉnh + hợp persona + còn hoạt động.
 * Match theo ngành/nghề chưa hỗ trợ (chỉ trường nối ngành) — xem FOUNDATIONS §13.
 */
export async function loadOrgFollowSuggestions(
  viewerId: string,
  limit = 3,
  options?: { loaiToChuc?: readonly string[] },
): Promise<OrgFollowSuggestion[]> {
  const loaiFilter = options?.loaiToChuc;
  const admin = createServiceRoleClient();

  const [
    friendIds,
    { data: profile },
    { data: followedOrgRows },
    { data: memberRows },
  ] = await Promise.all([
    listFriends(viewerId),
    admin
      .from("user_nguoi_dung")
      .select("giai_doan, tinh_thanh")
      .eq("id", viewerId)
      .maybeSingle<{ giai_doan: string | null; tinh_thanh: string | null }>(),
    admin
      .from("user_theo_doi")
      .select("id_doi_tuong")
      .eq("id_nguoi_theo_doi", viewerId)
      .eq("loai_doi_tuong", "to_chuc")
      .returns<Array<{ id_doi_tuong: string }>>(),
    admin
      .from("user_thanh_vien_to_chuc")
      .select("id_to_chuc")
      .eq("id_nguoi_dung", viewerId)
      .returns<Array<{ id_to_chuc: string }>>(),
  ]);

  const persona = resolvePersona(profile?.giai_doan as GiaiDoan | null);
  const viewerTinh = profile?.tinh_thanh?.trim() || null;
  const personaLoai = PERSONA_ORG_LOAI[persona];

  const excluded = new Set<string>([
    ...(followedOrgRows ?? []).map((r) => r.id_doi_tuong),
    ...(memberRows ?? []).map((r) => r.id_to_chuc),
  ]);

  /* Bạn chung theo dõi org → đếm theo org. */
  const mutualByOrg = new Map<string, number>();
  if (friendIds.length > 0) {
    const { data: friendFollows } = await admin
      .from("user_theo_doi")
      .select("id_doi_tuong")
      .in("id_nguoi_theo_doi", friendIds)
      .eq("loai_doi_tuong", "to_chuc")
      .returns<Array<{ id_doi_tuong: string }>>();
    for (const r of friendFollows ?? []) {
      mutualByOrg.set(r.id_doi_tuong, (mutualByOrg.get(r.id_doi_tuong) ?? 0) + 1);
    }
  }

  const ORG_SELECT =
    "id, slug, ten, loai_to_chuc, avatar_id, logo_id, tinh_thanh, trang_thai_hoat_dong";

  /* Ứng viên: org bạn chung theo dõi + pool theo persona + pool cùng tỉnh. */
  const mutualOrgIds = [...mutualByOrg.keys()].filter((id) => !excluded.has(id));
  const [byMutual, byPersona, byTinh] = await Promise.all([
    mutualOrgIds.length > 0
      ? admin.from("org_to_chuc").select(ORG_SELECT).in("id", mutualOrgIds).returns<OrgRow[]>()
      : Promise.resolve({ data: [] as OrgRow[] }),
    admin
      .from("org_to_chuc")
      .select(ORG_SELECT)
      .in("loai_to_chuc", personaLoai)
      .neq("trang_thai_hoat_dong", "da_dong_cua")
      .order("ten", { ascending: true })
      .limit(24)
      .returns<OrgRow[]>(),
    viewerTinh
      ? admin
          .from("org_to_chuc")
          .select(ORG_SELECT)
          .eq("tinh_thanh", viewerTinh)
          .in("loai_to_chuc", FOLLOWABLE_ORG_LOAI as unknown as string[])
          .neq("trang_thai_hoat_dong", "da_dong_cua")
          .limit(12)
          .returns<OrgRow[]>()
      : Promise.resolve({ data: [] as OrgRow[] }),
  ]);

  const candidates = new Map<string, OrgRow>();
  for (const row of [...(byMutual.data ?? []), ...(byPersona.data ?? []), ...(byTinh.data ?? [])]) {
    if (excluded.has(row.id) || !row.slug?.trim() || !row.ten?.trim()) continue;
    if (!(FOLLOWABLE_ORG_LOAI as readonly string[]).includes(row.loai_to_chuc)) continue;
    if (loaiFilter && !loaiFilter.includes(row.loai_to_chuc)) continue;
    if (row.trang_thai_hoat_dong === "da_dong_cua") continue;
    candidates.set(row.id, row);
  }
  if (candidates.size === 0) return [];

  /* Org có bài đã đăng → cộng điểm "còn hoạt động". */
  const candidateIds = [...candidates.keys()];
  const { data: postedRows } = await admin
    .from("org_bai_dang")
    .select("id_to_chuc")
    .in("id_to_chuc", candidateIds)
    .eq("trang_thai", "da_dang")
    .returns<Array<{ id_to_chuc: string }>>();
  const hasPosts = new Set((postedRows ?? []).map((r) => r.id_to_chuc));

  const scored = [...candidates.values()].map((row) => {
    const mutual = mutualByOrg.get(row.id) ?? 0;
    const sameTinh = Boolean(viewerTinh && row.tinh_thanh === viewerTinh);
    const personaMatch = personaLoai.includes(row.loai_to_chuc);
    const active = hasPosts.has(row.id);
    const score =
      mutual * 3 + (sameTinh ? 2 : 0) + (personaMatch ? 2 : 0) + (active ? 1 : 0);

    const reason =
      mutual > 0
        ? `${mutual} bạn đang theo dõi`
        : sameTinh
          ? `Cùng ${tinhThanhLabel(row.tinh_thanh)}`
          : orgLoaiLabel(row.loai_to_chuc);

    const slug = row.slug as string;
    const avatarId = row.avatar_id ?? row.logo_id;
    return {
      id: row.id,
      slug,
      name: (row.ten as string).trim(),
      avatarUrl: avatarId
        ? resolveTruongImageSrcSync(avatarId, ["public", "avatar"])
        : null,
      loaiToChuc: row.loai_to_chuc,
      href: orgPublicHref(row.loai_to_chuc, slug),
      mutualCount: mutual,
      reason,
      _score: score,
    };
  });

  scored.sort((a, b) => b._score - a._score || b.mutualCount - a.mutualCount);
  return scored.slice(0, limit).map(({ _score, ...rest }) => rest);
}
