import { redirect } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

/** Alias route from brief → canonical `/majors/[slug]`. */
export default async function HuongNghiepNganhRedirect({ params }: Props) {
  const { slug } = await params;
  redirect(`/majors/${encodeURIComponent(slug)}`);
}
