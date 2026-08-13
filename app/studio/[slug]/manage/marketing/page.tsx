import { redirect } from "next/navigation";

import { orgQuanLyPath } from "@/lib/to-chuc/org-quan-ly-routes";

type Props = { params: Promise<{ slug: string }> };

/** «Marketing» tạm nhường chỗ cho Tuyển dụng; giữ route để link cũ không vỡ. */
export default async function StudioQuanLyMarketingPage({ params }: Props) {
  const { slug } = await params;
  redirect(orgQuanLyPath("studio", slug, "tuyen-dung"));
}
