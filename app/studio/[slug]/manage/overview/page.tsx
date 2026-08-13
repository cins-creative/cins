import { redirect } from "next/navigation";

import { orgQuanLyPath } from "@/lib/to-chuc/org-quan-ly-routes";

type Props = { params: Promise<{ slug: string }> };

/** Legacy `/manage/overview` → `/manage/info` (bỏ tab Tổng quan). */
export default async function StudioQuanLyTongQuanPage({ params }: Props) {
  const { slug } = await params;
  redirect(orgQuanLyPath("studio", slug, "thong-tin"));
}
