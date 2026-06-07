import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { createTag } from "@/lib/tag/create";

export async function POST(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  let body: { ten?: string; loai?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const ten = typeof body.ten === "string" ? body.ten : "";
  const loai = body.loai;

  if (loai !== "keyword" && loai !== "phan_mem") {
    return NextResponse.json(
      { error: "loai phải là keyword hoặc phan_mem." },
      { status: 400 },
    );
  }

  const result = await createTag({ ten, loai });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    id: result.id,
    da_ton_tai: result.da_ton_tai,
  });
}
