import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import { isTruongOrgAdmin } from "@/lib/truong/org-admin";
import { fetchStudioJobs } from "@/lib/to-chuc/studio-tuyen-dung-queries";

type Params = Promise<{ orgId: string }>;

/** GET — danh sách tin tuyển dụng org (defer từ loader trang org). */
export async function GET(
  _request: Request,
  context: { params: Params },
) {
  const { orgId } = await context.params;
  const cleaned = orgId?.trim();
  if (!cleaned) {
    return NextResponse.json({ error: "missing orgId" }, { status: 400 });
  }

  const session = await getCurrentSessionAndProfile();
  const profileId = session?.profile?.id ?? null;
  const canEdit =
    (await getCurrentUserIsCinsAdmin()) ||
    (profileId ? await isTruongOrgAdmin(cleaned, profileId) : false);
  const jobs = await fetchStudioJobs(cleaned, canEdit);

  return NextResponse.json({ jobs });
}
