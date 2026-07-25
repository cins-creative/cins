import "server-only";

import { todayYmdVn } from "@/lib/co-so/ky-hoc";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  mergeChiNhanhIntoCauHinh,
  parseChiNhanhFromCauHinh,
} from "@/lib/truong/chi-nhanh";
import { normalizeTinhThanhForDb } from "@/lib/truong/contact";
import type { TruongChiNhanh } from "@/lib/truong/types";

export type ChiNhanhRow = {
  id: string;
  ten: string;
  diaChi: string | null;
  tinhThanh: string | null;
  dienThoai: string | null;
  email: string | null;
  /** Cloudflare Images id — mirror `cau_hinh.chi_nhanh[].cover_id`. */
  coverId: string | null;
  dangHoatDong: boolean;
  thuTu: number;
};

function mapCn(
  r: Record<string, unknown>,
  coverId: string | null = null,
): ChiNhanhRow {
  return {
    id: r.id as string,
    ten: r.ten as string,
    diaChi: (r.dia_chi as string | null) ?? null,
    tinhThanh: (r.tinh_thanh as string | null) ?? null,
    dienThoai: (r.dien_thoai as string | null) ?? null,
    email: (r.email as string | null) ?? null,
    coverId,
    dangHoatDong: Boolean(r.dang_hoat_dong),
    thuTu: Number(r.thu_tu) || 0,
  };
}

function coverLookupFromCauHinh(cauHinh: unknown): {
  byId: Map<string, string | null>;
  byKey: Map<string, string | null>;
} {
  const prev = parseChiNhanhFromCauHinh(cauHinh) ?? [];
  const byId = new Map<string, string | null>();
  const byKey = new Map<string, string | null>();
  for (const p of prev) {
    const cover = p.cover_id?.trim() || null;
    byId.set(p.id, cover);
    byKey.set(`${p.ten.trim()}|${p.dia_chi.trim()}`, cover);
  }
  return { byId, byKey };
}

function resolveCoverForRow(
  row: { id: string; ten: string; dia_chi: string | null },
  lookup: ReturnType<typeof coverLookupFromCauHinh>,
  override?: string | null,
): string | null {
  if (override !== undefined) return override?.trim() || null;
  return (
    lookup.byId.get(row.id) ??
    lookup.byKey.get(`${row.ten.trim()}|${(row.dia_chi ?? "").trim()}`) ??
    null
  );
}

export async function listChiNhanh(orgId: string): Promise<ChiNhanhRow[]> {
  const admin = createServiceRoleClient();
  let { data } = await admin
    .from("org_chi_nhanh")
    .select(
      "id, ten, dia_chi, tinh_thanh, dien_thoai, email, dang_hoat_dong, thu_tu",
    )
    .eq("id_to_chuc", orgId)
    .order("thu_tu")
    .order("tao_luc");

  if (!data?.length) {
    await seedOrgChiNhanhFromCauHinh(orgId);
    const again = await admin
      .from("org_chi_nhanh")
      .select(
        "id, ten, dia_chi, tinh_thanh, dien_thoai, email, dang_hoat_dong, thu_tu",
      )
      .eq("id_to_chuc", orgId)
      .order("thu_tu")
      .order("tao_luc");
    data = again.data;
  }

  const { data: org } = await admin
    .from("org_to_chuc")
    .select("cau_hinh")
    .eq("id", orgId)
    .maybeSingle();
  const lookup = coverLookupFromCauHinh(org?.cau_hinh);

  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const coverId = resolveCoverForRow(
      {
        id: row.id as string,
        ten: row.ten as string,
        dia_chi: (row.dia_chi as string | null) ?? null,
      },
      lookup,
    );
    return mapCn(row, coverId);
  });
}

/** Một lần: JSON `cau_hinh.chi_nhanh` → bảng `org_chi_nhanh`. */
async function seedOrgChiNhanhFromCauHinh(orgId: string): Promise<void> {
  const admin = createServiceRoleClient();
  const { data: org } = await admin
    .from("org_to_chuc")
    .select("cau_hinh, dia_chi, tinh_thanh, dien_thoai, email_lien_he")
    .eq("id", orgId)
    .maybeSingle();
  if (!org) return;
  const fromJson = parseChiNhanhFromCauHinh(org.cau_hinh) ?? [];
  const rows: Array<Record<string, unknown>> = [];
  if (fromJson.length > 0) {
    for (const [i, c] of fromJson.entries()) {
      rows.push({
        id_to_chuc: orgId,
        ten: c.ten,
        dia_chi: c.dia_chi,
        tinh_thanh: c.tinh_thanh,
        dien_thoai: c.dien_thoai ?? null,
        email: c.email ?? null,
        thu_tu: i,
        dang_hoat_dong: true,
      });
    }
  } else if (org.dia_chi?.trim()) {
    rows.push({
      id_to_chuc: orgId,
      ten: "Trụ sở",
      dia_chi: org.dia_chi.trim(),
      tinh_thanh: org.tinh_thanh,
      dien_thoai: org.dien_thoai,
      email: org.email_lien_he,
      thu_tu: 0,
      dang_hoat_dong: true,
    });
  }
  if (rows.length === 0) return;
  await admin.from("org_chi_nhanh").insert(rows);
}

