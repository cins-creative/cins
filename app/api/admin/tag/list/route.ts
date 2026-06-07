import { NextResponse } from "next/server";

import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import {
  fetchAdminTagList,
  parseAdminTagListSearchParams,
} from "@/lib/tag/admin-list";

export async function GET(req: Request) {
  const isAdmin = await getCurrentUserIsCinsAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  const url = new URL(req.url);
  const params = parseAdminTagListSearchParams(url.searchParams);
  const data = await fetchAdminTagList(params);
  return NextResponse.json(data);
}
