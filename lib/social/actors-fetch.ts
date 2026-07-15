import "server-only";

import type { GiaiDoan } from "@/lib/auth/session";
import { SOCIAL_LOAI_DOI_TUONG } from "@/lib/cong-dong/constants";
import {
  formatTinhThanh,
  getAvatarUrl,
  getGiaiDoanLabel,
} from "@/lib/journey/profile";
import type {
  SocialActorProfile,
  SocialActorsPage,
  SocialInteractionKind,
} from "@/lib/social/actors-types";
import { countMutualFriends, getQuanHeDetail } from "@/lib/social/ket-ban";
import { getFollowStatus } from "@/lib/social/follow";
import { SOCIAL_LOAI_ORG_BAI_DANG } from "@/lib/truong/social-constants";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const PAGE_SIZE = 24;

const ALLOWED_TARGETS = new Set<string>([
  SOCIAL_LOAI_DOI_TUONG.COT_MOC,
  SOCIAL_LOAI_ORG_BAI_DANG,
]);

const ALLOWED_KINDS = new Set<SocialInteractionKind>([
  "like",
  "dislike",
  "comment",
  "bookmark",
]);

type ProfileRow = {
  id: string;
  slug: string;
  ten_hien_thi: string | null;
  avatar_id: string | null;
  bio: string | null;
  giai_doan: string | null;
  tinh_thanh: string | null;
};

type ActorRow = {
  idNguoiDung: string;
  tuongTacLuc: string | null;
};

export async function fetchSocialActorsPage(params: {
  kind: SocialInteractionKind;
  loaiDoiTuong: string;
  idDoiTuong: string;
  offset?: number;
  limit?: number;
  viewerId?: string | null;
}): Promise<SocialActorsPage | { error: string; status: number }> {
  const { kind, loaiDoiTuong, idDoiTuong } = params;
  const offset = Math.max(0, params.offset ?? 0);
  const limit = Math.min(48, Math.max(1, params.limit ?? PAGE_SIZE));
  const viewerId = params.viewerId ?? null;

  if (!ALLOWED_TARGETS.has(loaiDoiTuong) || !ALLOWED_KINDS.has(kind)) {
    return { error: "Tham số không hợp lệ.", status: 400 };
  }
  if (!/^[0-9a-f-]{36}$/i.test(idDoiTuong)) {
    return { error: "Đối tượng không hợp lệ.", status: 400 };
  }

  const admin = createServiceRoleClient();
  const actorRows = await loadActorRows(admin, kind, loaiDoiTuong, idDoiTuong);
  const total = actorRows.length;
  const slice = actorRows.slice(offset, offset + limit);

  if (slice.length === 0) {
    return { actors: [], total, hasMore: false, viewerId };
  }

  const userIds = slice.map((row) => row.idNguoiDung);
  const { data: profiles } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id, bio, giai_doan, tinh_thanh")
    .in("id", userIds)
    .not("giai_doan", "is", null)
    .returns<ProfileRow[]>();

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const baseActors: SocialActorProfile[] = [];

  for (const row of slice) {
    const profile = profileById.get(row.idNguoiDung);
    if (!profile) continue;
    const bioRaw = profile.bio?.trim() || null;
    baseActors.push({
      idNguoiDung: profile.id,
      slug: profile.slug,
      tenHienThi: profile.ten_hien_thi?.trim() || profile.slug,
      avatarUrl: getAvatarUrl(profile.avatar_id),
      tuongTacLuc: row.tuongTacLuc,
      bio: bioRaw ? truncateBio(bioRaw) : null,
      giaiDoan: getGiaiDoanLabel(
        (profile.giai_doan as GiaiDoan | null) ?? null,
      ),
      tinhThanh: formatTinhThanh(profile.tinh_thanh),
      mutualFriendCount: 0,
      quanHe: "none",
      ketBanId: null,
      dangTheoDoi: false,
    });
  }

  const actors = await enrichActorsForViewer(baseActors, viewerId);

  return {
    actors,
    total,
    hasMore: offset + limit < total,
    viewerId,
  };
}

