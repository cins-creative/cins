import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { loadTagSuggestIndex } from "@/lib/tag/suggest-index-server";

export async function GET() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  try {
    const rows = await loadTagSuggestIndex();
    return NextResponse.json(
      { rows },
      {
        headers: {
          "Cache-Control": "private, max-age=60",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { rows: [] },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, max-age=10",
        },
      },
    );
  }
}
