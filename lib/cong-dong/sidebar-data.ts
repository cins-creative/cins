import "server-only";

import type { GiaiDoan } from "@/lib/auth/session";
import { getGiaiDoanLabel } from "@/lib/journey/profile";
import { listFriends } from "@/lib/social/ket-ban";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import type {
  CongDongCareerSegment,
  CongDongMemberPreview,
  CongDongPulseItem,
} from "@/lib/cong-dong/types";

const GIAI_DOAN_ORDER: GiaiDoan[] = [
  "dang_hoc",
  "dang_lam",
  "freelance",
  "dang_day",
  "tim_viec",
  "moi_bat_dau",
];

const GIAI_DOAN_COLOR: Record<GiaiDoan, string> = {
  dang_hoc: "var(--cins-mint, #1fa97e)",
  dang_lam: "var(--cins-blue, #1f74c9)",
  freelance: "var(--cins-orange, #f0913b)",
  dang_day: "var(--cins-violet, #7c5cfc)",
  tim_viec: "#e85d75",
  moi_bat_dau: "#94a3b8",
};

async function loadMemberUserIds(orgId: string): Promise<string[]> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id_nguoi_dung")
    .eq("id_to_chuc", orgId)
    .returns<Array<{ id_nguoi_dung: string }>>();

  return [
    ...new Set(
      (data ?? [])
        .map((row) => row.id_nguoi_dung)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
}

export async function loadFriendsInCommunity(
  viewerId: string,
  orgId: string,
  previewLimit = 4,
): Promise<{ friends: CongDongMemberPreview[]; total: number }> {
  const friendIds = await listFriends(viewerId);
  if (friendIds.length === 0) return { friends: [], total: 0 };

  const admin = createServiceRoleClient();
  const { data: memberRows } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id_nguoi_dung")
    .eq("id_to_chuc", orgId)
    .in("id_nguoi_dung", friendIds)
    .returns<Array<{ id_nguoi_dung: string }>>();

  const inCommunity = [
    ...new Set(
      (memberRows ?? [])
        .map((row) => row.id_nguoi_dung)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (inCommunity.length === 0) return { friends: [], total: 0 };

  const previewIds = inCommunity.slice(0, previewLimit);
  const { data: users } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .in("id", previewIds);

  const byId = new Map(
    (users ?? []).map((user) => {
      const name = (user.ten_hien_thi as string) || (user.slug as string);
      return [
        user.id as string,
        {
          id: user.id as string,
          slug: user.slug as string,
          tenHienThi: name,
          avatarId: (user.avatar_id as string | null) ?? null,
          initial: name.charAt(0).toUpperCase(),
        } satisfies CongDongMemberPreview,
      ];
    }),
  );

  const friends = previewIds
    .map((id) => byId.get(id))
    .filter((m): m is CongDongMemberPreview => Boolean(m));

  return { friends, total: inCommunity.length };
}

export async function loadGiaiDoanDistribution(
  orgId: string,
): Promise<CongDongCareerSegment[]> {
  const memberIds = await loadMemberUserIds(orgId);
  if (memberIds.length === 0) return [];

  const admin = createServiceRoleClient();
  const counts = new Map<GiaiDoan, number>();
  const chunkSize = 200;

  for (let i = 0; i < memberIds.length; i += chunkSize) {
    const chunk = memberIds.slice(i, i + chunkSize);
    const { data: rows } = await admin
      .from("user_nguoi_dung")
      .select("giai_doan")
      .in("id", chunk)
      .returns<Array<{ giai_doan: GiaiDoan | null }>>();

    for (const row of rows ?? []) {
      const stage = row.giai_doan;
      if (!stage || !GIAI_DOAN_ORDER.includes(stage)) continue;
      counts.set(stage, (counts.get(stage) ?? 0) + 1);
    }
  }

  const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
  if (total === 0) return [];

  return GIAI_DOAN_ORDER.filter((stage) => (counts.get(stage) ?? 0) > 0).map(
    (stage) => {
      const count = counts.get(stage) ?? 0;
      return {
        stage,
        label: getGiaiDoanLabel(stage),
        count,
        percent: Math.round((count / total) * 100),
        color: GIAI_DOAN_COLOR[stage],
      };
    },
  );
}

export async function loadCommunityPulse(
  orgId: string,
  limit = 5,
): Promise<CongDongPulseItem[]> {
  const memberIds = await loadMemberUserIds(orgId);
  if (memberIds.length === 0) return [];

  const admin = createServiceRoleClient();
  const items: CongDongPulseItem[] = [];

  const { data: joinRows } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id_nguoi_dung, tu_ngay")
    .eq("id_to_chuc", orgId)
    .eq("vai_tro", "thanh_vien")
    .order("tu_ngay", { ascending: false, nullsFirst: false })
    .limit(8)
    .returns<Array<{ id_nguoi_dung: string; tu_ngay: string | null }>>();

  const joinUserIds = [
    ...new Set(
      (joinRows ?? [])
        .map((row) => row.id_nguoi_dung)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  if (joinUserIds.length > 0) {
    const { data: joinUsers } = await admin
      .from("user_nguoi_dung")
      .select("id, slug, ten_hien_thi")
      .in("id", joinUserIds);

    const userById = new Map(
      (joinUsers ?? []).map((user) => [
        user.id as string,
        {
          slug: user.slug as string,
          name:
            (user.ten_hien_thi as string) || (user.slug as string) || "Thành viên",
        },
      ]),
    );

    for (const row of joinRows ?? []) {
      const profile = userById.get(row.id_nguoi_dung);
      if (!profile) continue;
      items.push({
        kind: "join",
        userName: profile.name,
        userSlug: profile.slug,
        taoLuc: row.tu_ngay ?? new Date().toISOString(),
      });
    }
  }

  const { data: milestones } = await admin
    .from("content_cot_moc")
    .select("id, tieu_de, id_nguoi_dung, nguon_goc, id_to_chuc")
    .in("id_nguoi_dung", memberIds)
    .returns<
      Array<{
        id: string;
        tieu_de: string | null;
        id_nguoi_dung: string;
        nguon_goc: string | null;
        id_to_chuc: string | null;
      }>
    >();

  const careerMilestoneIds = (milestones ?? [])
    .filter(
      (m) =>
        !(
          m.nguon_goc === "sinh_tu_org_assign" &&
          m.id_to_chuc === orgId
        ),
    )
    .map((m) => m.id);

  if (careerMilestoneIds.length > 0) {
    const { data: verifyRows } = await admin
      .from("verify_xac_nhan")
      .select("id_cot_moc, xu_ly_luc")
      .in("id_cot_moc", careerMilestoneIds)
      .eq("trang_thai", "da_xac_nhan")
      .not("xu_ly_luc", "is", null)
      .order("xu_ly_luc", { ascending: false })
      .limit(8)
      .returns<Array<{ id_cot_moc: string; xu_ly_luc: string | null }>>();

    const milestoneById = new Map(
      (milestones ?? []).map((m) => [m.id, m]),
    );
    const ownerIds = [
      ...new Set(
        (verifyRows ?? [])
          .map((row) => milestoneById.get(row.id_cot_moc)?.id_nguoi_dung)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const ownerById = new Map<string, { slug: string; name: string }>();
    if (ownerIds.length > 0) {
      const { data: owners } = await admin
        .from("user_nguoi_dung")
        .select("id, slug, ten_hien_thi")
        .in("id", ownerIds);
      for (const owner of owners ?? []) {
        ownerById.set(owner.id as string, {
          slug: owner.slug as string,
          name:
            (owner.ten_hien_thi as string) ||
            (owner.slug as string) ||
            "Thành viên",
        });
      }
    }

    for (const row of verifyRows ?? []) {
      const milestone = milestoneById.get(row.id_cot_moc);
      if (!milestone) continue;
      const owner = ownerById.get(milestone.id_nguoi_dung);
      if (!owner) continue;
      items.push({
        kind: "milestone",
        userName: owner.name,
        userSlug: owner.slug,
        milestoneTitle:
          milestone.tieu_de?.trim() || "Cột mốc nghề đã xác minh",
        taoLuc: row.xu_ly_luc ?? new Date().toISOString(),
      });
    }
  }

  return items
    .sort(
      (a, b) =>
        new Date(b.taoLuc).getTime() - new Date(a.taoLuc).getTime(),
    )
    .slice(0, limit);
}

export async function loadSidebarLiveData(
  orgId: string,
  viewerId: string | null,
): Promise<{
  friendsInCommunity: { friends: CongDongMemberPreview[]; total: number };
  careerMap: CongDongCareerSegment[];
}> {
  const [friendsInCommunity, careerMap] = await Promise.all([
    viewerId
      ? loadFriendsInCommunity(viewerId, orgId)
      : Promise.resolve({ friends: [], total: 0 }),
    loadGiaiDoanDistribution(orgId),
  ]);
  return { friendsInCommunity, careerMap };
}
