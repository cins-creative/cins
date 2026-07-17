import { NextResponse } from "next/server";

import {
  canManageUsers,
  getCurrentUserProfileId,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";
import { respondAdminOrgMilestoneTagRequest } from "@/lib/journey/org-milestone-tag";

type RouteContext = {
  params: Promise<{ requestId: string }>;
};

/** PATCH /api/admin/content-verifications/:requestId — approve | reject */
export async function PATCH(request: Request, context: RouteContext) {
  const role = await getCurrentUserSystemRole();
  if (!canManageUsers(role)) {
    return NextResponse.json({ error: "Không có quyền duyệt." }, { status: 403 });
  }

  const profileId = await getCurrentUserProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body JSON không hợp lệ." },
      { status: 400 },
    );
  }

  const rec =
    body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : null;
  const action = rec?.action;
  const orgId = typeof rec?.orgId === "string" ? rec.orgId.trim() : "";
  if ((action !== "approve" && action !== "reject") || !orgId) {
    return NextResponse.json(
      { error: "Thiếu tổ chức hoặc thao tác không hợp lệ." },
      { status: 400 },
    );
  }

  const { requestId } = await context.params;
  if (!requestId.trim()) {
    return NextResponse.json({ error: "Thiếu mã yêu cầu." }, { status: 400 });
  }

  const result = await respondAdminOrgMilestoneTagRequest({
    orgId,
    requestId,
    viewerId: profileId,
    action,
  });

  if (!result.ok) {
    const status = result.error.includes("Không tìm thấy") ? 404 : 422;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
