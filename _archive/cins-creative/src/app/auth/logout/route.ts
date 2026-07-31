import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next") ?? "/studio";

  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL(next, request.url), {
    status: 303,
  });
}
