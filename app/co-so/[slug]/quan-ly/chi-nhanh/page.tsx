import { redirect, notFound } from "next/navigation";

import { hasSupabaseEnv } from "@/lib/supabase/env";
import { coSoQuanLyPath } from "@/lib/to-chuc/co-so-routes";

type Props = { params: Promise<{ slug: string }> };

/** Legacy `/quan-ly/chi-nhanh` → gom vào `/quan-ly/co-so`. */
export default async function Page({ params }: Props) {
  if (!hasSupabaseEnv()) notFound();
  const { slug } = await params;
  redirect(coSoQuanLyPath(slug, "co-so"));
}
