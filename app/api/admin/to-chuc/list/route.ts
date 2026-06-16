import { NextResponse } from "next/server";

import { fetchAdminToChucList } from "@/lib/admin/to-chuc-list";
import { parseAdminToChucListParams } from "@/lib/admin/to-chuc-types";
import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";

export async function GET(req: Request) {
  const isAdmin = await getCurrentUserIsCinsAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  const url = new URL(req.url);
  const params = parseAdminToChucListParams(url.searchParams);
  const data = await fetchAdminToChucList(params);
  return NextResponse.json(data);
}
