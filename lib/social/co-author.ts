import "server-only";

import { getAvatarUrl } from "@/lib/journey/profile";
import { isFriend } from "@/lib/social/ket-ban";
import type {
  CoAuthorDraft,
  CoAuthorPersisted,
  CoAuthorReviewProfile,
  PendingCoAuthorReview,
  PendingCoAuthorInvite,
  PendingCoAuthorInviteNotification,
  ProcessedCoAuthorReview,
  TacGiaTrangThai,
} from "@/lib/social/types";

export type { PendingCoAuthorInvite };
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { insertSocialThongBao } from "@/lib/social/thong-bao-insert";

type TacGiaRow = {
  id_tac_pham: string;
  id_nguoi_dung: string;
  vai_tro: string | null;
  trang_thai: TacGiaTrangThai;
  la_chu_so_huu: boolean;
  thu_tu: number | null;
};

type CoAuthorReviewPayload = {
  proposerId?: string;
  targetUserId?: string;
  vaiTro?: string;
  action?: "accept" | "decline";
};

export async function loadCoAuthorsForTacPham(
  tacPhamId: string,
): Promise<CoAuthorPersisted[]> {
  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("content_tac_pham_tac_gia")
    .select("id_nguoi_dung, vai_tro, trang_thai, la_chu_so_huu, thu_tu")
    .eq("id_tac_pham", tacPhamId)
    .order("thu_tu", { ascending: true })
    .order("tao_luc", { ascending: true });

  if (!rows?.length) return [];

  const userIds = rows.map((r) => r.id_nguoi_dung as string);
  const { data: profiles } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .in("id", userIds);

  const profileById = new Map(
    (profiles ?? []).map((p) => [p.id as string, p]),
  );

  return rows.map((row) => {
    const profile = profileById.get(row.id_nguoi_dung as string);
    return {
      idNguoiDung: row.id_nguoi_dung as string,
      slug: (profile?.slug as string) ?? "",
      tenHienThi: (profile?.ten_hien_thi as string) ?? "",
      avatarId: (profile?.avatar_id as string | null) ?? null,
      vaiTro: (row.vai_tro as string) || "",
      trangThai: row.trang_thai as TacGiaTrangThai,
      laChuSoHuu: Boolean(row.la_chu_so_huu),
    };
  });
}

export async function assertMutualFollow(
  ownerId: string,
  targetUserId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (ownerId === targetUserId) {
    return { ok: false, error: "Không thể tag chính mình." };
  }
  const friends = await isFriend(ownerId, targetUserId);
  if (!friends) {
    return {
      ok: false,
      error: "Chỉ tag được người đã kết bạn.",
    };
  }
  return { ok: true };
}

async function notifyCoAuthorInvite(
  recipientId: string,
  actorId: string,
  tacPhamId: string,
  vaiTro: string,
): Promise<void> {
  const admin = createServiceRoleClient();
  const result = await insertSocialThongBao(admin, {
    nguoi_nhan: recipientId,
    loai: "hanh_dong",
    noi_dung: vaiTro
      ? `Lời mời làm cộng sự (${vaiTro})`
      : "Lời mời làm cộng sự",
    noi_dung_ai: vaiTro ? `${actorId} mời bạn làm ${vaiTro}` : actorId,
    loai_doi_tuong: "tac_gia_invite",
    id_doi_tuong: tacPhamId,
  });
  if (!result.ok) console.error("[notifyCoAuthorInvite]", result.error);
}

