import { notFound, redirect } from "next/navigation";

import { coSoQuanLyPath } from "@/lib/to-chuc/co-so-routes";
import { hasSupabaseEnv } from "@/lib/supabase/env";

type Props = { params: Promise<{ slug: string }> };

/** Legacy: Marketing gộp vào Tổng quan (IA A). */
export default async function Page({ params }: Props) {
  if (!hasSupabaseEnv()) notFound();
  const { slug } = await params;
  redirect(coSoQuanLyPath(slug, "tong-quan"));
}
