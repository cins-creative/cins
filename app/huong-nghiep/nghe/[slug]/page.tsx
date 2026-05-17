import { redirect } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

/** Alias `/huong-nghiep/nghe/[slug]` → canonical `/nghe-nghiep/[slug]`. */
export default async function HuongNghiepNgheRedirect({ params }: Props) {
  const { slug } = await params;
  redirect(`/nghe-nghiep/${encodeURIComponent(slug)}`);
}