async function notifyOwnerCoAuthorReview(
  ownerId: string,
  proposerId: string,
  targetUserId: string,
  tacPhamId: string,
  vaiTro: string,
): Promise<void> {
  const admin = createServiceRoleClient();
  const { data: existingRows } = await admin
    .from("social_thong_bao")
    .select("id, noi_dung_ai, xu_ly_luc")
    .eq("nguoi_nhan", ownerId)
    .eq("loai_doi_tuong", "tac_gia_owner_review")
    .eq("id_doi_tuong", tacPhamId)
    .is("xu_ly_luc", null);
  const duplicate = (existingRows ?? []).some((row) => {
    const payload = parseReviewPayload(row.noi_dung_ai as string | null);
    return payload?.targetUserId === targetUserId;
  });
  if (duplicate) return;

  const result = await insertSocialThongBao(admin, {
    nguoi_nhan: ownerId,
    loai: "hanh_dong",
    noi_dung: "Đề xuất cộng sự cần duyệt",
    noi_dung_ai: JSON.stringify({ proposerId, targetUserId, vaiTro }),
    loai_doi_tuong: "tac_gia_owner_review",
    id_doi_tuong: tacPhamId,
  });
  if (!result.ok) console.error("[notifyOwnerCoAuthorReview]", result.error);
}

export async function addCoAuthor(
  tacPhamId: string,
  ownerId: string,
  targetUserId: string,
  vaiTro: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await assertMutualFollow(ownerId, targetUserId);
  if (!gate.ok) return gate;

  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("content_tac_pham_tac_gia")
    .select("id_nguoi_dung, trang_thai")
    .eq("id_tac_pham", tacPhamId)
    .eq("id_nguoi_dung", targetUserId)
    .maybeSingle();

  if (existing) {
    if (existing.trang_thai === "declined") {
      const { error } = await admin
        .from("content_tac_pham_tac_gia")
        .update({
          vai_tro: vaiTro.trim() || null,
          trang_thai: "pending",
          xu_ly_luc: null,
        })
        .eq("id_tac_pham", tacPhamId)
        .eq("id_nguoi_dung", targetUserId);
      if (error) return { ok: false, error: error.message };
      await notifyCoAuthorInvite(targetUserId, ownerId, tacPhamId, vaiTro);
      return { ok: true };
    }
    return { ok: false, error: "Người này đã có trong danh sách đồng tác giả." };
  }

  const { error } = await admin.from("content_tac_pham_tac_gia").insert({
    id_tac_pham: tacPhamId,
    id_nguoi_dung: targetUserId,
    vai_tro: vaiTro.trim() || null,
    trang_thai: "pending",
    la_chu_so_huu: false,
    thu_tu: 1,
  });
  if (error) return { ok: false, error: error.message };

  await notifyCoAuthorInvite(targetUserId, ownerId, tacPhamId, vaiTro);
  return { ok: true };
}

export async function proposeCoAuthorFromCollaborator(
  tacPhamId: string,
  proposerId: string,
  targetUserId: string,
  vaiTro: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (proposerId === targetUserId) {
    return { ok: false, error: "Không thể đề xuất chính mình." };
  }

  const admin = createServiceRoleClient();
  const { data: tacPham } = await admin
    .from("content_tac_pham")
    .select("id_nguoi_dung")
    .eq("id", tacPhamId)
    .maybeSingle<{ id_nguoi_dung: string }>();
  const ownerId = tacPham?.id_nguoi_dung;
  if (!ownerId) return { ok: false, error: "Không tìm thấy tác phẩm." };
  if (ownerId === proposerId) {
    return addCoAuthor(tacPhamId, ownerId, targetUserId, vaiTro);
  }

  const { data: proposerRow } = await admin
    .from("content_tac_pham_tac_gia")
    .select("id_nguoi_dung")
    .eq("id_tac_pham", tacPhamId)
    .eq("id_nguoi_dung", proposerId)
    .eq("trang_thai", "accepted")
    .eq("la_chu_so_huu", false)
    .maybeSingle();
  if (!proposerRow) {
    return { ok: false, error: "Chỉ cộng sự đã được duyệt mới đề xuất thêm người." };
  }

  const gate = await assertMutualFollow(proposerId, targetUserId);
  if (!gate.ok) return gate;

  const { data: existing } = await admin
    .from("content_tac_pham_tac_gia")
    .select("id_nguoi_dung, trang_thai")
    .eq("id_tac_pham", tacPhamId)
    .eq("id_nguoi_dung", targetUserId)
    .maybeSingle();
  if (existing && existing.trang_thai !== "declined") {
    return { ok: false, error: "Người này đã có trong danh sách đồng tác giả." };
  }

  await notifyOwnerCoAuthorReview(
    ownerId,
    proposerId,
    targetUserId,
    tacPhamId,
    vaiTro,
  );
  return { ok: true };
}

