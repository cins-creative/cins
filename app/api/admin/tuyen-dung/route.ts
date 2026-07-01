import { NextResponse } from "next/server";

import { adminUpdateTuyenDungDistribution } from "@/lib/admin/tuyen-dung-admin";
import { getCurrentUserSystemRole, canEditContent } from "@/lib/auth/system-role";
import { fetchAdminTuyenDungJobs } from "@/lib/cins/home-adaptive/co-hoi";
import type { GiaiDoan } from "@/lib/cins/home-adaptive/persona";

/** GET /api/admin/tuyen-dung — danh sách tin + org (admin nội dung). */
export async function GET() {
  const role = await getCurrentUserSystemRole();
  if (!canEditContent(role)) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }
  const jobs = await fetchAdminTuyenDungJobs();
  return NextResponse.json({ jobs });
}

/** PATCH /api/admin/tuyen-dung — cập nhật phân phối module Cơ hội. */
export async function PATCH(req: Request) {
  const role = await getCurrentUserSystemRole();
  if (!canEditContent(role)) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  let body: {
    jobId?: string;
    hienThiCoHoi?: boolean;
    giaiDoanMucTieu?: GiaiDoan[];
  } | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const jobId = body?.jobId?.trim();
  if (!jobId) {
    return NextResponse.json({ error: "Thiếu jobId." }, { status: 400 });
  }

  const result = await adminUpdateTuyenDungDistribution(jobId, {
    hienThiCoHoi: body?.hienThiCoHoi,
    giaiDoanMucTieu: body?.giaiDoanMucTieu,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, job: result.job });
}
