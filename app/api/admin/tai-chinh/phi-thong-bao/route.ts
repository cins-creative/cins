import { NextResponse } from "next/server";

import {
  createPhiThongBao,
  listPhiThongBaoAdmin,
  updatePhiThongBao,
  type PhiDoiTuong,
} from "@/lib/billing/phi-chinh-sach";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  canGrantAdmin,
  canManageUsers,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

function parseDoiTuong(v: unknown): PhiDoiTuong | null {
  if (v === "shop" || v === "csdt") return v;
  return null;
}

/** GET /api/admin/tai-chinh/phi-thong-bao?doiTuong=shop|csdt */
export async function GET(request: Request) {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json({ error: "Thiếu service role." }, { status: 503 });
  }
  const role = await getCurrentUserSystemRole();
  if (!canManageUsers(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const doiTuong = parseDoiTuong(url.searchParams.get("doiTuong"));
  const items = await listPhiThongBaoAdmin(doiTuong);
  return NextResponse.json({
    items,
    canEdit: canGrantAdmin(role),
  });
}

/** POST — tạo nháp */
export async function POST(request: Request) {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json({ error: "Thiếu service role." }, { status: 503 });
  }
  const role = await getCurrentUserSystemRole();
  if (!canGrantAdmin(role)) {
    return NextResponse.json(
      { error: "Chỉ Admin tối cao được tạo thông báo." },
      { status: 403 },
    );
  }
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile?.id) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const doiTuong = parseDoiTuong(body.doiTuong);
  if (!doiTuong) {
    return NextResponse.json(
      { error: "doiTuong phải là shop | csdt." },
      { status: 400 },
    );
  }

  let tyLeDuKien: number | null = null;
  if (typeof body.tyLeDuKienPercent === "number" && Number.isFinite(body.tyLeDuKienPercent)) {
    tyLeDuKien = body.tyLeDuKienPercent / 100;
  } else if (typeof body.tyLeDuKien === "number" && Number.isFinite(body.tyLeDuKien)) {
    tyLeDuKien = body.tyLeDuKien;
  }

  const hieuLuc =
    typeof body.hieuLucDuKien === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.hieuLucDuKien)
      ? body.hieuLucDuKien
      : null;

  const result = await createPhiThongBao({
    doiTuong,
    tieuDe: typeof body.tieuDe === "string" ? body.tieuDe : "",
    noiDung: typeof body.noiDung === "string" ? body.noiDung : "",
    tyLeDuKien,
    hieuLucDuKien: hieuLuc,
    actorId: session.profile.id,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }
  return NextResponse.json({ item: result.item });
}

/** PATCH — sửa / công bố / huỷ */
export async function PATCH(request: Request) {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json({ error: "Thiếu service role." }, { status: 503 });
  }
  const role = await getCurrentUserSystemRole();
  if (!canGrantAdmin(role)) {
    return NextResponse.json(
      { error: "Chỉ Admin tối cao được sửa thông báo." },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) {
    return NextResponse.json({ error: "Thiếu id." }, { status: 400 });
  }

  let tyLeDuKien: number | null | undefined;
  if (body.tyLeDuKienPercent === null) {
    tyLeDuKien = null;
  } else if (
    typeof body.tyLeDuKienPercent === "number" &&
    Number.isFinite(body.tyLeDuKienPercent)
  ) {
    tyLeDuKien = body.tyLeDuKienPercent / 100;
  } else if (body.tyLeDuKien === null) {
    tyLeDuKien = null;
  } else if (typeof body.tyLeDuKien === "number" && Number.isFinite(body.tyLeDuKien)) {
    tyLeDuKien = body.tyLeDuKien;
  }

  let hieuLucDuKien: string | null | undefined;
  if (body.hieuLucDuKien === null || body.hieuLucDuKien === "") {
    hieuLucDuKien = null;
  } else if (
    typeof body.hieuLucDuKien === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(body.hieuLucDuKien)
  ) {
    hieuLucDuKien = body.hieuLucDuKien;
  }

  const trangThaiRaw = body.trangThai;
  const trangThai =
    trangThaiRaw === "nhap" ||
    trangThaiRaw === "da_cong_bo" ||
    trangThaiRaw === "huy"
      ? trangThaiRaw
      : undefined;

  const result = await updatePhiThongBao({
    id,
    tieuDe: typeof body.tieuDe === "string" ? body.tieuDe : undefined,
    noiDung: typeof body.noiDung === "string" ? body.noiDung : undefined,
    tyLeDuKien,
    hieuLucDuKien,
    trangThai,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }
  return NextResponse.json({ item: result.item });
}
