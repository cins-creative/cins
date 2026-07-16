import "server-only";

import type { CoAuthorCredit } from "@/components/journey/milestone-types";
import { getAvatarUrl } from "@/lib/journey/profile";
import { insertSocialThongBao } from "@/lib/social/thong-bao-insert";
import type {
  CoAuthorDraft,
  CoAuthorPersisted,
  PendingCoAuthorInvite,
  TacGiaTrangThai,
} from "@/lib/social/types";
import { joinVaiTroPositions } from "@/lib/social/vai-tro";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type TacGiaRow = {
  id_bai_dang: string;
  id_nguoi_dung: string;
  vai_tro: string | null;
  trang_thai: TacGiaTrangThai;
  thu_tu: number | null;
};

async function notifyOrgBaiDangCoAuthorInvite(
  recipientId: string,
  actorId: string,
  baiDangId: string,
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
    id_doi_tuong: baiDangId,
  });
  if (!result.ok) console.error("[notifyOrgBaiDangCoAuthorInvite]", result.error);
}

export async function loadCoAuthorsForOrgBaiDang(
  baiDangId: string,
): Promise<CoAuthorPersisted[]> {
  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("org_bai_dang_tac_gia")
    .select("id_nguoi_dung, vai_tro, trang_thai, thu_tu")
    .eq("id_bai_dang", baiDangId)
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
      laChuSoHuu: false,
    };
  });
}

export async function loadOrgBaiDangCoAuthorCredits(
  baiDangIds: string[],
): Promise<Map<string, CoAuthorCredit[]>> {
  const out = new Map<string, CoAuthorCredit[]>();
  if (baiDangIds.length === 0) return out;

  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("org_bai_dang_tac_gia")
    .select("id_bai_dang, id_nguoi_dung, vai_tro, trang_thai, thu_tu")
    .in("id_bai_dang", baiDangIds)
    .in("trang_thai", ["accepted", "pending"])
    .order("thu_tu", { ascending: true });

  if (!rows?.length) return out;

  const userIds = [...new Set(rows.map((r) => r.id_nguoi_dung as string))];
  const { data: profiles } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .in("id", userIds);
  const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  for (const row of rows) {
    const p = profileById.get(row.id_nguoi_dung as string);
    const credit: CoAuthorCredit = {
      idNguoiDung: row.id_nguoi_dung as string,
      name: (p?.ten_hien_thi as string) || (p?.slug as string) || "?",
      role: (row.vai_tro as string) || null,
      slug: (p?.slug as string) ?? null,
      avatarUrl: getAvatarUrl((p?.avatar_id as string) || null) ?? null,
      initial: ((p?.ten_hien_thi as string) || (p?.slug as string) || "?")
        .slice(0, 1)
        .toUpperCase(),
      laChuSoHuu: false,
      trangThai: row.trang_thai as "pending" | "accepted",
    };
    const list = out.get(row.id_bai_dang as string) ?? [];
    list.push(credit);
    out.set(row.id_bai_dang as string, list);
  }
  return out;
}