function truncateBio(text: string, max = 88): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

async function enrichActorsForViewer(
  actors: SocialActorProfile[],
  viewerId: string | null,
): Promise<SocialActorProfile[]> {
  if (!viewerId) return actors;

  return Promise.all(
    actors.map(async (actor) => {
      if (actor.idNguoiDung === viewerId) return actor;

      const [quanHeDetail, mutualFriendCount, followStatus] = await Promise.all([
        getQuanHeDetail(viewerId, actor.idNguoiDung),
        countMutualFriends(viewerId, actor.idNguoiDung),
        getFollowStatus(viewerId, actor.idNguoiDung, "user"),
      ]);

      return {
        ...actor,
        mutualFriendCount,
        quanHe: quanHeDetail.trangThai,
        ketBanId: quanHeDetail.ketBanId,
        dangTheoDoi: followStatus.dang_theo_doi,
      };
    }),
  );
}

async function loadActorRows(
  admin: ReturnType<typeof createServiceRoleClient>,
  kind: SocialInteractionKind,
  loaiDoiTuong: string,
  idDoiTuong: string,
): Promise<ActorRow[]> {
  if (kind === "like") {
    const { data } = await admin
      .from("social_reaction")
      .select("id_nguoi_dung, tao_luc")
      .eq("loai_doi_tuong", loaiDoiTuong)
      .eq("id_doi_tuong", idDoiTuong)
      .eq("emoji", "heart")
      .order("tao_luc", { ascending: false })
      .returns<Array<{ id_nguoi_dung: string; tao_luc: string | null }>>();

    return (data ?? []).map((row) => ({
      idNguoiDung: row.id_nguoi_dung,
      tuongTacLuc: row.tao_luc,
    }));
  }

  if (kind === "dislike") {
    const { data } = await admin
      .from("social_reaction")
      .select("id_nguoi_dung, tao_luc")
      .eq("loai_doi_tuong", loaiDoiTuong)
      .eq("id_doi_tuong", idDoiTuong)
      .eq("emoji", "dislike")
      .order("tao_luc", { ascending: false })
      .returns<Array<{ id_nguoi_dung: string; tao_luc: string | null }>>();

    return (data ?? []).map((row) => ({
      idNguoiDung: row.id_nguoi_dung,
      tuongTacLuc: row.tao_luc,
    }));
  }

  if (kind === "bookmark") {
    const { data } = await admin
      .from("social_luu")
      .select("id_nguoi_dung, tao_luc")
      .eq("loai_doi_tuong", loaiDoiTuong)
      .eq("id_doi_tuong", idDoiTuong)
      .eq("che_do_hien_thi", "public")
      .order("tao_luc", { ascending: false })
      .returns<Array<{ id_nguoi_dung: string; tao_luc: string | null }>>();

    return (data ?? []).map((row) => ({
      idNguoiDung: row.id_nguoi_dung,
      tuongTacLuc: row.tao_luc,
    }));
  }

  const { data } = await admin
    .from("social_binh_luan")
    .select("nguoi_binh_luan, tao_luc")
    .eq("loai_doi_tuong", loaiDoiTuong)
    .eq("id_doi_tuong", idDoiTuong)
    .eq("da_xoa", false)
    .order("tao_luc", { ascending: false })
    .returns<Array<{ nguoi_binh_luan: string; tao_luc: string | null }>>();

  const latestByUser = new Map<string, string | null>();
  for (const row of data ?? []) {
    if (latestByUser.has(row.nguoi_binh_luan)) continue;
    latestByUser.set(row.nguoi_binh_luan, row.tao_luc);
  }

  return [...latestByUser.entries()]
    .map(([idNguoiDung, tuongTacLuc]) => ({ idNguoiDung, tuongTacLuc }))
    .sort((a, b) => (b.tuongTacLuc ?? "").localeCompare(a.tuongTacLuc ?? ""));
}
