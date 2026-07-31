import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cfImageUrl } from "@/lib/cloudflare";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, trang_thai_tai_khoan")
    .eq("slug", slug)
    .maybeSingle();

  if (!profile || profile.trang_thai_tai_khoan !== "dang_hoat_dong") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: works } = await supabase
    .from("content_tac_pham")
    .select("id, tieu_de, slug, cover_id")
    .eq("id_nguoi_dung", profile.id)
    .in("che_do_hien_thi", ["public", "feature"])
    .order("tao_luc", { ascending: false })
    .limit(50);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cins.vn";

  const feed = {
    slug: profile.slug,
    author: profile.ten_hien_thi,
    works: (works ?? []).map((w) => ({
      id: w.id,
      title: w.tieu_de,
      coverUrl: cfImageUrl(w.cover_id),
      workUrl: `${siteUrl}/@${profile.slug}/${w.slug}`,
    })),
  };

  return NextResponse.json(feed, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
