import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_IMAGES_TOKEN;
  if (!accountId || !token) {
    return NextResponse.json(
      { error: "Thiếu CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_IMAGES_TOKEN" },
      { status: 500 },
    );
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v2/direct_upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const json = await res.json();
  if (!res.ok || !json?.success) {
    return NextResponse.json(
      { error: "Cloudflare direct upload thất bại" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    id: json.result.id as string,
    uploadURL: json.result.uploadURL as string,
  });
}
