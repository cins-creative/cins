import { formatMonThiDbError } from "@/lib/admin/mon-thi-validate";
import { getCoverUrl } from "@/lib/articles/cover";
import { resolveMonThiThumbDisplayUrl } from "@/lib/truong/mon-thi-thumbnail";
import {
  defaultPlaceholderThumbnailId,
  isMonThiCloudflareImageId,
} from "@/lib/truong/mon-thi-thumbnail";
import { createServiceRoleClient, hasServiceRoleEnv } from "@/lib/supabase/service-role";

/** Khớp `docs/CINS_SCHEMA.md` (`edu_mon_thi`) — không có `cap_nhat_luc` / `tao_luc`. */
const SELECT = "id, ma, ten, loai, trang_thai, thumbnail_id, id_bai_viet";

export type AdminMonThiRow = {
  id: string;
  ma: string | null;
  ten: string;
  loai: string | null;
  trang_thai: string | null;
  thumbnail_id: string | null;
  id_bai_viet: string | null;
  /** URL hiển thị (CF môn hoặc cover bài `id_bai_viet`). */
  thumbnail_src: string | null;
  thumbnail_from_cover: boolean;
};

function parseRow(raw: Record<string, unknown>): AdminMonThiRow | null {
  const id = String(raw.id ?? "").trim();
  const ten = String(raw.ten ?? "").trim();
  if (!id || !ten) return null;
  const loai = raw.loai == null ? null : String(raw.loai).trim() || null;
  return {
    id,
    ma: raw.ma == null ? null : String(raw.ma).trim() || null,
    ten,
    loai,
    trang_thai:
      raw.trang_thai == null ? null : String(raw.trang_thai).trim() || null,
    thumbnail_id:
      raw.thumbnail_id == null ? null : String(raw.thumbnail_id).trim() || null,
    id_bai_viet:
      raw.id_bai_viet == null ? null : String(raw.id_bai_viet).trim() || null,
    thumbnail_src: null,
    thumbnail_from_cover: false,
  };
}

async function attachMonThiThumbnailSrcToRows(
  supabase: ReturnType<typeof createServiceRoleClient>,
  rows: Omit<AdminMonThiRow, "thumbnail_src" | "thumbnail_from_cover">[],
): Promise<AdminMonThiRow[]> {
  const articleIds = [
    ...new Set(rows.map((r) => r.id_bai_viet).filter((x): x is string => !!x)),
  ];
  const articleCoverById = new Map<string, string | null>();
  if (articleIds.length) {
    const { data: articles } = await supabase
      .from("article_bai_viet")
      .select("id, cover_id")
      .in("id", articleIds);
    for (const row of articles ?? []) {
      const a = row as { id?: string; cover_id?: string | null };
      const aid = a.id?.trim();
      if (!aid) continue;
      articleCoverById.set(aid, getCoverUrl(a.cover_id) ?? null);
    }
  }

  return Promise.all(
    rows.map(async (row) => {
      const thumbnail_src = await resolveMonThiThumbDisplayUrl({
        thumbnail_id: row.thumbnail_id,
        id_bai_viet: row.id_bai_viet,
        articleCoverById,
      });
      const thumbnail_from_cover =
        Boolean(thumbnail_src) &&
        !isMonThiCloudflareImageId(row.thumbnail_id) &&
        Boolean(row.id_bai_viet?.trim());
      return { ...row, thumbnail_src, thumbnail_from_cover };
    }),
  );
}

export async function listMonThiForAdmin(): Promise<
  { ok: true; rows: AdminMonThiRow[] } | { ok: false; message: string }
> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("edu_mon_thi")
      .select(SELECT)
      .order("loai", { ascending: true })
      .order("ten", { ascending: true });

    if (error) return { ok: false, message: error.message };

    const parsed = (data ?? [])
      .map((r) => parseRow(r as Record<string, unknown>))
      .filter((x): x is AdminMonThiRow => x != null);

    const rows = await attachMonThiThumbnailSrcToRows(supabase, parsed);

    return { ok: true, rows };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

