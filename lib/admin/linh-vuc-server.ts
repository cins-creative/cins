import { getCoverUrl } from "@/lib/articles/cover";
import { createServiceRoleClient, hasServiceRoleEnv } from "@/lib/supabase/service-role";

const LV_SELECT =
  "id, slug, ten, ten_eng, mo_ta, thumbnail_id, thu_tu, trang_thai, nhom";

const NHOM_SELECT = "id, slug, ten, ten_eng, mo_ta, thu_tu, trang_thai";

export type AdminLinhVucNhomRow = {
  id: string;
  slug: string;
  ten: string;
  ten_eng: string | null;
  mo_ta: string | null;
  thu_tu: number;
  trang_thai: string;
  /** Số lĩnh vực đang gắn */
  so_linh_vuc: number;
};

export type AdminLinhVucGanNhom = {
  id_nhom: string;
  nhom_slug: string;
  nhom_ten: string;
  la_chinh: boolean;
  thu_tu: number;
};

export type AdminLinhVucRow = {
  id: string;
  slug: string;
  ten: string;
  ten_eng: string | null;
  mo_ta: string | null;
  thumbnail_id: string | null;
  thumbnail_src: string | null;
  thu_tu: number;
  trang_thai: string;
  /** Cột legacy — chỉ hiển thị tham khảo */
  nhom_legacy: string | null;
  nhom_chinh: AdminLinhVucGanNhom | null;
  nhoms: AdminLinhVucGanNhom[];
};

function slugifyVi(value: string): string {
  const cleaned = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return cleaned || "linh-vuc";
}

function parseNhomRow(raw: Record<string, unknown>): Omit<AdminLinhVucNhomRow, "so_linh_vuc"> | null {
  const id = String(raw.id ?? "").trim();
  const slug = String(raw.slug ?? "").trim();
  const ten = String(raw.ten ?? "").trim();
  if (!id || !slug || !ten) return null;
  return {
    id,
    slug,
    ten,
    ten_eng: raw.ten_eng == null ? null : String(raw.ten_eng).trim() || null,
    mo_ta: raw.mo_ta == null ? null : String(raw.mo_ta).trim() || null,
    thu_tu: Number(raw.thu_tu ?? 0) || 0,
    trang_thai: String(raw.trang_thai ?? "active").trim() || "active",
  };
}

function parseLvRow(raw: Record<string, unknown>): Omit<
  AdminLinhVucRow,
  "thumbnail_src" | "nhom_chinh" | "nhoms"
> | null {
  const id = String(raw.id ?? "").trim();
  const slug = String(raw.slug ?? "").trim();
  const ten = String(raw.ten ?? "").trim();
  if (!id || !slug || !ten) return null;
  return {
    id,
    slug,
    ten,
    ten_eng: raw.ten_eng == null ? null : String(raw.ten_eng).trim() || null,
    mo_ta: raw.mo_ta == null ? null : String(raw.mo_ta).trim() || null,
    thumbnail_id:
      raw.thumbnail_id == null ? null : String(raw.thumbnail_id).trim() || null,
    thu_tu: Number(raw.thu_tu ?? 0) || 0,
    trang_thai: String(raw.trang_thai ?? "active").trim() || "active",
    nhom_legacy: raw.nhom == null ? null : String(raw.nhom).trim() || null,
  };
}

export async function listLinhVucNhomForAdmin(): Promise<
  { ok: true; rows: AdminLinhVucNhomRow[] } | { ok: false; message: string }
> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  try {
    const supabase = createServiceRoleClient();
    const [{ data, error }, ganRes] = await Promise.all([
      supabase
        .from("linh_vuc_nhom")
        .select(NHOM_SELECT)
        .order("thu_tu", { ascending: true })
        .order("ten", { ascending: true }),
      supabase.from("linh_vuc_gan_nhom").select("id_nhom"),
    ]);
    if (error) return { ok: false, message: error.message };
    if (ganRes.error) return { ok: false, message: ganRes.error.message };

    const counts = new Map<string, number>();
    for (const g of ganRes.data ?? []) {
      const id = String((g as { id_nhom?: string }).id_nhom ?? "").trim();
      if (!id) continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }

    const rows = (data ?? [])
      .map((r) => parseNhomRow(r as Record<string, unknown>))
      .filter((x): x is Omit<AdminLinhVucNhomRow, "so_linh_vuc"> => x != null)
      .map((r) => ({ ...r, so_linh_vuc: counts.get(r.id) ?? 0 }));

    return { ok: true, rows };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

export async function listLinhVucForAdmin(): Promise<
  { ok: true; rows: AdminLinhVucRow[] } | { ok: false; message: string }
> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  try {
    const supabase = createServiceRoleClient();
    const [lvRes, nhomRes, ganRes] = await Promise.all([
      supabase
        .from("linh_vuc")
        .select(LV_SELECT)
        .order("thu_tu", { ascending: true })
        .order("ten", { ascending: true }),
      supabase.from("linh_vuc_nhom").select("id, slug, ten"),
      supabase
        .from("linh_vuc_gan_nhom")
        .select("id_linh_vuc, id_nhom, la_chinh, thu_tu"),
    ]);
    if (lvRes.error) return { ok: false, message: lvRes.error.message };
    if (nhomRes.error) return { ok: false, message: nhomRes.error.message };
    if (ganRes.error) return { ok: false, message: ganRes.error.message };

    const nhomById = new Map<string, { slug: string; ten: string }>();
    for (const n of nhomRes.data ?? []) {
      const row = n as { id?: string; slug?: string; ten?: string };
      const id = String(row.id ?? "").trim();
      if (!id) continue;
      nhomById.set(id, {
        slug: String(row.slug ?? "").trim(),
        ten: String(row.ten ?? "").trim(),
      });
    }

    const ganByLv = new Map<string, AdminLinhVucGanNhom[]>();
    for (const g of ganRes.data ?? []) {
      const row = g as {
        id_linh_vuc?: string;
        id_nhom?: string;
        la_chinh?: boolean;
        thu_tu?: number;
      };
      const idLv = String(row.id_linh_vuc ?? "").trim();
      const idNhom = String(row.id_nhom ?? "").trim();
      const meta = nhomById.get(idNhom);
      if (!idLv || !idNhom || !meta) continue;
      const arr = ganByLv.get(idLv) ?? [];
      arr.push({
        id_nhom: idNhom,
        nhom_slug: meta.slug,
        nhom_ten: meta.ten,
        la_chinh: Boolean(row.la_chinh),
        thu_tu: Number(row.thu_tu ?? 0) || 0,
      });
      ganByLv.set(idLv, arr);
    }

    const rows: AdminLinhVucRow[] = [];
    for (const raw of lvRes.data ?? []) {
      const parsed = parseLvRow(raw as Record<string, unknown>);
      if (!parsed) continue;
      const nhoms = (ganByLv.get(parsed.id) ?? []).sort((a, b) => {
        if (a.la_chinh !== b.la_chinh) return a.la_chinh ? -1 : 1;
        return a.thu_tu - b.thu_tu || a.nhom_ten.localeCompare(b.nhom_ten, "vi");
      });
      rows.push({
        ...parsed,
        thumbnail_src: getCoverUrl(parsed.thumbnail_id),
        nhom_chinh: nhoms.find((n) => n.la_chinh) ?? nhoms[0] ?? null,
        nhoms,
      });
    }

    return { ok: true, rows };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

export type AdminLinhVucPatch = {
  slug?: string;
  ten?: string;
  ten_eng?: string | null;
  mo_ta?: string | null;
  thumbnail_id?: string | null;
  thu_tu?: number;
  trang_thai?: string;
  /** Legacy sync — optional */
  nhom?: string | null;
};

export type AdminLinhVucCreate = {
  slug?: string;
  ten: string;
  ten_eng?: string | null;
  mo_ta?: string | null;
  thumbnail_id?: string | null;
  thu_tu?: number;
  trang_thai?: string;
};

export type AdminLinhVucNhomGanInput = {
  id_nhom: string;
  la_chinh: boolean;
  thu_tu?: number;
};

async function syncLinhVucGanNhom(
  supabase: ReturnType<typeof createServiceRoleClient>,
  idLinhVuc: string,
  gans: AdminLinhVucNhomGanInput[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  const unique = new Map<string, AdminLinhVucNhomGanInput>();
  for (const g of gans) {
    const id = g.id_nhom.trim();
    if (!id) continue;
    unique.set(id, { id_nhom: id, la_chinh: g.la_chinh, thu_tu: g.thu_tu ?? 0 });
  }
  const list = [...unique.values()];
  if (list.length === 0) {
    const { error } = await supabase
      .from("linh_vuc_gan_nhom")
      .delete()
      .eq("id_linh_vuc", idLinhVuc);
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  }

  const chinhCount = list.filter((g) => g.la_chinh).length;
  if (chinhCount === 0) {
    list[0]!.la_chinh = true;
  } else if (chinhCount > 1) {
    let seen = false;
    for (const g of list) {
      if (g.la_chinh) {
        if (seen) g.la_chinh = false;
        else seen = true;
      }
    }
  }

  const { error: delErr } = await supabase
    .from("linh_vuc_gan_nhom")
    .delete()
    .eq("id_linh_vuc", idLinhVuc);
  if (delErr) return { ok: false, message: delErr.message };

  const { error: insErr } = await supabase.from("linh_vuc_gan_nhom").insert(
    list.map((g) => ({
      id_linh_vuc: idLinhVuc,
      id_nhom: g.id_nhom,
      la_chinh: g.la_chinh,
      thu_tu: g.thu_tu ?? 0,
    })),
  );
  if (insErr) return { ok: false, message: insErr.message };
  return { ok: true };
}

async function resolveNhomLegacyTen(
  supabase: ReturnType<typeof createServiceRoleClient>,
  gans: AdminLinhVucNhomGanInput[],
): Promise<string | null> {
  const chinh = gans.find((g) => g.la_chinh) ?? gans[0];
  if (!chinh) return null;
  const { data } = await supabase
    .from("linh_vuc_nhom")
    .select("ten")
    .eq("id", chinh.id_nhom)
    .maybeSingle();
  return data?.ten ? String(data.ten).trim() : null;
}

export async function createLinhVucForAdmin(
  input: AdminLinhVucCreate,
  gans: AdminLinhVucNhomGanInput[] = [],
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  const ten = input.ten.trim();
  if (!ten) return { ok: false, message: "Tên lĩnh vực không được trống." };
  const slug = (input.slug?.trim() || slugifyVi(ten)).toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { ok: false, message: "Slug chỉ dùng chữ thường, số và gạch ngang." };
  }

  try {
    const supabase = createServiceRoleClient();
    const nhomLegacy = await resolveNhomLegacyTen(supabase, gans);
    const { data, error } = await supabase
      .from("linh_vuc")
      .insert({
        ten,
        slug,
        ten_eng: input.ten_eng?.trim() || null,
        mo_ta: input.mo_ta?.trim() || null,
        thumbnail_id: input.thumbnail_id?.trim() || null,
        thu_tu: input.thu_tu ?? 0,
        trang_thai: input.trang_thai?.trim() || "active",
        nhom: nhomLegacy,
      })
      .select("id")
      .single();

    if (error) {
      if (/duplicate|unique/i.test(error.message)) {
        return { ok: false, message: "Slug đã tồn tại." };
      }
      return { ok: false, message: error.message };
    }
    const id = String(data?.id ?? "").trim();
    if (!id) return { ok: false, message: "Không đọc được id vừa tạo." };

    if (gans.length) {
      const sync = await syncLinhVucGanNhom(supabase, id, gans);
      if (!sync.ok) return sync;
    }
    return { ok: true, id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

export async function updateLinhVucForAdmin(
  id: string,
  patch: AdminLinhVucPatch,
  gans?: AdminLinhVucNhomGanInput[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  const lvId = id.trim();
  if (!lvId) return { ok: false, message: "Thiếu id lĩnh vực." };

  try {
    const supabase = createServiceRoleClient();
    const payload: Record<string, unknown> = {};
    if (patch.ten !== undefined) {
      const ten = patch.ten.trim();
      if (!ten) return { ok: false, message: "Tên lĩnh vực không được trống." };
      payload.ten = ten;
    }
    if (patch.slug !== undefined) {
      const slug = patch.slug.trim().toLowerCase();
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        return { ok: false, message: "Slug chỉ dùng chữ thường, số và gạch ngang." };
      }
      payload.slug = slug;
    }
    if (patch.ten_eng !== undefined) payload.ten_eng = patch.ten_eng?.trim() || null;
    if (patch.mo_ta !== undefined) payload.mo_ta = patch.mo_ta?.trim() || null;
    if (patch.thumbnail_id !== undefined) {
      payload.thumbnail_id = patch.thumbnail_id?.trim() || null;
    }
    if (patch.thu_tu !== undefined) payload.thu_tu = patch.thu_tu;
    if (patch.trang_thai !== undefined) {
      payload.trang_thai = patch.trang_thai.trim() || "active";
    }

    if (gans) {
      const sync = await syncLinhVucGanNhom(supabase, lvId, gans);
      if (!sync.ok) return sync;
      payload.nhom = await resolveNhomLegacyTen(supabase, gans);
    } else if (patch.nhom !== undefined) {
      payload.nhom = patch.nhom?.trim() || null;
    }

    if (Object.keys(payload).length) {
      const { data, error } = await supabase
        .from("linh_vuc")
        .update(payload)
        .eq("id", lvId)
        .select("id");
      if (error) {
        if (/duplicate|unique/i.test(error.message)) {
          return { ok: false, message: "Slug đã tồn tại." };
        }
        return { ok: false, message: error.message };
      }
      if (!data?.length) {
        return { ok: false, message: "Không tìm thấy lĩnh vực để cập nhật." };
      }
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

export async function deleteLinhVucForAdmin(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  const lvId = id.trim();
  if (!lvId) return { ok: false, message: "Thiếu id lĩnh vực." };
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("linh_vuc")
      .delete()
      .eq("id", lvId)
      .select("id");
    if (error) {
      if (/foreign key|violates|23503/i.test(error.message)) {
        return {
          ok: false,
          message:
            "Không xóa được: lĩnh vực còn được tham chiếu (bài viết, tuyển dụng, …).",
        };
      }
      return { ok: false, message: error.message };
    }
    if (!data?.length) {
      return { ok: false, message: "Không tìm thấy lĩnh vực (đã xóa hoặc sai id)." };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

export type AdminLinhVucNhomCreate = {
  slug?: string;
  ten: string;
  ten_eng?: string | null;
  mo_ta?: string | null;
  thu_tu?: number;
  trang_thai?: string;
};

export type AdminLinhVucNhomPatch = {
  slug?: string;
  ten?: string;
  ten_eng?: string | null;
  mo_ta?: string | null;
  thu_tu?: number;
  trang_thai?: string;
};

export async function createLinhVucNhomForAdmin(
  input: AdminLinhVucNhomCreate,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  const ten = input.ten.trim();
  if (!ten) return { ok: false, message: "Tên nhóm không được trống." };
  const slug = (input.slug?.trim() || slugifyVi(ten)).toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { ok: false, message: "Slug chỉ dùng chữ thường, số và gạch ngang." };
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("linh_vuc_nhom")
      .insert({
        ten,
        slug,
        ten_eng: input.ten_eng?.trim() || null,
        mo_ta: input.mo_ta?.trim() || null,
        thu_tu: input.thu_tu ?? 0,
        trang_thai: input.trang_thai?.trim() || "active",
      })
      .select("id")
      .single();
    if (error) {
      if (/duplicate|unique/i.test(error.message)) {
        return { ok: false, message: "Slug nhóm đã tồn tại." };
      }
      return { ok: false, message: error.message };
    }
    const id = String(data?.id ?? "").trim();
    if (!id) return { ok: false, message: "Không đọc được id nhóm vừa tạo." };
    return { ok: true, id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

export async function updateLinhVucNhomForAdmin(
  id: string,
  patch: AdminLinhVucNhomPatch,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  const nhomId = id.trim();
  if (!nhomId) return { ok: false, message: "Thiếu id nhóm." };

  try {
    const supabase = createServiceRoleClient();
    const payload: Record<string, unknown> = {};
    if (patch.ten !== undefined) {
      const ten = patch.ten.trim();
      if (!ten) return { ok: false, message: "Tên nhóm không được trống." };
      payload.ten = ten;
    }
    if (patch.slug !== undefined) {
      const slug = patch.slug.trim().toLowerCase();
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        return { ok: false, message: "Slug chỉ dùng chữ thường, số và gạch ngang." };
      }
      payload.slug = slug;
    }
    if (patch.ten_eng !== undefined) payload.ten_eng = patch.ten_eng?.trim() || null;
    if (patch.mo_ta !== undefined) payload.mo_ta = patch.mo_ta?.trim() || null;
    if (patch.thu_tu !== undefined) payload.thu_tu = patch.thu_tu;
    if (patch.trang_thai !== undefined) {
      payload.trang_thai = patch.trang_thai.trim() || "active";
    }

    if (!Object.keys(payload).length) return { ok: true };

    const { data, error } = await supabase
      .from("linh_vuc_nhom")
      .update(payload)
      .eq("id", nhomId)
      .select("id");
    if (error) {
      if (/duplicate|unique/i.test(error.message)) {
        return { ok: false, message: "Slug nhóm đã tồn tại." };
      }
      return { ok: false, message: error.message };
    }
    if (!data?.length) {
      return { ok: false, message: "Không tìm thấy nhóm để cập nhật." };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

export async function deleteLinhVucNhomForAdmin(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  const nhomId = id.trim();
  if (!nhomId) return { ok: false, message: "Thiếu id nhóm." };
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("linh_vuc_nhom")
      .delete()
      .eq("id", nhomId)
      .select("id");
    if (error) return { ok: false, message: error.message };
    if (!data?.length) {
      return { ok: false, message: "Không tìm thấy nhóm (đã xóa hoặc sai id)." };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

export async function persistLinhVucThumbnail(
  linhVucId: string,
  imageId: string,
  deliveryUrl?: string | null,
): Promise<
  | { ok: true; thumbnail_id: string; thumbnail_url: string }
  | { ok: false; message: string }
> {
  const id = linhVucId.trim();
  const thumb = imageId.trim();
  if (!id) return { ok: false, message: "Thiếu id lĩnh vực." };
  if (!thumb) return { ok: false, message: "Thiếu thumbnail_id." };

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("linh_vuc")
      .update({ thumbnail_id: thumb })
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) return { ok: false, message: error.message };
    if (!data) {
      return { ok: false, message: "Không tìm thấy lĩnh vực để cập nhật ảnh." };
    }
    const thumbnail_url =
      deliveryUrl?.trim() || getCoverUrl(thumb, "public") || "";
    return { ok: true, thumbnail_id: thumb, thumbnail_url };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}
