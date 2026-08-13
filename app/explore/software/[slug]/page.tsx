import { permanentRedirect } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

/** Legacy URL → `/software/[slug]` */
export default async function KhamPhaSoftwareRedirect({ params }: Props) {
  const { slug } = await params;
  permanentRedirect(`/software/${encodeURIComponent(slug)}`);
}
