import { formatToHopMonDbError } from "@/lib/admin/to-hop-mon-validate";
import { createServiceRoleClient, hasServiceRoleEnv } from "@/lib/supabase/service-role";

export type AdminToHopMonChiTiet = {
  id: string;
  so_thu_tu: number;
  ten_slot: string;
  loai: string;
  co_dinh: boolean;
  id_mon_thi: string | null;
};

export type AdminToHopMonRow = {
  id: string;
  ma_to_hop: string;
  ten_to_hop: string;
  mo_ta: string | null;
  cac_mon: string[];
  chi_tiet: AdminToHopMonChiTiet[];
  /** Tên môn theo thứ tự slot (từ catalog). */
  mon_ten_list: string[];
  usage_khoi: number;
};

type MonCatalogRow = {
  id: string;
  ma: string | null;
  ten: string;
  loai: string | null;
};

async function fetchMonCatalog(
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<Map<string, MonCatalogRow>> {
  const { data } = await supabase
    .from("edu_mon_thi")
    .select("id, ma, ten, loai")
    .order("ten");

  const map = new Map<string, MonCatalogRow>();
  for (const row of data ?? []) {
    const r = row as MonCatalogRow;
    const id = r.id?.trim();
    if (!id) continue;
    map.set(id, {
      id,
      ma: r.ma?.trim() || null,
      ten: r.ten?.trim() || id,
      loai: r.loai?.trim() || "van_hoa",
    });
  }
  return map;
}

function normalizeTenKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function resolveMonIdForSlot(
  monMa: string | null,
  tenSlot: string,
  catalog: Map<string, MonCatalogRow>,
  maToId: Map<string, string>,
): string | null {
  if (monMa) {
    const byMa = maToId.get(monMa);
    if (byMa) return byMa;
    if (catalog.has(monMa)) return monMa;
  }
  const tenKey = normalizeTenKey(tenSlot);
  if (!tenKey || tenKey === "nang khieu") return null;
  for (const [id, mon] of catalog) {
    if (normalizeTenKey(mon.ten) === tenKey) return id;
  }
  return null;
}

function maById(catalog: Map<string, MonCatalogRow>, id: string): string {
  const row = catalog.get(id);
  if (row?.ma) return row.ma;
  if (row?.ten) {
    return row.ten
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 32);
  }
  return id.replace(/-/g, "").slice(0, 16);
}

function enrichRow(
  raw: Record<string, unknown>,
  catalog: Map<string, MonCatalogRow>,
  usageByHop: Map<string, number>,
): AdminToHopMonRow | null {
  const id = String(raw.id ?? "").trim();
  const ma_to_hop = String(raw.ma_to_hop ?? "").trim();
  const ten_to_hop = String(raw.ten_to_hop ?? "").trim();
  if (!id || !ma_to_hop || !ten_to_hop) return null;

  const cac_mon = Array.isArray(raw.cac_mon)
    ? (raw.cac_mon as unknown[]).map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];

  const chiEmbed = raw.edu_to_hop_mon_chi_tiet;
  const chiRaw = Array.isArray(chiEmbed)
    ? chiEmbed
    : chiEmbed
      ? [chiEmbed]
      : [];

  const maToId = new Map<string, string>();
  for (const [monId, mon] of catalog) {
    if (mon.ma) maToId.set(mon.ma, monId);
  }

  const chi_tiet: AdminToHopMonChiTiet[] = chiRaw
    .map((slot) => {
      const s = slot as Record<string, unknown>;
      const slotId = String(s.id ?? "").trim();
      if (!slotId) return null;
      const so_thu_tu = Number(s.so_thu_tu ?? 0);
      const idx = Math.max(0, so_thu_tu - 1);
      const monMa = cac_mon[idx]?.trim() || null;
      const ten_slot = String(s.ten_slot ?? "").trim() || "Môn";
      const id_mon_thi = resolveMonIdForSlot(
        monMa,
        ten_slot,
        catalog,
        maToId,
      );
      return {
        id: slotId,
        so_thu_tu,
        ten_slot,
        loai: String(s.loai ?? "").trim() || "van_hoa",
        co_dinh: Boolean(s.co_dinh),
        id_mon_thi,
      };
    })
    .filter((x): x is AdminToHopMonChiTiet => x != null)
    .sort((a, b) => a.so_thu_tu - b.so_thu_tu);

  const mon_ten_list = chi_tiet.map((slot) => {
    if (slot.id_mon_thi) {
      return catalog.get(slot.id_mon_thi)?.ten ?? slot.ten_slot;
    }
    return slot.ten_slot;
  });

  return {
    id,
    ma_to_hop,
    ten_to_hop,
    mo_ta: raw.mo_ta == null ? null : String(raw.mo_ta).trim() || null,
    cac_mon,
    chi_tiet,
    mon_ten_list,
    usage_khoi: usageByHop.get(id) ?? 0,
  };
}

