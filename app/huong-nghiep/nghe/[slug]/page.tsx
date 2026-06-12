import { redirect } from "next/navigation";

import { ngheNghiepDetailHref } from "@/lib/cins/hubPaths";

type Props = { params: Promise<{ slug: string }> };

/** Alias `/huong-nghiep/nghe/[slug]` → canonical `/nghe-nghiep/[slug]`. */
export default async function HuongNghiepNgheRedirect({ params }: Props) {
  const { slug } = await params;
  redirect(ngheNghiepDetailHref(slug));
}
