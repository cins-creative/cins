import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";

export type GopYTrangThai = "moi" | "dang_xu_ly" | "da_xu_ly" | "bo_qua";

export const GOP_Y_TRANG_THAI_LABEL: Record<GopYTrangThai, string> = {
  moi: "Mới",
  dang_xu_ly: "Đang xử lý",
  da_xu_ly: "Đã xử lý",
  bo_qua: "Bỏ qua",
};

export const GOP_Y_TRANG_THAI_ORDER: GopYTrangThai[] = [
  "moi",
  "dang_xu_ly",
  "da_xu_ly",
  "bo_qua",
];

const MAX_NOI_DUNG = 5000;
const MAX_FIELD = 500;

export type CreateGopYInput = {
  idNguoiDung?: string | null;
  hoTen?: string | null;
  email?: string | null;
  noiDung: string;
  trangUrl?: string | null;
  userAgent?: string | null;
};

export type CreateGopYResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

function trimTo(value: string | null | undefined, max: number): string | null {
  const v = (value ?? "").toString().trim();
  if (!v) return null;
  return v.slice(0, max);
}

/** Tạo một góp ý (public). Insert qua service role, không phụ thuộc RLS. */
export async function createGopY(
  input: CreateGopYInput,
): Promise<CreateGopYResult> {
  const noiDung = trimTo(input.noiDung, MAX_NOI_DUNG);
  if (!noiDung || noiDung.length < 2) {
    return { ok: false, error: "Nội dung góp ý quá ngắn." };
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("gop_y")
    .insert({
      id_nguoi_dung: input.idNguoiDung ?? null,
      ho_ten: trimTo(input.hoTen, MAX_FIELD),
      email: trimTo(input.email, MAX_FIELD),
      noi_dung: noiDung,
      trang_url: trimTo(input.trangUrl, MAX_FIELD),
      user_agent: trimTo(input.userAgent, MAX_FIELD),
    })
    .select("id")
    .single<{ id: string }>();

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id };
}

export type UserBrief = {
  id: string;
  slug: string;
  tenHienThi: string;
  avatarSrc: string | null;
};

export type GopYItem = {
  id: string;
  hoTen: string | null;
  email: string | null;
  noiDung: string;
  trangUrl: string | null;
  userAgent: string | null;
  trangThai: GopYTrangThai;
  ghiChu: string | null;
  taoLuc: string;
  xuLyLuc: string | null;
  nguoiGui: UserBrief | null;
};

type GopYRow = {
  id: string;
  id_nguoi_dung: string | null;
  ho_ten: string | null;
  email: string | null;
  noi_dung: string;
  trang_url: string | null;
  user_agent: string | null;
  trang_thai: GopYTrangThai;
  ghi_chu: string | null;
  tao_luc: string;
  xu_ly_luc: string | null;
};

/** Danh sách góp ý cho admin, mới nhất trước. */
export async function listGopYForAdmin(): Promise<GopYItem[]> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("gop_y")
    .select(
      "id, id_nguoi_dung, ho_ten, email, noi_dung, trang_url, user_agent, trang_thai, ghi_chu, tao_luc, xu_ly_luc",
    )
    .order("tao_luc", { ascending: false })
    .returns<GopYRow[]>();

  const rows = data ?? [];
  const userIds = [...new Set(rows.map((r) => r.id_nguoi_dung ?? "").filter(Boolean))];
  const userMap = new Map<string, UserBrief>();
  if (userIds.length > 0) {
    const { data: users } = await admin
      .from("user_nguoi_dung")
      .select("id, slug, ten_hien_thi, avatar_id")
      .in("id", userIds)
      .returns<
        Array<{ id: string; slug: string; ten_hien_thi: string; avatar_id: string | null }>
      >();
    for (const u of users ?? []) {
      userMap.set(u.id, {
        id: u.id,
        slug: u.slug,
        tenHienThi: u.ten_hien_thi,
        avatarSrc: resolveTruongImageSrcSync(u.avatar_id, ["public", "avatar", "medium"]),
      });
    }
  }

  return rows.map((r) => ({
    id: r.id,
    hoTen: r.ho_ten,
    email: r.email,
    noiDung: r.noi_dung,
    trangUrl: r.trang_url,
    userAgent: r.user_agent,
    trangThai: r.trang_thai,
    ghiChu: r.ghi_chu,
    taoLuc: r.tao_luc,
    xuLyLuc: r.xu_ly_luc,
    nguoiGui: r.id_nguoi_dung ? userMap.get(r.id_nguoi_dung) ?? null : null,
  }));
}

/** Cập nhật trạng thái + ghi chú xử lý một góp ý. */
export async function updateGopYStatus(params: {
  id: string;
  adminId: string;
  trangThai: GopYTrangThai;
  ghiChu?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const isDone = params.trangThai === "da_xu_ly" || params.trangThai === "bo_qua";
  const { error } = await admin
    .from("gop_y")
    .update({
      trang_thai: params.trangThai,
      ghi_chu: params.ghiChu?.trim() || null,
      nguoi_xu_ly: params.adminId,
      xu_ly_luc: isDone ? new Date().toISOString() : null,
    })
    .eq("id", params.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
