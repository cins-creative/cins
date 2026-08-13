import { NganhChiTietPageShell } from "@/components/nganh/NganhChiTietPageShell";
import { NganhSeoJsonLd } from "@/components/nganh/NganhSeoJsonLd";
import { CinsShell } from "@/components/cins/CinsShell";
import { SiteFooter } from "@/components/cins/SiteFooter";
import { getNganhAdminStatus } from "@/lib/nganh/article-admin";
import { getNganhDetailBySlugCached } from "@/lib/nganh/nganh-page-queries";
import { listCongDongOrgsForArticle } from "@/lib/cong-dong/categories";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";
import { notFound } from "next/navigation";

type Props = {
  slug: string;
};

export async function NganhChiTietLoader({ slug }: Props) {
  const bundle = await getNganhDetailBySlugCached(slug);
  if (!bundle) notFound();

  const [canEdit, persistEnabled, congDong] = await Promise.all([
    getNganhAdminStatus(slug),
    Promise.resolve(hasServiceRoleEnv()),
    listCongDongOrgsForArticle(bundle.article.id, 12),
  ]);

  return (
    <CinsShell data-screen-label="Nganh-chi-tiet">
      <NganhSeoJsonLd article={bundle.article} />
      <NganhChiTietPageShell
        canEdit={canEdit}
        persistEnabled={persistEnabled}
        article={bundle.article}
        parsed={bundle.parsed}
        monHoc={bundle.monHoc}
        nghe={bundle.nghe}
        truong={bundle.truong}
        khoiThiLabels={bundle.khoiThiLabels}
        lienQuan={bundle.lienQuan}
        soTruong={bundle.soTruong}
        congDong={congDong}
      />
      <SiteFooter />
    </CinsShell>
  );
}
