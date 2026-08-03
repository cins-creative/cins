import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type GoiHocPhi = {
  id: string;
  ten: string;
  soNgay: number;
  giaVnd: number;
  moTa: string | null;
  dangBan: boolean;
  thuTu: number;
  /** Legacy: khóa đầu tiên (đồng bộ từ khoaIds[0]). */
  khoaId: string | null;
  khoaTen: string | null;
  khoaIds: string[];
  khoaTens: string[];
};

type GoiRow = {
  id: string;
  ten: string;
  so_ngay: number;
  gia_vnd: number | string;
  mo_ta: string | null;
  dang_ban: boolean;
  thu_tu: number;
  id_khoa_hoc: string | null;
  org_khoa_hoc?: { ten_khoa_hoc: string | null } | null;
};

const GOI_SELECT =
  "id, ten, so_ngay, gia_vnd, mo_ta, dang_ban, thu_tu, id_khoa_hoc, org_khoa_hoc(ten_khoa_hoc)";

function mapGoiBase(row: GoiRow): Omit<GoiHocPhi, "khoaIds" | "khoaTens"> {
  return {
    id: row.id,
    ten: row.ten,
    soNgay: Number(row.so_ngay),
    giaVnd: Number(row.gia_vnd) || 0,
    moTa: row.mo_ta,
    dangBan: Boolean(row.dang_ban),
    thuTu: Number(row.thu_tu) || 0,
    khoaId: row.id_khoa_hoc,
    khoaTen: row.org_khoa_hoc?.ten_khoa_hoc?.trim() || null,
  };
}

function uniqueIds(ids: ReadonlyArray<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    const id = typeof raw === "string" ? raw.trim() : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

async function loadKhoaLinks(
  admin: ReturnType<typeof createServiceRoleClient>,
  goiIds: string[],
): Promise<Map<string, Array<{ id: string; ten: string }>>> {
  const map = new Map<string, Array<{ id: string; ten: string }>>();
  for (const id of goiIds) map.set(id, []);
  if (goiIds.length === 0) return map;

  const { data, error } = await admin
    .from("org_goi_hoc_phi_khoa")
    .select("id_goi, id_khoa_hoc, org_khoa_hoc(ten_khoa_hoc)")
    .in("id_goi", goiIds);

  if (error || !data) {
    return map;
  }

  for (const row of data) {
    const goiId = row.id_goi as string;
    const khoaId = row.id_khoa_hoc as string;
    const embed = row.org_khoa_hoc as
      | { ten_khoa_hoc: string | null }
      | { ten_khoa_hoc: string | null }[]
      | null;
    const tenRaw = Array.isArray(embed)
      ? embed[0]?.ten_khoa_hoc
      : embed?.ten_khoa_hoc;
    const ten = tenRaw?.trim() || "Khóa học";
    const bag = map.get(goiId) ?? [];
    bag.push({ id: khoaId, ten });
    map.set(goiId, bag);
  }
  return map;
}

function attachKhoa(
  base: Omit<GoiHocPhi, "khoaIds" | "khoaTens">,
  links: Array<{ id: string; ten: string }>,
): GoiHocPhi {
  let khoaIds = links.map((l) => l.id);
  let khoaTens = links.map((l) => l.ten);
  if (khoaIds.length === 0 && base.khoaId) {
    khoaIds = [base.khoaId];
    khoaTens = [base.khoaTen?.trim() || "Khóa học"];
  }
  return {
    ...base,
    khoaId: khoaIds[0] ?? null,
    khoaTen: khoaTens[0] ?? null,
    khoaIds,
    khoaTens,
  };
}

async function assertKhoaBelongToOrg(
  admin: ReturnType<typeof createServiceRoleClient>,
  orgId: string,
  khoaIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (khoaIds.length === 0) return { ok: true };
  const { data, error } = await admin
    .from("org_khoa_hoc")
    .select("id")
    .eq("id_to_chuc", orgId)
    .in("id", khoaIds);
  if (error) return { ok: false, error: error.message };
  const found = new Set((data ?? []).map((r) => r.id as string));
  if (found.size !== khoaIds.length) {
    return { ok: false, error: "Có khóa học không thuộc cơ sở này." };
  }
  return { ok: true };
}

async function replaceGoiKhoaLinks(
  admin: ReturnType<typeof createServiceRoleClient>,
  goiId: string,
  khoaIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error: delErr } = await admin
    .from("org_goi_hoc_phi_khoa")
    .delete()
    .eq("id_goi", goiId);
  if (delErr) {
    /* Bảng chưa migration — bỏ qua, chỉ dùng id_khoa_hoc legacy. */
    if (/does not exist|relation .* does not exist/i.test(delErr.message)) {
      return { ok: true };
    }
    return { ok: false, error: delErr.message };
  }
  if (khoaIds.length === 0) return { ok: true };
  const { error: insErr } = await admin.from("org_goi_hoc_phi_khoa").insert(
    khoaIds.map((id_khoa_hoc) => ({ id_goi: goiId, id_khoa_hoc })),
  );
  if (insErr) return { ok: false, error: insErr.message };
  return { ok: true };
}

