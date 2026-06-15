import { NextResponse } from "next/server";

import { fetchUserOrganizationsPage } from "@/lib/journey/user-orgs-fetch";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type Params = Promise<{ slug: string }>;

export async function GET(_request: Request, context: { params: Params }) {
  const { slug } = await context.params;

  const admin = createServiceRoleClient();
  const { data: owner, error } = await admin
    .from("user_nguoi_dung")
    .select("id, giai_doan")
    .eq("slug", slug)
    .maybeSingle<{ id: string; giai_doan: string | null }>();

  if (error || !owner || owner.giai_doan === null) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const page = await fetchUserOrganizationsPage(owner.id);
  return NextResponse.json(page);
}
