import { permanentRedirect } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

/** Legacy URL → `/keyword/[slug]` */
export default async function KhamPhaKeywordRedirect({ params }: Props) {
  const { slug } = await params;
  permanentRedirect(`/keyword/${encodeURIComponent(slug)}`);
}
