import { NextResponse } from "next/server";

import { assertTruongOrgWriteApi } from "@/lib/truong/inline-api-auth";
import { normalizeTinhThanhForDb } from "@/lib/truong/contact";
import {
  emptyOrgContactFields,
  isMissingOrgContactColumnError,
  splitOrgPatch,
} from "@/lib/truong/org-contact-fields";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ id: string }> };

export type StudioSettings = {
  orgId: string;
  slug: string;
  ten: string;
  tenChinhThuc: string | null;
  moTa: string | null;
  gioiThieu: string | null;
  website: string | null;
  tinhThanh: string | null;
  diaChi: string | null;
  dienThoai: string | null;
  emailLienHe: string | null;
};

const ORG_SELECT = `
  id, slug, ten, mo_ta, gioi_thieu_truong, tinh_thanh,
  dia_chi, dien_thoai, email_lien_he, loai_to_chuc, cau_hinh
`;

type OrgRow = {
  id: string;
  slug: string;
  ten: string;
  mo_ta: string | null;
  gioi_thieu_truong: string | null;
  tinh_thanh: string | null;
  dia_chi: string | null;
  dien_thoai: string | null;
  email_lien_he: string | null;
  loai_to_chuc: string;
  cau_hinh: Record<string, unknown> | null;
};

function readCauHinhString(
  cauHinh: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  const value = cauHinh?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function toSettings(row: OrgRow): StudioSettings {
  return {
    orgId: row.id,
    slug: row.slug,
    ten: row.ten,
    tenChinhThuc: readCauHinhString(row.cau_hinh, "ten_chinh_thuc"),
    moTa: row.mo_ta,
    gioiThieu: row.gioi_thieu_truong,
    website: readCauHinhString(row.cau_hinh, "website"),
    tinhThanh: row.tinh_thanh,
    diaChi: row.dia_chi,
    dienThoai: row.dien_thoai,
    emailLienHe: row.email_lien_he,
  };
}

async function loadStudioRow(
  supabase: ReturnType<typeof createServiceRoleClient>,
  id: string,
): Promise<{ row: OrgRow | null; missingContact: boolean }> {
  const full = await supabase
    .from("org_to_chuc")
    .select(ORG_SELECT)
    .eq("id", id)
    .in("loai_to_chuc", ["studio", "doanh_nghiep"])
    .maybeSingle<OrgRow>();

  if (!full.error) return { row: full.data ?? null, missingContact: false };

  if (isMissingOrgContactColumnError(full.error.message)) {
    const base = await supabase
      .from("org_to_chuc")
      .select("id, slug, ten, mo_ta, gioi_thieu_truong, tinh_thanh, loai_to_chuc, cau_hinh")
      .eq("id", id)
      .in("loai_to_chuc", ["studio", "doanh_nghiep"])
      .maybeSingle();
    if (base.data) {
      return {
        row: { ...(base.data as OrgRow), ...emptyOrgContactFields() } as OrgRow,
        missingContact: true,
      };
    }
  }
  return { row: null, missingContact: false };
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const denied = await assertTruongOrgWriteApi(request, id);
  if (denied) return denied;

  const supabase = createServiceRoleClient();
  const { row } = await loadStudioRow(supabase, id);
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ settings: toSettings(row) });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const denied = await assertTruongOrgWriteApi(request, id);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { row: current } = await loadStudioRow(supabase, id);
  if (!current) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const str = (v: unknown): string | null => {
    if (v === null || v === undefined) return null;
    if (typeof v !== "string") return null;
    const t = v.trim();
    return t ? t : null;
  };

  const orgPatch: Record<string, unknown> = {};
  if ("ten" in body) {
    const ten = String(body.ten ?? "").trim();
    if (!ten) {
      return NextResponse.json({ error: "Tên không được trống" }, { status: 400 });
    }
    orgPatch.ten = ten;
  }
  if ("moTa" in body) orgPatch.mo_ta = str(body.moTa);
  if ("gioiThieu" in body) orgPatch.gioi_thieu_truong = str(body.gioiThieu);
  if ("tinhThanh" in body) {
    orgPatch.tinh_thanh = normalizeTinhThanhForDb(str(body.tinhThanh));
  }
  if ("diaChi" in body) orgPatch.dia_chi = str(body.diaChi);
  if ("dienThoai" in body) orgPatch.dien_thoai = str(body.dienThoai);
  if ("emailLienHe" in body) orgPatch.email_lien_he = str(body.emailLienHe);

  // website + tên chính thức lưu trong cau_hinh.
  const touchesCauHinh = "website" in body || "tenChinhThuc" in body;
  if (touchesCauHinh) {
    const nextCauHinh: Record<string, unknown> = { ...(current.cau_hinh ?? {}) };
    if ("website" in body) {
      const w = str(body.website);
      if (w) nextCauHinh.website = w;
      else delete nextCauHinh.website;
    }
    if ("tenChinhThuc" in body) {
      const tc = str(body.tenChinhThuc);
      if (tc) nextCauHinh.ten_chinh_thuc = tc;
      else delete nextCauHinh.ten_chinh_thuc;
    }
    orgPatch.cau_hinh = nextCauHinh;
  }

  if (Object.keys(orgPatch).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  let contactFieldsSkipped = false;
  const { error } = await supabase
    .from("org_to_chuc")
    .update(orgPatch)
    .eq("id", id);

  if (error) {
    if (!isMissingOrgContactColumnError(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const { rest } = splitOrgPatch(orgPatch);
    if (Object.keys(rest).length > 0) {
      const retry = await supabase.from("org_to_chuc").update(rest).eq("id", id);
      if (retry.error) {
        return NextResponse.json({ error: retry.error.message }, { status: 500 });
      }
    }
    contactFieldsSkipped = true;
  }

  const { row } = await loadStudioRow(supabase, id);
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    settings: toSettings(row),
    contactFieldsSkipped,
  });
}
