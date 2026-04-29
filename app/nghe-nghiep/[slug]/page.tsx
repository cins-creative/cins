import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CareerDetailView } from "@/components/career/CareerDetailView";
import { CinsShell } from "@/components/cins/CinsShell";
import { SiteFooter } from "@/components/cins/SiteFooter";
import {
  getKyNangByIds,
  getLinhVucByIds,
  getNgheNghiepBySlug,
  getRelatedCareers,
} from "@/lib/career/queries";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const nghe = await getNgheNghiepBySlug(slug);
  if (!nghe) {
    return { title: "Không tìm thấy | CINs" };
  }
  const title =
    nghe.meta_title?.trim() ||
    `${nghe.title_eng ?? slug} là gì? | CINs`;
  const description =
    nghe.meta_description?.trim() ||
    nghe.short_description ||
    undefined;
  return {
    title,
    description,
    openGraph: {
      title: nghe.meta_title || nghe.title_eng || undefined,
      description,
      images: nghe.thumbnail_mascot ? [nghe.thumbnail_mascot] : [],
    },
  };
}

export default async function NgheNghiepDetailPage({ params }: Props) {
  const { slug } = await params;
  const nghe = await getNgheNghiepBySlug(slug);
  if (!nghe) {
    notFound();
  }

  const relatedIds = nghe.nghe_nghiep_id ?? [];
  const skillIds = nghe.skill_id ?? [];
  const linhIds = nghe.linh_vuc_id ?? [];

  const [related, skills, linhVucs] = await Promise.all([
    getRelatedCareers(relatedIds),
    getKyNangByIds(skillIds),
    getLinhVucByIds(linhIds),
  ]);

  return (
    <CinsShell data-screen-label={`Nghe-nghiep-${slug}`}>
      <CareerDetailView
        nghe={nghe}
        linhVucs={linhVucs}
        related={related}
        skills={skills}
      />
      <SiteFooter />
    </CinsShell>
  );
}