async function createPendingCoAuthorInvite(
  tacPhamId: string,
  ownerId: string,
  targetUserId: string,
  vaiTro: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { data: tacPham } = await admin
    .from("content_tac_pham")
    .select("id_nguoi_dung")
    .eq("id", tacPhamId)
    .maybeSingle<{ id_nguoi_dung: string }>();
  if (tacPham?.id_nguoi_dung !== ownerId) {
    return { ok: false, error: "Không có quyền duyệt cộng sự cho tác phẩm này." };
  }

  const { data: existing } = await admin
    .from("content_tac_pham_tac_gia")
    .select("id_nguoi_dung, trang_thai")
    .eq("id_tac_pham", tacPhamId)
    .eq("id_nguoi_dung", targetUserId)
    .maybeSingle();

  if (existing) {
    if (existing.trang_thai === "declined") {
      const { error } = await admin
        .from("content_tac_pham_tac_gia")
        .update({
          vai_tro: vaiTro.trim() || null,
          trang_thai: "pending",
          xu_ly_luc: null,
        })
        .eq("id_tac_pham", tacPhamId)
        .eq("id_nguoi_dung", targetUserId);
      if (error) return { ok: false, error: error.message };
      await notifyCoAuthorInvite(targetUserId, ownerId, tacPhamId, vaiTro);
      return { ok: true };
    }
    return { ok: true };
  }

  const { data: maxRow } = await admin
    .from("content_tac_pham_tac_gia")
    .select("thu_tu")
    .eq("id_tac_pham", tacPhamId)
    .order("thu_tu", { ascending: false })
    .limit(1)
    .maybeSingle<{ thu_tu: number | null }>();

  const { error } = await admin.from("content_tac_pham_tac_gia").insert({
    id_tac_pham: tacPhamId,
    id_nguoi_dung: targetUserId,
    vai_tro: vaiTro.trim() || null,
    trang_thai: "pending",
    la_chu_so_huu: false,
    thu_tu: (maxRow?.thu_tu ?? 0) + 1,
  });
  if (error) return { ok: false, error: error.message };
  await notifyCoAuthorInvite(targetUserId, ownerId, tacPhamId, vaiTro);
  return { ok: true };
}

export async function respondCoAuthor(
  tacPhamId: string,
  userId: string,
  trangThai: "accepted" | "declined",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { data: row } = await admin
    .from("content_tac_pham_tac_gia")
    .select("trang_thai, la_chu_so_huu")
    .eq("id_tac_pham", tacPhamId)
    .eq("id_nguoi_dung", userId)
    .maybeSingle();

  if (!row || row.la_chu_so_huu) {
    return { ok: false, error: "Không tìm thấy lời mời đồng tác giả." };
  }
  if (row.trang_thai !== "pending") {
    return { ok: false, error: "Lời mời đã được xử lý." };
  }

  const { error } = await admin
    .from("content_tac_pham_tac_gia")
    .update({ trang_thai: trangThai, xu_ly_luc: new Date().toISOString() })
    .eq("id_tac_pham", tacPhamId)
    .eq("id_nguoi_dung", userId);

  if (error) return { ok: false, error: error.message };

  await admin
    .from("social_thong_bao")
    .update({
      da_doc: true,
      xu_ly_luc: new Date().toISOString(),
    })
    .eq("nguoi_nhan", userId)
    .eq("loai_doi_tuong", "tac_gia_invite")
    .eq("id_doi_tuong", tacPhamId)
    .is("xu_ly_luc", null);

  return { ok: true };
}

