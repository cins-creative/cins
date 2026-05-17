import { redirect } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

/** Alias route from brief → canonical `/nganh-hoc/[slug]`. */
export default async function HuongNghiepNganhRedirect({ params }: Props) {
  const { slug } = await params;
  redirect(`/nganh-hoc/${encodeURIComponent(slug)}`);
}
