import { NextResponse } from "next/server";

import { assertTruongInlineApi } from "@/lib/truong/inline-api";
import { normalizeTinhThanhForDb } from "@/lib/truong/contact";
import {
  emptyOrgContactFields,
  isMissingOrgContactColumnError,
  splitOrgPatch,
} from "@/lib/truong/org-contact-fields";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ id: string }> };

const ORG_TO_CHUC_FIELDS = [
  "ten",
  "mo_ta",
  "gioi_thieu_truong",
  "tinh_thanh",
  "dia_chi",
  "dien_thoai",
  "email_lien_he",
  "cover_id",
  "avatar_id",
  "logo_id",
] as const;

const ORG_TRUONG_DAI_HOC_FIELDS = [
  "ten_tieng_anh",
  "website",
  "hoc_phi_nam_tu",
  "hoc_phi_nam_den",
  "co_ktx",
  "ktx_gia_thang",
] as const;

const ORG_TRUONG_DAI_HOC_EMBED = `
  org_truong_dai_hoc (
    ten_tieng_anh,
    website,
    hoc_phi_nam_tu,
    hoc_phi_nam_den,
    co_ktx,
    ktx_gia_thang
  )
`;

const ORG_SELECT_WITH_CONTACT = `
  id,
  slug,
  ten,
  mo_ta,
  gioi_thieu_truong,
  tinh_thanh,
  dia_chi,
  dien_thoai,
  email_lien_he,
  cover_id,
  avatar_id,
  ${ORG_TRUONG_DAI_HOC_EMBED}
`;

const ORG_SELECT_BASE = `
  id,
  slug,
  ten,
  mo_ta,
  gioi_thieu_truong,
  tinh_thanh,
  cover_id,
  avatar_id,
  ${ORG_TRUONG_DAI_HOC_EMBED}
`;

async function updateOrgToChuc(
  supabase: ReturnType<typeof createServiceRoleClient>,
  id: string,
  orgPatch: Record<string, unknown>,
): Promise<{ contactSkipped: boolean; error: string | null }> {
  if (Object.keys(orgPatch).length === 0) {
    return { contactSkipped: false, error: null };
  }

  const normalized = { ...orgPatch };
  if ("tinh_thanh" in normalized) {
    normalized.tinh_thanh = normalizeTinhThanhForDb(normalized.tinh_thanh);
  }

  const { error } = await supabase
    .from("org_to_chuc")
    .update(normalized)
    .eq("id", id);

  if (!error) return { contactSkipped: false, error: null };

  if (!isMissingOrgContactColumnError(error.message)) {
    return { contactSkipped: false, error: error.message };
  }

  const { contact, rest } = splitOrgPatch(normalized);
  if (Object.keys(contact).length === 0) {
    return { contactSkipped: false, error: error.message };
  }

  if (Object.keys(rest).length === 0) {
    return {
      contactSkipped: true,
      error:
        "Chưa có cột địa chỉ/liên hệ trên database. Chạy supabase/sql/org-truong-contact-fields.sql trong Supabase SQL Editor.",
    };
  }

  const { error: retryError } = await supabase
    .from("org_to_chuc")
    .update(rest)
    .eq("id", id);

  if (retryError) {
    return { contactSkipped: true, error: retryError.message };
  }

  return { contactSkipped: true, error: null };
}

async function fetchOrgAfterPatch(
  supabase: ReturnType<typeof createServiceRoleClient>,
  id: string,
) {
  const full = await supabase
    .from("org_to_chuc")
    .select(ORG_SELECT_WITH_CONTACT)
    .eq("id", id)
    .maybeSingle();

  if (!full.error && full.data) return full.data;

  if (
    full.error &&
    isMissingOrgContactColumnError(full.error.message)
  ) {
    const base = await supabase
      .from("org_to_chuc")
      .select(ORG_SELECT_BASE)
      .eq("id", id)
      .maybeSingle();
    if (base.data) {
      return { ...base.data, ...emptyOrgContactFields() };
    }
  }

  return null;
}

export async function PATCH(request: Request, context: RouteContext) {
  const denied = assertTruongInlineApi(request);
  if (denied) return denied;

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orgPatch: Record<string, unknown> = {};
  const otdPatch: Record<string, unknown> = {};

  for (const key of ORG_TO_CHUC_FIELDS) {
    if (key in body) orgPatch[key] = body[key];
  }
  for (const key of ORG_TRUONG_DAI_HOC_FIELDS) {
    if (key in body) otdPatch[key] = body[key];
  }

  if (Object.keys(orgPatch).length === 0 && Object.keys(otdPatch).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  let contactFieldsSkipped = false;

  if (Object.keys(orgPatch).length > 0) {
    const orgResult = await updateOrgToChuc(supabase, id, orgPatch);
    if (orgResult.error) {
      return NextResponse.json({ error: orgResult.error }, { status: 500 });
    }
    contactFieldsSkipped = orgResult.contactSkipped;
  }

  if (Object.keys(otdPatch).length > 0) {
    const { error } = await supabase
      .from("org_truong_dai_hoc")
      .update(otdPatch)
      .eq("id_to_chuc", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const orgRow = await fetchOrgAfterPatch(supabase, id);

  if (!orgRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const otd = Array.isArray(orgRow.org_truong_dai_hoc)
    ? orgRow.org_truong_dai_hoc[0]
    : orgRow.org_truong_dai_hoc;

  return NextResponse.json({
    contactFieldsSkipped,
    org: {
      id: orgRow.id,
      slug: orgRow.slug,
      ten: orgRow.ten,
      mo_ta: orgRow.mo_ta,
      gioi_thieu_truong: orgRow.gioi_thieu_truong ?? null,
      tinh_thanh: orgRow.tinh_thanh ?? null,
      dia_chi: orgRow.dia_chi ?? null,
      dien_thoai: orgRow.dien_thoai ?? null,
      email_lien_he: orgRow.email_lien_he ?? null,
      cover_id: orgRow.cover_id,
      avatar_id: orgRow.avatar_id,
      ten_tieng_anh: otd?.ten_tieng_anh ?? null,
      website: otd?.website ?? null,
      hoc_phi_nam_tu: otd?.hoc_phi_nam_tu ?? null,
      hoc_phi_nam_den: otd?.hoc_phi_nam_den ?? null,
      co_ktx: otd?.co_ktx ?? null,
      ktx_gia_thang: otd?.ktx_gia_thang ?? null,
    },
  });
}
