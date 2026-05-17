import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NganhChiTietView } from "@/components/nganh/NganhChiTietView";
import { CinsShell } from "@/components/cins/CinsShell";
import { SiteFooter } from "@/components/cins/SiteFooter";
import { getNganhDetailBySlug } from "@/lib/nganh/queries";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const bundle = await getNganhDetailBySlug(slug);
  if (!bundle) {
    return { title: "Không tìm thấy ngành | CINs" };
  }
  const title =
    bundle.article.tieu_de_viet?.trim() ||
    bundle.article.tieu_de?.trim() ||
    "Ngành đào tạo";
  const desc =
    bundle.article.tom_tat?.trim() ||
    `Thông tin ngành ${title} — mã ngành, khối thi, môn học và trường đào tạo trên CINs.`;
  return {
    title: `${title} — Ngành đào tạo | CINs`,
    description: desc,
  };
}

export default async function NganhChiTietPage({ params }: Props) {
  const { slug } = await params;
  const bundle = await getNganhDetailBySlug(slug);
  if (!bundle) notFound();

  return (
    <CinsShell data-screen-label="Nganh-chi-tiet">
      <NganhChiTietView
        article={bundle.article}
        parsed={bundle.parsed}
        monHoc={bundle.monHoc}
        nghe={bundle.nghe}
        khoiThiLabels={bundle.khoiThiLabels}
        lienQuan={bundle.lienQuan}
        soTruong={bundle.soTruong}
      />
      <SiteFooter />
    </CinsShell>
  );
}