export async function removeCoAuthor(
  tacPhamId: string,
  targetUserId: string,
  requesterId: string,
  ownerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (requesterId !== targetUserId && requesterId !== ownerId) {
    return { ok: false, error: "Không có quyền xoá tag." };
  }
  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("content_tac_pham_tac_gia")
    .delete()
    .eq("id_tac_pham", tacPhamId)
    .eq("id_nguoi_dung", targetUserId)
    .eq("la_chu_so_huu", false);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Đồng bộ owner row + danh sách draft khi publish/update bài. */
export async function syncCoAuthorsFromEditor(
  tacPhamId: string,
  ownerId: string,
  ownerVaiTro: string,
  collaborators: CoAuthorDraft[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();

  const { error: ownerErr } = await admin.from("content_tac_pham_tac_gia").upsert(
    {
      id_tac_pham: tacPhamId,
      id_nguoi_dung: ownerId,
      vai_tro: ownerVaiTro.trim() || null,
      trang_thai: "accepted",
      la_chu_so_huu: true,
      thu_tu: 0,
    },
    { onConflict: "id_tac_pham,id_nguoi_dung" },
  );
  if (ownerErr) return { ok: false, error: ownerErr.message };

  const desiredIds = new Set(collaborators.map((c) => c.idNguoiDung));

  const { data: existingRows } = await admin
    .from("content_tac_pham_tac_gia")
    .select("id_nguoi_dung, trang_thai, la_chu_so_huu")
    .eq("id_tac_pham", tacPhamId)
    .eq("la_chu_so_huu", false)
    .returns<TacGiaRow[]>();

  for (const row of existingRows ?? []) {
    if (!desiredIds.has(row.id_nguoi_dung)) {
      await admin
        .from("content_tac_pham_tac_gia")
        .delete()
        .eq("id_tac_pham", tacPhamId)
        .eq("id_nguoi_dung", row.id_nguoi_dung);
    }
  }

  let thuTu = 1;
  for (const c of collaborators) {
    const gate = await assertMutualFollow(ownerId, c.idNguoiDung);
    if (!gate.ok) return gate;

    const existing = (existingRows ?? []).find(
      (r) => r.id_nguoi_dung === c.idNguoiDung,
    );

    if (existing) {
      await admin
        .from("content_tac_pham_tac_gia")
        .update({ vai_tro: c.vaiTro.trim() || null, thu_tu: thuTu })
        .eq("id_tac_pham", tacPhamId)
        .eq("id_nguoi_dung", c.idNguoiDung);
    } else {
      const { error } = await admin.from("content_tac_pham_tac_gia").insert({
        id_tac_pham: tacPhamId,
        id_nguoi_dung: c.idNguoiDung,
        vai_tro: c.vaiTro.trim() || null,
        trang_thai: "pending",
        la_chu_so_huu: false,
        thu_tu: thuTu,
      });
      if (error) return { ok: false, error: error.message };
      await notifyCoAuthorInvite(c.idNguoiDung, ownerId, tacPhamId, c.vaiTro);
    }
    thuTu += 1;
  }

  return { ok: true };
}

export async function loadPendingCoAuthorInvites(
  userId: string,
): Promise<PendingCoAuthorInvite[]> {
  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("content_tac_pham_tac_gia")
    .select("id_tac_pham, vai_tro")
    .eq("id_nguoi_dung", userId)
    .eq("trang_thai", "pending")
    .eq("la_chu_so_huu", false);

  if (!rows?.length) return [];

  const tacPhamIds = rows.map((r) => r.id_tac_pham as string);
  const { data: tacPhams } = await admin
    .from("content_tac_pham")
    .select("id, slug, tieu_de, id_nguoi_dung")
    .in("id", tacPhamIds);

  const ownerIds = [
    ...new Set((tacPhams ?? []).map((t) => t.id_nguoi_dung as string)),
  ];
  const { data: owners } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi")
    .in("id", ownerIds);

  const tpById = new Map((tacPhams ?? []).map((t) => [t.id as string, t]));
  const ownerById = new Map((owners ?? []).map((o) => [o.id as string, o]));

  return rows
    .map((row) => {
      const tp = tpById.get(row.id_tac_pham as string);
      if (!tp?.slug) return null;
      const owner = ownerById.get(tp.id_nguoi_dung as string);
      return {
        tacPhamId: row.id_tac_pham as string,
        postSlug: tp.slug as string,
        postTitle: (tp.tieu_de as string) || "Bài viết",
        ownerSlug: (owner?.slug as string) ?? "",
        ownerName: (owner?.ten_hien_thi as string) || "Ai đó",
        vaiTro: (row.vai_tro as string) || "",
      };
    })
    .filter((x): x is PendingCoAuthorInvite => x !== null);
}

export async function listPendingCoAuthorInviteNotifications(
  userId: string,
  options: { limit?: number } = {},
): Promise<PendingCoAuthorInviteNotification[]> {
  const rowLimit = options.limit ?? 10;
  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("social_thong_bao")
    .select("id, id_doi_tuong, tao_luc")
    .eq("nguoi_nhan", userId)
    .eq("loai_doi_tuong", "tac_gia_invite")
    .eq("da_doc", false)
    .is("xu_ly_luc", null)
    .order("tao_luc", { ascending: false })
    .limit(rowLimit);

  if (!rows?.length) return [];

  const tacPhamIds = [
    ...new Set(
      rows
        .map((row) => row.id_doi_tuong as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (tacPhamIds.length === 0) return [];

  const { data: pendingRows } = await admin
    .from("content_tac_pham_tac_gia")
    .select("id_tac_pham, vai_tro")
    .eq("id_nguoi_dung", userId)
    .eq("trang_thai", "pending")
    .eq("la_chu_so_huu", false)
    .in("id_tac_pham", tacPhamIds);

  const pendingByTacPham = new Map(
    (pendingRows ?? []).map((row) => [
      row.id_tac_pham as string,
      (row.vai_tro as string) || "",
    ]),
  );

  const { data: tacPhams } = await admin
    .from("content_tac_pham")
    .select("id, slug, tieu_de, id_nguoi_dung")
    .in("id", tacPhamIds);

  const ownerIds = [
    ...new Set((tacPhams ?? []).map((tp) => tp.id_nguoi_dung as string)),
  ];
  const { data: owners } = ownerIds.length
    ? await admin
        .from("user_nguoi_dung")
        .select("id, slug, ten_hien_thi")
        .in("id", ownerIds)
    : { data: [] };

  const tpById = new Map((tacPhams ?? []).map((tp) => [tp.id as string, tp]));
  const ownerById = new Map((owners ?? []).map((o) => [o.id as string, o]));

  const invites: PendingCoAuthorInviteNotification[] = [];
  for (const row of rows) {
    const tacPhamId = row.id_doi_tuong as string | null;
    if (!tacPhamId || !pendingByTacPham.has(tacPhamId)) continue;
    const tp = tpById.get(tacPhamId);
    if (!tp?.slug) continue;
    const owner = ownerById.get(tp.id_nguoi_dung as string);
    const invite: PendingCoAuthorInviteNotification = {
      notificationId: row.id as string,
      tacPhamId,
      postSlug: tp.slug as string,
      postTitle: (tp.tieu_de as string) || "Bài viết",
      ownerSlug: (owner?.slug as string) ?? "",
      ownerName: (owner?.ten_hien_thi as string) || "Ai đó",
      vaiTro: pendingByTacPham.get(tacPhamId) ?? "",
    };
    const taoLuc = row.tao_luc as string | null;
    if (taoLuc) invite.taoLuc = taoLuc;
    invites.push(invite);
  }
  return invites;
}

export async function listPendingCoAuthorReviews(
  ownerId: string,
  options: { limit?: number } = {},
): Promise<PendingCoAuthorReview[]> {
  const rowLimit = options.limit ?? 10;
  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("social_thong_bao")
    .select("id, id_doi_tuong, noi_dung_ai, tao_luc")
    .eq("nguoi_nhan", ownerId)
    .eq("loai_doi_tuong", "tac_gia_owner_review")
    .is("xu_ly_luc", null)
    .order("tao_luc", { ascending: false })
    .limit(rowLimit);

  if (!rows?.length) return [];

  const parsed = rows
    .map((row) => {
      const payload = parseReviewPayload(row.noi_dung_ai as string | null);
      const tacPhamId = row.id_doi_tuong as string | null;
      if (!payload?.proposerId || !payload.targetUserId || !tacPhamId) {
        return null;
      }
      return {
        notificationId: row.id as string,
        tacPhamId,
        proposerId: payload.proposerId,
        targetUserId: payload.targetUserId,
        vaiTro: payload.vaiTro ?? "",
        taoLuc: (row.tao_luc as string | null) ?? undefined,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  if (parsed.length === 0) return [];

  const tacPhamIds = [...new Set(parsed.map((item) => item.tacPhamId))];
  const { data: tacPhams } = await admin
    .from("content_tac_pham")
    .select("id, slug, tieu_de, id_nguoi_dung")
    .in("id", tacPhamIds);
  const tacPhamById = new Map((tacPhams ?? []).map((tp) => [tp.id as string, tp]));

  const ownerIds = [
    ...new Set((tacPhams ?? []).map((tp) => tp.id_nguoi_dung as string)),
  ];
  const { data: owners } = ownerIds.length
    ? await admin.from("user_nguoi_dung").select("id, slug").in("id", ownerIds)
    : { data: [] };
  const ownerSlugById = new Map((owners ?? []).map((o) => [o.id as string, o.slug as string]));

  const userIds = [
    ...new Set(
      parsed.flatMap((item) => [item.proposerId, item.targetUserId]),
    ),
  ];
  const profiles = await loadReviewProfiles(admin, userIds);
  const profileById = new Map(profiles.map((p) => [p.idNguoiDung, p]));

  return parsed
    .map((item) => {
      const tp = tacPhamById.get(item.tacPhamId);
      const proposer = profileById.get(item.proposerId);
      const target = profileById.get(item.targetUserId);
      if (!tp || !proposer || !target) return null;
      return {
        notificationId: item.notificationId,
        tacPhamId: item.tacPhamId,
        postTitle: (tp.tieu_de as string) || "Bài viết",
        postSlug: (tp.slug as string) || "",
        ownerSlug: ownerSlugById.get(tp.id_nguoi_dung as string) ?? "",
        vaiTro: item.vaiTro,
        proposer,
        target,
        taoLuc: item.taoLuc,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

export async function respondCoAuthorReview(
  notificationId: string,
  ownerId: string,
  action: "accept" | "decline",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { data: row } = await admin
    .from("social_thong_bao")
    .select("id, nguoi_nhan, id_doi_tuong, noi_dung_ai")
    .eq("id", notificationId)
    .eq("nguoi_nhan", ownerId)
    .eq("loai_doi_tuong", "tac_gia_owner_review")
    .is("xu_ly_luc", null)
    .maybeSingle();
  if (!row) return { ok: false, error: "Không tìm thấy đề xuất cộng sự." };

  const payload = parseReviewPayload(row.noi_dung_ai as string | null);
  const tacPhamId = row.id_doi_tuong as string | null;
  if (!payload?.targetUserId || !tacPhamId) {
    return { ok: false, error: "Dữ liệu đề xuất không hợp lệ." };
  }

  if (action === "accept") {
    const result = await createPendingCoAuthorInvite(
      tacPhamId,
      ownerId,
      payload.targetUserId,
      payload.vaiTro ?? "",
    );
    if (!result.ok) return result;
  }

  const { error } = await admin
    .from("social_thong_bao")
    .update({
      da_doc: true,
      xu_ly_luc: new Date().toISOString(),
      noi_dung_ai: JSON.stringify({ ...payload, action }),
    })
    .eq("id", notificationId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, tacPhamId };
}

export async function listProcessedCoAuthorReviews(
  ownerId: string,
  options: { limit?: number } = {},
): Promise<ProcessedCoAuthorReview[]> {
  const rowLimit = options.limit ?? 10;
  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("social_thong_bao")
    .select("id, id_doi_tuong, noi_dung_ai, tao_luc, xu_ly_luc")
    .eq("nguoi_nhan", ownerId)
    .eq("loai_doi_tuong", "tac_gia_owner_review")
    .not("xu_ly_luc", "is", null)
    .order("xu_ly_luc", { ascending: false })
    .limit(rowLimit);

  if (!rows?.length) return [];

  const parsed = rows
    .map((row) => {
      const payload = parseReviewPayload(row.noi_dung_ai as string | null);
      const tacPhamId = row.id_doi_tuong as string | null;
      if (!payload?.proposerId || !payload.targetUserId || !tacPhamId) {
        return null;
      }
      const action = payload.action;
      if (action !== "accept" && action !== "decline") return null;
      return {
        notificationId: row.id as string,
        tacPhamId,
        proposerId: payload.proposerId,
        targetUserId: payload.targetUserId,
        vaiTro: payload.vaiTro ?? "",
        action,
        xuLyLuc: (row.xu_ly_luc as string | null) ?? "",
        taoLuc: (row.tao_luc as string | null) ?? undefined,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  if (parsed.length === 0) return [];

  const tacPhamIds = [...new Set(parsed.map((item) => item.tacPhamId))];
  const { data: tacPhams } = await admin
    .from("content_tac_pham")
    .select("id, slug, tieu_de, id_nguoi_dung")
    .in("id", tacPhamIds);
  const tacPhamById = new Map((tacPhams ?? []).map((tp) => [tp.id as string, tp]));

  const ownerIds = [
    ...new Set((tacPhams ?? []).map((tp) => tp.id_nguoi_dung as string)),
  ];
  const { data: owners } = ownerIds.length
    ? await admin.from("user_nguoi_dung").select("id, slug").in("id", ownerIds)
    : { data: [] };
  const ownerSlugById = new Map((owners ?? []).map((o) => [o.id as string, o.slug as string]));

  const userIds = [
    ...new Set(parsed.flatMap((item) => [item.proposerId, item.targetUserId])),
  ];
  const profiles = await loadReviewProfiles(admin, userIds);
  const profileById = new Map(profiles.map((p) => [p.idNguoiDung, p]));

  return parsed
    .map((item) => {
      const tp = tacPhamById.get(item.tacPhamId);
      const proposer = profileById.get(item.proposerId);
      const target = profileById.get(item.targetUserId);
      if (!tp || !proposer || !target) return null;
      return {
        notificationId: item.notificationId,
        tacPhamId: item.tacPhamId,
        postTitle: (tp.tieu_de as string) || "Bài viết",
        postSlug: (tp.slug as string) || "",
        ownerSlug: ownerSlugById.get(tp.id_nguoi_dung as string) ?? "",
        vaiTro: item.vaiTro,
        proposer,
        target,
        taoLuc: item.taoLuc,
        action: item.action,
        xuLyLuc: item.xuLyLuc,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

function parseReviewPayload(raw: string | null): CoAuthorReviewPayload | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as CoAuthorReviewPayload;
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

async function loadReviewProfiles(
  admin: ReturnType<typeof createServiceRoleClient>,
  userIds: string[],
): Promise<CoAuthorReviewProfile[]> {
  if (userIds.length === 0) return [];
  const { data } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .in("id", userIds);
  return (data ?? []).map((p) => ({
    idNguoiDung: p.id as string,
    slug: (p.slug as string) ?? "",
    tenHienThi: (p.ten_hien_thi as string) || (p.slug as string) || "Người dùng",
    avatarUrl: getAvatarUrl((p.avatar_id as string | null) ?? null) ?? null,
  }));
}