/** Đồng bộ chi nhánh → cột org + mirror `cau_hinh.chi_nhanh` (kèm cover_id). */
export async function syncPublicContactFromOrgChiNhanh(
  orgId: string,
  coverOverrides?: Record<string, string | null>,
): Promise<void> {
  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("org_chi_nhanh")
    .select(
      "id, ten, dia_chi, tinh_thanh, dien_thoai, email, dang_hoat_dong, thu_tu",
    )
    .eq("id_to_chuc", orgId)
    .order("thu_tu")
    .order("tao_luc");

  const { data: org } = await admin
    .from("org_to_chuc")
    .select("cau_hinh")
    .eq("id", orgId)
    .maybeSingle();
  if (!org) return;

  const lookup = coverLookupFromCauHinh(org.cau_hinh);
  const all = (rows ?? []).filter(
    (r) => (r.ten as string)?.trim() && (r.dia_chi as string)?.trim(),
  );
  const asTruong: TruongChiNhanh[] = all.map((r) => {
    const id = r.id as string;
    const override =
      coverOverrides && Object.prototype.hasOwnProperty.call(coverOverrides, id)
        ? coverOverrides[id]
        : undefined;
    return {
      id,
      ten: r.ten as string,
      dia_chi: (r.dia_chi as string) || "",
      tinh_thanh: (r.tinh_thanh as string | null) ?? null,
      dien_thoai: (r.dien_thoai as string | null) ?? null,
      email: (r.email as string | null) ?? null,
      website: null,
      facebook: null,
      cover_id: resolveCoverForRow(
        {
          id,
          ten: r.ten as string,
          dia_chi: (r.dia_chi as string | null) ?? null,
        },
        lookup,
        override,
      ),
    };
  });

  const primary = all.find((r) => r.dang_hoat_dong);
  const primaryMapped = primary
    ? asTruong.find((t) => t.id === (primary.id as string))
    : asTruong[0];

  const patch: Record<string, unknown> = {
    cau_hinh: mergeChiNhanhIntoCauHinh(org.cau_hinh, asTruong),
  };
  if (primaryMapped) {
    patch.dia_chi = primaryMapped.dia_chi;
    patch.tinh_thanh = normalizeTinhThanhForDb(primaryMapped.tinh_thanh);
    patch.dien_thoai = primaryMapped.dien_thoai;
    patch.email_lien_he = primaryMapped.email;
  }
  await admin.from("org_to_chuc").update(patch).eq("id", orgId);
}

export async function createChiNhanh(input: {
  orgId: string;
  ten: string;
  diaChi?: string | null;
  tinhThanh?: string | null;
  dienThoai?: string | null;
  email?: string | null;
  coverId?: string | null;
}): Promise<{ ok: true; row: ChiNhanhRow } | { ok: false; error: string }> {
  const ten = input.ten.trim();
  if (!ten) return { ok: false, error: "Thiếu tên chi nhánh." };
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_chi_nhanh")
    .insert({
      id_to_chuc: input.orgId,
      ten,
      dia_chi: input.diaChi?.trim() || null,
      tinh_thanh: input.tinhThanh?.trim() || null,
      dien_thoai: input.dienThoai?.trim() || null,
      email: input.email?.trim() || null,
    })
    .select(
      "id, ten, dia_chi, tinh_thanh, dien_thoai, email, dang_hoat_dong, thu_tu",
    )
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Không tạo được." };
  }
  const coverId = input.coverId?.trim() || null;
  await syncPublicContactFromOrgChiNhanh(
    input.orgId,
    coverId ? { [data.id as string]: coverId } : undefined,
  );
  return {
    ok: true,
    row: mapCn(data as Record<string, unknown>, coverId),
  };
}

