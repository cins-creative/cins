import { NextResponse } from "next/server";

import {
  archiveAdminToChuc,
  fetchAdminToChucDetail,
  updateAdminToChuc,
} from "@/lib/admin/to-chuc-crud";
import type { AdminToChucUpdateInput } from "@/lib/admin/to-chuc-types";
import {
  isOrgDelegationConfigured,
  verifyOrgDelegationPassword,
} from "@/lib/admin/org-delegation";
import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";

type RouteContext = { params: Promise<{ id: string }> };

function parseUpdateBody(body: unknown): AdminToChucUpdateInput | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as Record<string, unknown>;
  const input: AdminToChucUpdateInput = {};

  if (typeof raw.ten === "string") input.ten = raw.ten;
  if (typeof raw.slug === "string") input.slug = raw.slug;
  if (raw.moTa === null || typeof raw.moTa === "string") input.moTa = raw.moTa;
  if (raw.tinhThanh === null || typeof raw.tinhThanh === "string") {
    input.tinhThanh = raw.tinhThanh;
  }
  if (raw.diaChi === null || typeof raw.diaChi === "string") {
    input.diaChi = raw.diaChi;
  }
  if (raw.dienThoai === null || typeof raw.dienThoai === "string") {
    input.dienThoai = raw.dienThoai;
  }
  if (raw.emailLienHe === null || typeof raw.emailLienHe === "string") {
    input.emailLienHe = raw.emailLienHe;
  }
  if (typeof raw.trangThaiTinCay === "string") {
    input.trangThaiTinCay = raw.trangThaiTinCay;
  }
  if (typeof raw.trangThaiHoatDong === "string") {
    input.trangThaiHoatDong = raw.trangThaiHoatDong;
  }

  return input;
}

export async function GET(_req: Request, context: RouteContext) {
  const isAdmin = await getCurrentUserIsCinsAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const org = await fetchAdminToChucDetail(id);
  if (!org) {
    return NextResponse.json({ error: "Không tìm thấy tổ chức." }, { status: 404 });
  }

  return NextResponse.json({ org });
}

export async function PATCH(req: Request, context: RouteContext) {
  const isAdmin = await getCurrentUserIsCinsAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const input = parseUpdateBody(body);
  if (!input) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const result = await updateAdminToChuc(id, input);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ row: result.row });
}

export async function DELETE(req: Request, context: RouteContext) {
  const isAdmin = await getCurrentUserIsCinsAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  if (!isOrgDelegationConfigured()) {
    return NextResponse.json(
      { error: "Server chưa cấu hình CINS_ORG_DELEGATION_PASSWORD." },
      { status: 503 },
    );
  }

  let body: { delegationPassword?: string } = {};
  try {
    body = (await req.json()) as { delegationPassword?: string };
  } catch {
    body = {};
  }

  const pwd = verifyOrgDelegationPassword(body.delegationPassword);
  if (!pwd.ok) {
    return NextResponse.json({ error: pwd.error }, { status: 403 });
  }

  const result = await archiveAdminToChuc(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