export async function listGoiHocPhi(
  orgId: string,
  opts?: { includeHidden?: boolean },
): Promise<GoiHocPhi[]> {
  const admin = createServiceRoleClient();
  let q = admin
    .from("org_goi_hoc_phi")
    .select(GOI_SELECT)
    .eq("id_to_chuc", orgId)
    .order("thu_tu", { ascending: true })
    .order("tao_luc", { ascending: true });
  if (!opts?.includeHidden) {
    q = q.eq("dang_ban", true);
  }
  const { data, error } = await q;
  let rows: GoiRow[] = [];
  if (!error && data) {
    rows = data as unknown as GoiRow[];
  } else {
    let q2 = admin
      .from("org_goi_hoc_phi")
      .select(
        "id, ten, so_ngay, gia_vnd, mo_ta, dang_ban, thu_tu, id_khoa_hoc",
      )
      .eq("id_to_chuc", orgId)
      .order("thu_tu", { ascending: true })
      .order("tao_luc", { ascending: true });
    if (!opts?.includeHidden) {
      q2 = q2.eq("dang_ban", true);
    }
    const { data: fallback } = await q2;
    rows = (fallback ?? []) as unknown as GoiRow[];
  }

  const bases = rows.map(mapGoiBase);
  const links = await loadKhoaLinks(
    admin,
    bases.map((g) => g.id),
  );
  return bases.map((b) => attachKhoa(b, links.get(b.id) ?? []));
}

export async function createGoiHocPhi(input: {
  orgId: string;
  ten: string;
  soNgay: number;
  giaVnd: number;
  moTa?: string | null;
  khoaId?: string | null;
  khoaIds?: string[] | null;
  thuTu?: number;
}): Promise<{ ok: true; goi: GoiHocPhi } | { ok: false; error: string }> {
  const ten = input.ten.trim();
  if (!ten) return { ok: false, error: "Thiếu tên gói." };
  if (input.soNgay < 1) return { ok: false, error: "Số ngày phải ≥ 1." };
  if (input.giaVnd < 0) return { ok: false, error: "Giá không hợp lệ." };

  const khoaIds = uniqueIds([
    ...(input.khoaIds ?? []),
    input.khoaId ?? null,
  ]);

  const admin = createServiceRoleClient();
  const khoaCheck = await assertKhoaBelongToOrg(admin, input.orgId, khoaIds);
  if (!khoaCheck.ok) return khoaCheck;

  const { data, error } = await admin
    .from("org_goi_hoc_phi")
    .insert({
      id_to_chuc: input.orgId,
      ten,
      so_ngay: input.soNgay,
      gia_vnd: input.giaVnd,
      mo_ta: input.moTa?.trim() || null,
      id_khoa_hoc: khoaIds[0] ?? null,
      thu_tu: input.thuTu ?? 0,
      dang_ban: true,
    })
    .select(GOI_SELECT)
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Không tạo gói." };
  }

  const base = mapGoiBase(data as unknown as GoiRow);
  const linkRes = await replaceGoiKhoaLinks(admin, base.id, khoaIds);
  if (!linkRes.ok) return linkRes;

  const links = await loadKhoaLinks(admin, [base.id]);
  return { ok: true, goi: attachKhoa(base, links.get(base.id) ?? []) };
}

export async function updateGoiHocPhi(input: {
  orgId: string;
  goiId: string;
  ten?: string;
  soNgay?: number;
  giaVnd?: number;
  moTa?: string | null;
  dangBan?: boolean;
  thuTu?: number;
  khoaId?: string | null;
  khoaIds?: string[] | null;
}): Promise<{ ok: true; goi: GoiHocPhi } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const patch: Record<string, unknown> = {
    cap_nhat_luc: new Date().toISOString(),
  };
  if (input.ten !== undefined) {
    const ten = input.ten.trim();
    if (!ten) return { ok: false, error: "Thiếu tên gói." };
    patch.ten = ten;
  }
  if (input.soNgay !== undefined) {
    if (input.soNgay < 1) return { ok: false, error: "Số ngày phải ≥ 1." };
    patch.so_ngay = input.soNgay;
  }
  if (input.giaVnd !== undefined) {
    if (input.giaVnd < 0) return { ok: false, error: "Giá không hợp lệ." };
    patch.gia_vnd = input.giaVnd;
  }
  if (input.moTa !== undefined) patch.mo_ta = input.moTa?.trim() || null;
  if (input.dangBan !== undefined) patch.dang_ban = input.dangBan;
  if (input.thuTu !== undefined) patch.thu_tu = input.thuTu;

  let khoaIds: string[] | undefined;
  if (input.khoaIds !== undefined) {
    khoaIds = uniqueIds(input.khoaIds ?? []);
  } else if (input.khoaId !== undefined) {
    khoaIds = uniqueIds([input.khoaId]);
  }
  if (khoaIds !== undefined) {
    const khoaCheck = await assertKhoaBelongToOrg(admin, input.orgId, khoaIds);
    if (!khoaCheck.ok) return khoaCheck;
    patch.id_khoa_hoc = khoaIds[0] ?? null;
  }

  const { data, error } = await admin
    .from("org_goi_hoc_phi")
    .update(patch)
    .eq("id", input.goiId)
    .eq("id_to_chuc", input.orgId)
    .select(GOI_SELECT)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Không cập nhật gói." };
  }

  const base = mapGoiBase(data as unknown as GoiRow);
  if (khoaIds !== undefined) {
    const linkRes = await replaceGoiKhoaLinks(admin, input.goiId, khoaIds);
    if (!linkRes.ok) return linkRes;
  }

  const links = await loadKhoaLinks(admin, [base.id]);
  return { ok: true, goi: attachKhoa(base, links.get(base.id) ?? []) };
}