export async function syncOrgBaiDangCoAuthorsFromEditor(
  baiDangId: string,
  actorUserId: string,
  collaborators: CoAuthorDraft[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const desiredIds = new Set(collaborators.map((c) => c.idNguoiDung));

  const { data: existingRows } = await admin
    .from("org_bai_dang_tac_gia")
    .select("id_nguoi_dung, trang_thai")
    .eq("id_bai_dang", baiDangId)
    .returns<TacGiaRow[]>();

  for (const row of existingRows ?? []) {
    if (!desiredIds.has(row.id_nguoi_dung)) {
      await admin
        .from("org_bai_dang_tac_gia")
        .delete()
        .eq("id_bai_dang", baiDangId)
        .eq("id_nguoi_dung", row.id_nguoi_dung);
    }
  }

  let thuTu = 1;
  for (const c of collaborators) {
    const existing = (existingRows ?? []).find(
      (r) => r.id_nguoi_dung === c.idNguoiDung,
    );

    if (existing) {
      await admin
        .from("org_bai_dang_tac_gia")
        .update({ thu_tu: thuTu, vai_tro: c.vaiTro.trim() || null })
        .eq("id_bai_dang", baiDangId)
        .eq("id_nguoi_dung", c.idNguoiDung);
    } else {
      const { error } = await admin.from("org_bai_dang_tac_gia").insert({
        id_bai_dang: baiDangId,
        id_nguoi_dung: c.idNguoiDung,
        vai_tro: c.vaiTro.trim() || null,
        trang_thai: "pending",
        thu_tu: thuTu,
      });
      if (error) return { ok: false, error: error.message };
      await notifyOrgBaiDangCoAuthorInvite(
        c.idNguoiDung,
        actorUserId,
        baiDangId,
        c.vaiTro.trim(),
      );
    }
    thuTu += 1;
  }

  return { ok: true };
}

export async function respondOrgBaiDangCoAuthor(
  baiDangId: string,
  userId: string,
  trangThai: "accepted" | "declined",
  viTri?: ReadonlyArray<string>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { data: row } = await admin
    .from("org_bai_dang_tac_gia")
    .select("trang_thai")
    .eq("id_bai_dang", baiDangId)
    .eq("id_nguoi_dung", userId)
    .maybeSingle();

  if (!row) {
    return { ok: false, error: "Không tìm thấy lời mời đồng tác giả." };
  }
  if (row.trang_thai !== "pending") {
    return { ok: false, error: "Lời mời đã được xử lý." };
  }

  const update: {
    trang_thai: "accepted" | "declined";
    xu_ly_luc: string;
    vai_tro?: string | null;
  } = { trang_thai: trangThai, xu_ly_luc: new Date().toISOString() };
  if (trangThai === "accepted" && viTri) {
    update.vai_tro = joinVaiTroPositions(viTri);
  }

  const { error } = await admin
    .from("org_bai_dang_tac_gia")
    .update(update)
    .eq("id_bai_dang", baiDangId)
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
    .eq("id_doi_tuong", baiDangId)
    .is("xu_ly_luc", null);

  return { ok: true };
}

/** Lời mời cộng sự org đang chờ — hiển thị banner Journey + dropdown thông báo. */
export async function loadPendingOrgBaiDangCoAuthorInvites(
  userId: string,
): Promise<PendingCoAuthorInvite[]> {
  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("org_bai_dang_tac_gia")
    .select("id_bai_dang, vai_tro")
    .eq("id_nguoi_dung", userId)
    .eq("trang_thai", "pending");

  if (!rows?.length) return [];

  const baiIds = rows.map((r) => r.id_bai_dang as string);
  return resolveOrgBaiDangCoAuthorInviteRows(rows, baiIds);
}

export async function resolveOrgBaiDangCoAuthorInvitesByBaiIds(
  userId: string,
  baiDangIds: string[],
): Promise<Map<string, PendingCoAuthorInvite>> {
  const out = new Map<string, PendingCoAuthorInvite>();
  if (baiDangIds.length === 0) return out;

  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("org_bai_dang_tac_gia")
    .select("id_bai_dang, vai_tro")
    .eq("id_nguoi_dung", userId)
    .eq("trang_thai", "pending")
    .in("id_bai_dang", baiDangIds);

  if (!rows?.length) return out;

  const invites = await resolveOrgBaiDangCoAuthorInviteRows(
    rows,
    baiDangIds,
  );
  for (const inv of invites) {
    out.set(inv.tacPhamId, inv);
  }
  return out;
}

async function resolveOrgBaiDangCoAuthorInviteRows(
  rows: ReadonlyArray<{ id_bai_dang: string; vai_tro: string | null }>,
  baiIds: string[],
): Promise<PendingCoAuthorInvite[]> {
  const admin = createServiceRoleClient();
  const { data: baiDangs } = await admin
    .from("org_bai_dang")
    .select("id, tieu_de, id_to_chuc")
    .in("id", baiIds);

  if (!baiDangs?.length) return [];

  const orgIds = [
    ...new Set(baiDangs.map((b) => b.id_to_chuc as string).filter(Boolean)),
  ];
  const { data: orgs } = orgIds.length
    ? await admin
        .from("org_to_chuc")
        .select("id, slug, ten, avatar_id")
        .in("id", orgIds)
    : { data: [] };

  const baiById = new Map(baiDangs.map((b) => [b.id as string, b]));
  const orgById = new Map((orgs ?? []).map((o) => [o.id as string, o]));

  return rows
    .map((row): PendingCoAuthorInvite | null => {
      const baiDangId = row.id_bai_dang as string;
      const bai = baiById.get(baiDangId);
      if (!bai) return null;
      const org = orgById.get(bai.id_to_chuc as string);
      if (!org?.slug) return null;
      return {
        tacPhamId: baiDangId,
        postSlug: baiDangId,
        postTitle: (bai.tieu_de as string) || "Bài đăng",
        ownerSlug: org.slug as string,
        ownerName: (org.ten as string) || "Tổ chức",
        ownerAvatarUrl:
          getAvatarUrl((org.avatar_id as string | null) ?? null) ?? null,
        vaiTro: (row.vai_tro as string) || "",
        orgBaiDang: true,
      };
    })
    .filter((x): x is PendingCoAuthorInvite => x !== null);
}