export type AdminMonThiPatch = {
  ten?: string;
  ma?: string | null;
  loai?: string | null;
  trang_thai?: string | null;
  thumbnail_id?: string | null;
  id_bai_viet?: string | null;
};

export type AdminMonThiCreate = {
  ten: string;
  ma?: string | null;
  loai: string;
  trang_thai?: string | null;
  thumbnail_id?: string | null;
  id_bai_viet?: string | null;
};

export async function createMonThiForAdmin(
  input: AdminMonThiCreate,
): Promise<
  { ok: true; row: AdminMonThiRow } | { ok: false; message: string }
> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  const ten = input.ten.trim();
  if (!ten) return { ok: false, message: "Tên môn thi không được trống." };

  const loai = input.loai.trim().toLowerCase();
  const thumbnail_id =
    input.thumbnail_id?.trim() || defaultPlaceholderThumbnailId(loai);

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("edu_mon_thi")
      .insert({
        ten,
        ma: input.ma?.trim() || null,
        loai,
        trang_thai: input.trang_thai?.trim() || "active",
        thumbnail_id,
        id_bai_viet: input.id_bai_viet?.trim() || null,
      })
      .select(SELECT)
      .single();

    if (error) return { ok: false, message: formatMonThiDbError(error.message) };
    const parsed = parseRow((data ?? {}) as Record<string, unknown>);
    if (!parsed) return { ok: false, message: "Không đọc được bản ghi vừa tạo." };
    const [row] = await attachMonThiThumbnailSrcToRows(supabase, [parsed]);
    return { ok: true, row: row! };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

export async function countOrgCauHinhMonForMonThi(
  id: string,
): Promise<{ ok: true; count: number } | { ok: false; message: string }> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  const monId = id.trim();
  if (!monId) return { ok: false, message: "Thiếu id môn thi." };
  try {
    const supabase = createServiceRoleClient();
    const { count, error } = await supabase
      .from("org_cau_hinh_mon")
      .select("id", { count: "exact", head: true })
      .eq("id_mon_thi", monId);
    if (error) return { ok: false, message: error.message };
    return { ok: true, count: count ?? 0 };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

export async function deleteMonThiForAdmin(
  id: string,
): Promise<
  | { ok: true; unlinkedCauHinhMon: number }
  | { ok: false; message: string }
> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  const monId = id.trim();
  if (!monId) return { ok: false, message: "Thiếu id môn thi." };

  try {
    const supabase = createServiceRoleClient();

    const usage = await countOrgCauHinhMonForMonThi(monId);
    if (!usage.ok) return usage;
    const refCount = usage.count;

    if (refCount > 0) {
      const { error: unlinkErr } = await supabase
        .from("org_cau_hinh_mon")
        .delete()
        .eq("id_mon_thi", monId);
      if (unlinkErr) {
        return {
          ok: false,
          message: `Không gỡ được liên kết cấu hình trường (${refCount} dòng): ${unlinkErr.message}`,
        };
      }
    }

    const { data, error } = await supabase
      .from("edu_mon_thi")
      .delete()
      .eq("id", monId)
      .select("id");

    if (error) {
      const msg = error.message;
      if (/foreign key|violates|23503/i.test(msg)) {
        return {
          ok: false,
          message:
            "Không xóa được: môn vẫn được tham chiếu ở bảng khác (ngoài org_cau_hinh_mon). Chi tiết: " +
            msg,
        };
      }
      return { ok: false, message: msg };
    }

    if (!data?.length) {
      return {
        ok: false,
        message: "Không tìm thấy môn thi (id không tồn tại hoặc đã bị xóa).",
      };
    }

    return { ok: true, unlinkedCauHinhMon: refCount };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

export async function updateMonThiForAdmin(
  id: string,
  patch: AdminMonThiPatch,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  try {
    const supabase = createServiceRoleClient();
    const payload = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined),
    );
    const { data, error } = await supabase
      .from("edu_mon_thi")
      .update(payload)
      .eq("id", id)
      .select("id");
    if (error) return { ok: false, message: formatMonThiDbError(error.message) };
    if (!data?.length) {
      return { ok: false, message: "Không tìm thấy môn thi để cập nhật (id không khớp)." };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}