export async function updateChiNhanh(input: {
  orgId: string;
  id: string;
  ten?: string;
  diaChi?: string | null;
  tinhThanh?: string | null;
  dienThoai?: string | null;
  email?: string | null;
  coverId?: string | null;
  dangHoatDong?: boolean;
}): Promise<{ ok: true; row: ChiNhanhRow } | { ok: false; error: string }> {
  const patch: Record<string, unknown> = {
    cap_nhat_luc: new Date().toISOString(),
  };
  if (input.ten !== undefined) {
    const ten = input.ten.trim();
    if (!ten) return { ok: false, error: "Thiếu tên." };
    patch.ten = ten;
  }
  if (input.diaChi !== undefined) patch.dia_chi = input.diaChi?.trim() || null;
  if (input.tinhThanh !== undefined) {
    patch.tinh_thanh = input.tinhThanh?.trim() || null;
  }
  if (input.dienThoai !== undefined) {
    patch.dien_thoai = input.dienThoai?.trim() || null;
  }
  if (input.email !== undefined) patch.email = input.email?.trim() || null;
  if (input.dangHoatDong !== undefined) {
    patch.dang_hoat_dong = input.dangHoatDong;
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_chi_nhanh")
    .update(patch)
    .eq("id", input.id)
    .eq("id_to_chuc", input.orgId)
    .select(
      "id, ten, dia_chi, tinh_thanh, dien_thoai, email, dang_hoat_dong, thu_tu",
    )
    .maybeSingle();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Không cập nhật." };
  }

  const coverOverride =
    input.coverId !== undefined
      ? { [input.id]: input.coverId?.trim() || null }
      : undefined;
  await syncPublicContactFromOrgChiNhanh(input.orgId, coverOverride);

  const { data: org } = await admin
    .from("org_to_chuc")
    .select("cau_hinh")
    .eq("id", input.orgId)
    .maybeSingle();
  const lookup = coverLookupFromCauHinh(org?.cau_hinh);
  const coverId = resolveCoverForRow(
    {
      id: data.id as string,
      ten: data.ten as string,
      dia_chi: (data.dia_chi as string | null) ?? null,
    },
    lookup,
    input.coverId !== undefined ? input.coverId?.trim() || null : undefined,
  );

  return {
    ok: true,
    row: mapCn(data as Record<string, unknown>, coverId),
  };
}

export type DiemDanhSlot = {
  userId: string;
  tenHienThi: string;
  coMat: boolean | null;
  ghiChu: string | null;
};

export async function getDiemDanhNgay(input: {
  orgId: string;
  lopId: string;
  ngay?: string;
}): Promise<
  | { ok: true; ngay: string; rows: DiemDanhSlot[] }
  | { ok: false; error: string }
> {
  const ngay = input.ngay?.trim() || todayYmdVn();
  const admin = createServiceRoleClient();

  const { data: lop } = await admin
    .from("org_lop_hoc")
    .select("id, id_khoa_hoc")
    .eq("id", input.lopId)
    .maybeSingle();
  if (!lop) return { ok: false, error: "Không tìm thấy lớp." };

  const { data: khoa } = await admin
    .from("org_khoa_hoc")
    .select("id_to_chuc")
    .eq("id", lop.id_khoa_hoc as string)
    .maybeSingle();
  if (!khoa || khoa.id_to_chuc !== input.orgId) {
    return { ok: false, error: "Lớp không thuộc cơ sở." };
  }

  const { data: hvls } = await admin
    .from("user_hoc_vien_lop")
    .select("id_nguoi_dung")
    .eq("id_lop_hoc", input.lopId)
    .in("trang_thai", ["dang_hoc", "da_dang_ky", "tam_nghi"]);
  const userIds = (hvls ?? []).map((h) => h.id_nguoi_dung as string);
  if (userIds.length === 0) {
    return { ok: true, ngay, rows: [] };
  }

  const [{ data: users }, { data: marks }] = await Promise.all([
    admin
      .from("user_nguoi_dung")
      .select("id, ten_hien_thi")
      .in("id", userIds),
    admin
      .from("org_diem_danh")
      .select("id_nguoi_dung, co_mat, ghi_chu")
      .eq("id_lop_hoc", input.lopId)
      .eq("ngay", ngay),
  ]);
  const markBy = new Map(
    (marks ?? []).map((m) => [
      m.id_nguoi_dung as string,
      {
        coMat: Boolean(m.co_mat),
        ghiChu: (m.ghi_chu as string | null) ?? null,
      },
    ]),
  );
  const rows: DiemDanhSlot[] = (users ?? []).map((u) => {
    const m = markBy.get(u.id as string);
    return {
      userId: u.id as string,
      tenHienThi: (u.ten_hien_thi as string) || "HV",
      coMat: m ? m.coMat : null,
      ghiChu: m?.ghiChu ?? null,
    };
  });
  rows.sort((a, b) => a.tenHienThi.localeCompare(b.tenHienThi, "vi"));
  return { ok: true, ngay, rows };
}

