import { redirect } from "next/navigation";

import { orgQuanLyPath } from "@/lib/to-chuc/org-quan-ly-routes";

type Props = { params: Promise<{ slug: string }> };

/** `/co-so-dao-tao/[slug]/quan-ly` → tin-nhan. */
export default async function TruongQuanLyIndexPage({ params }: Props) {
  const { slug } = await params;
  redirect(orgQuanLyPath("truong_dai_hoc", slug, "tin-nhan"));
}