const SELECT =
  "id, ma_to_hop, ten_to_hop, mo_ta, cac_mon, edu_to_hop_mon_chi_tiet ( id, so_thu_tu, ten_slot, loai, co_dinh )";

export async function listToHopMonForAdmin(): Promise<
  { ok: true; rows: AdminToHopMonRow[] } | { ok: false; message: string }
> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  try {
    const supabase = createServiceRoleClient();
    const [hopRes, usageRes, catalog] = await Promise.all([
      supabase.from("edu_to_hop_mon").select(SELECT).order("ma_to_hop"),
      supabase.from("org_cau_hinh_khoi").select("id_to_hop_mon"),
      fetchMonCatalog(supabase),
    ]);

    if (hopRes.error) {
      return { ok: false, message: hopRes.error.message };
    }

    const usageByHop = new Map<string, number>();
    for (const row of usageRes.data ?? []) {
      const hopId = String(
        (row as { id_to_hop_mon?: string }).id_to_hop_mon ?? "",
      ).trim();
      if (!hopId) continue;
      usageByHop.set(hopId, (usageByHop.get(hopId) ?? 0) + 1);
    }

    const rows = (hopRes.data ?? [])
      .map((r) => enrichRow(r as Record<string, unknown>, catalog, usageByHop))
      .filter((x): x is AdminToHopMonRow => x != null);

    return { ok: true, rows };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

async function syncChiTietForHop(
  supabase: ReturnType<typeof createServiceRoleClient>,
  hopId: string,
  monIds: string[],
  catalog: Map<string, MonCatalogRow>,
  existingSlots: AdminToHopMonChiTiet[] = [],
): Promise<{ ok: true; cac_mon: string[] } | { ok: false; message: string }> {
  const cac_mon: string[] = [];
  const slots: {
    id_to_hop_mon: string;
    so_thu_tu: number;
    ten_slot: string;
    loai: string;
    co_dinh: boolean;
  }[] = [];

  for (let i = 0; i < monIds.length; i++) {
    const monId = monIds[i]?.trim() ?? "";
    if (monId) {
      const mon = catalog.get(monId);
      if (!mon) {
        return { ok: false, message: `Môn thi không tồn tại: ${monId}` };
      }
      const ma = maById(catalog, monId);
      cac_mon.push(ma);
      slots.push({
        id_to_hop_mon: hopId,
        so_thu_tu: i + 1,
        ten_slot: mon.ten,
        loai: mon.loai ?? "van_hoa",
        co_dinh: true,
      });
      continue;
    }

    const prev = existingSlots.find((s) => s.so_thu_tu === i + 1);
    const ten_slot = prev?.ten_slot?.trim() || "Môn";
    const loai = prev?.loai?.trim() || "van_hoa";
    cac_mon.push("");
    slots.push({
      id_to_hop_mon: hopId,
      so_thu_tu: i + 1,
      ten_slot,
      loai,
      co_dinh: false,
    });
  }

  if (!slots.length) {
    return { ok: false, message: "Khối phải có ít nhất một slot môn." };
  }

  const { error: delErr } = await supabase
    .from("edu_to_hop_mon_chi_tiet")
    .delete()
    .eq("id_to_hop_mon", hopId);
  if (delErr) return { ok: false, message: delErr.message };

  if (slots.length) {
    const { error: insErr } = await supabase
      .from("edu_to_hop_mon_chi_tiet")
      .insert(slots);
    if (insErr) return { ok: false, message: insErr.message };
  }

  const { error: updErr } = await supabase
    .from("edu_to_hop_mon")
    .update({ cac_mon })
    .eq("id", hopId);
  if (updErr) return { ok: false, message: updErr.message };

  return { ok: true, cac_mon };
}

export type AdminToHopMonCreate = {
  ma_to_hop: string;
  ten_to_hop: string;
  mo_ta?: string | null;
  mon_ids: string[];
};

export async function createToHopMonForAdmin(
  input: AdminToHopMonCreate,
): Promise<
  { ok: true; row: AdminToHopMonRow } | { ok: false; message: string }
> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  try {
    const supabase = createServiceRoleClient();
    const catalog = await fetchMonCatalog(supabase);

    const { data, error } = await supabase
      .from("edu_to_hop_mon")
      .insert({
        ma_to_hop: input.ma_to_hop.trim().toUpperCase(),
        ten_to_hop: input.ten_to_hop.trim(),
        mo_ta: input.mo_ta?.trim() || null,
        cac_mon: [],
      })
      .select("id")
      .single();

    if (error) {
      return { ok: false, message: formatToHopMonDbError(error.message) };
    }

    const hopId = String((data as { id?: string }).id ?? "").trim();
    if (!hopId) {
      return { ok: false, message: "Không đọc được id khối vừa tạo." };
    }

    const synced = await syncChiTietForHop(
      supabase,
      hopId,
      input.mon_ids,
      catalog,
    );
    if (!synced.ok) {
      await supabase.from("edu_to_hop_mon").delete().eq("id", hopId);
      return synced;
    }

    const list = await listToHopMonForAdmin();
    if (!list.ok) return list;
    const row = list.rows.find((r) => r.id === hopId);
    if (!row) return { ok: false, message: "Không đọc lại được khối vừa tạo." };
    return { ok: true, row };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

export type AdminToHopMonPatch = {
  ma_to_hop?: string;
  ten_to_hop?: string;
  mo_ta?: string | null;
  mon_ids?: string[];
};

export async function updateToHopMonForAdmin(
  id: string,
  patch: AdminToHopMonPatch,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  const hopId = id.trim();
  if (!hopId) return { ok: false, message: "Thiếu id khối thi." };

  try {
    const supabase = createServiceRoleClient();
    const catalog = await fetchMonCatalog(supabase);

    const head: Record<string, unknown> = {};
    if (patch.ma_to_hop !== undefined) {
      head.ma_to_hop = patch.ma_to_hop.trim().toUpperCase();
    }
    if (patch.ten_to_hop !== undefined) {
      head.ten_to_hop = patch.ten_to_hop.trim();
    }
    if (patch.mo_ta !== undefined) {
      head.mo_ta = patch.mo_ta?.trim() || null;
    }

    if (Object.keys(head).length) {
      const { data, error } = await supabase
        .from("edu_to_hop_mon")
        .update(head)
        .eq("id", hopId)
        .select("id");
      if (error) {
        return { ok: false, message: formatToHopMonDbError(error.message) };
      }
      if (!data?.length) {
        return { ok: false, message: "Không tìm thấy khối thi để cập nhật." };
      }
    }

    if (patch.mon_ids) {
      const { data: existingChi } = await supabase
        .from("edu_to_hop_mon_chi_tiet")
        .select("so_thu_tu, ten_slot, loai, co_dinh")
        .eq("id_to_hop_mon", hopId);

      const existingSlots: AdminToHopMonChiTiet[] = (existingChi ?? [])
        .map((row) => {
          const r = row as {
            so_thu_tu?: number;
            ten_slot?: string;
            loai?: string;
            co_dinh?: boolean;
          };
          return {
            id: "",
            so_thu_tu: Number(r.so_thu_tu ?? 0),
            ten_slot: String(r.ten_slot ?? "").trim() || "Môn",
            loai: String(r.loai ?? "").trim() || "van_hoa",
            co_dinh: Boolean(r.co_dinh),
            id_mon_thi: null,
          };
        })
        .filter((s) => s.so_thu_tu > 0);

      const synced = await syncChiTietForHop(
        supabase,
        hopId,
        patch.mon_ids,
        catalog,
        existingSlots,
      );
      if (!synced.ok) return synced;
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

export async function countToHopMonUsage(
  id: string,
): Promise<{ ok: true; count: number } | { ok: false; message: string }> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  const hopId = id.trim();
  if (!hopId) return { ok: false, message: "Thiếu id khối thi." };
  try {
    const supabase = createServiceRoleClient();
    const { count, error } = await supabase
      .from("org_cau_hinh_khoi")
      .select("id", { count: "exact", head: true })
      .eq("id_to_hop_mon", hopId);
    if (error) return { ok: false, message: error.message };
    return { ok: true, count: count ?? 0 };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

export async function deleteToHopMonForAdmin(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  const hopId = id.trim();
  if (!hopId) return { ok: false, message: "Thiếu id khối thi." };

  try {
    const supabase = createServiceRoleClient();
    const usage = await countToHopMonUsage(hopId);
    if (!usage.ok) return usage;
    if (usage.count > 0) {
      return {
        ok: false,
        message: `Không xóa được: ${usage.count} cấu hình khối trường đang dùng khối này.`,
      };
    }

    await supabase
      .from("edu_to_hop_mon_chi_tiet")
      .delete()
      .eq("id_to_hop_mon", hopId);

    const { data, error } = await supabase
      .from("edu_to_hop_mon")
      .delete()
      .eq("id", hopId)
      .select("id");

    if (error) {
      return { ok: false, message: formatToHopMonDbError(error.message) };
    }
    if (!data?.length) {
      return { ok: false, message: "Không tìm thấy khối thi (id không tồn tại)." };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}
