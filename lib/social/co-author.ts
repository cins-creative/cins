import "server-only";

import { isMutualFollow } from "@/lib/social/follow";
import type {
  CoAuthorDraft,
  CoAuthorPersisted,
  PendingCoAuthorInvite,
  TacGiaTrangThai,
} from "@/lib/social/types";

export type { PendingCoAuthorInvite };
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type TacGiaRow = {
  id_tac_pham: string;
  id_nguoi_dung: string;
  vai_tro: string | null;
  trang_thai: TacGiaTrangThai;
  la_chu_so_huu: boolean;
  thu_tu: number | null;
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
  const mutual = await isMutualFollow(ownerId, targetUserId);
  if (!mutual) {
    return {
      ok: false,
      error: "Chỉ tag được người bạn theo dõi lẫn nhau.",
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
  await admin.from("social_thong_bao").insert({
    nguoi_nhan: recipientId,
    noi_dung_ai: vaiTro ? `${actorId} mời bạn làm ${vaiTro}` : actorId,
    loai_doi_tuong: "tac_gia_invite",
    id_doi_tuong: tacPhamId,
  });
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