export async function saveDiemDanhNgay(input: {
  orgId: string;
  lopId: string;
  ngay: string;
  actorId: string;
  marks: Array<{ userId: string; coMat: boolean; ghiChu?: string | null }>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await getDiemDanhNgay({
    orgId: input.orgId,
    lopId: input.lopId,
    ngay: input.ngay,
  });
  if (!gate.ok) return gate;

  const admin = createServiceRoleClient();
  for (const m of input.marks) {
    const { error } = await admin.from("org_diem_danh").upsert(
      {
        id_lop_hoc: input.lopId,
        id_nguoi_dung: m.userId,
        ngay: input.ngay,
        co_mat: m.coMat,
        ghi_chu: m.ghiChu?.trim() || null,
        id_nguoi_diem_danh: input.actorId,
      },
      { onConflict: "id_lop_hoc,id_nguoi_dung,ngay" },
    );
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function getDoanhThuSummary(orgId: string): Promise<{
  tongDaNhan: number;
  soDonDaNhan: number;
  soDonCho: number;
  theoKenh: Array<{ kenh: string; tong: number; soDon: number }>;
}> {
  const admin = createServiceRoleClient();
  const { data: dons } = await admin
    .from("org_don_hoc_phi")
    .select("trang_thai, kenh, so_tien_vnd")
    .eq("id_to_chuc", orgId)
    .in("trang_thai", ["da_nhan_tien", "cho_thanh_toan"]);

  let tongDaNhan = 0;
  let soDonDaNhan = 0;
  let soDonCho = 0;
  const byKenh = new Map<string, { tong: number; soDon: number }>();

  for (const d of dons ?? []) {
    const tien = Number(d.so_tien_vnd) || 0;
    if (d.trang_thai === "cho_thanh_toan") {
      soDonCho += 1;
      continue;
    }
    soDonDaNhan += 1;
    tongDaNhan += tien;
    const k = (d.kenh as string) || "khac";
    const cur = byKenh.get(k) ?? { tong: 0, soDon: 0 };
    cur.tong += tien;
    cur.soDon += 1;
    byKenh.set(k, cur);
  }

  return {
    tongDaNhan,
    soDonDaNhan,
    soDonCho,
    theoKenh: [...byKenh.entries()].map(([kenh, v]) => ({
      kenh,
      tong: v.tong,
      soDon: v.soDon,
    })),
  };
}

export async function getMarketingFunnel(orgId: string): Promise<{
  soGhiDanh: number;
  soDangHoc: number;
  soFreeze: number;
  soDonCho: number;
  soDonDaNhan: number;
}> {
  const admin = createServiceRoleClient();
  const { data: khoaRows } = await admin
    .from("org_khoa_hoc")
    .select("id")
    .eq("id_to_chuc", orgId);
  const khoaIds = (khoaRows ?? []).map((k) => k.id as string);
  if (khoaIds.length === 0) {
    return {
      soGhiDanh: 0,
      soDangHoc: 0,
      soFreeze: 0,
      soDonCho: 0,
      soDonDaNhan: 0,
    };
  }

  const { data: hvls } = await admin
    .from("user_hoc_vien_lop")
    .select("id, trang_thai")
    .in("id_khoa_hoc", khoaIds);

  const soGhiDanh = hvls?.length ?? 0;
  const soDangHoc =
    hvls?.filter((h) => h.trang_thai === "dang_hoc").length ?? 0;

  const hvlIds = (hvls ?? []).map((h) => h.id as string);
  let soFreeze = 0;
  if (hvlIds.length > 0) {
    const today = todayYmdVn();
    const { data: kys } = await admin
      .from("org_ky_hoc")
      .select("id_hoc_vien_lop, ngay_cuoi")
      .in("id_hoc_vien_lop", hvlIds);
    const maxEnd = new Map<string, string>();
    for (const k of kys ?? []) {
      const id = k.id_hoc_vien_lop as string;
      const end = k.ngay_cuoi as string;
      const prev = maxEnd.get(id);
      if (!prev || end > prev) maxEnd.set(id, end);
    }
    for (const id of hvlIds) {
      const end = maxEnd.get(id);
      if (!end || end < today) soFreeze += 1;
    }
  }

  const { count: soDonCho } = await admin
    .from("org_don_hoc_phi")
    .select("id", { count: "exact", head: true })
    .eq("id_to_chuc", orgId)
    .eq("trang_thai", "cho_thanh_toan");
  const { count: soDonDaNhan } = await admin
    .from("org_don_hoc_phi")
    .select("id", { count: "exact", head: true })
    .eq("id_to_chuc", orgId)
    .eq("trang_thai", "da_nhan_tien");

  return {
    soGhiDanh,
    soDangHoc,
    soFreeze,
    soDonCho: soDonCho ?? 0,
    soDonDaNhan: soDonDaNhan ?? 0,
  };
}
