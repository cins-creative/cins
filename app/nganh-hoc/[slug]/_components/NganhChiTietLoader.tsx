import { NganhChiTietPageShell } from "@/components/nganh/NganhChiTietPageShell";
import { CinsShell } from "@/components/cins/CinsShell";
import { SiteFooter } from "@/components/cins/SiteFooter";
import { getNganhAdminStatus } from "@/lib/nganh/article-admin";
import { getNganhDetailBySlugCached } from "@/lib/nganh/nganh-page-queries";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";
import { notFound } from "next/navigation";

type Props = {
  slug: string;
};

export async function NganhChiTietLoader({ slug }: Props) {
  const bundle = await getNganhDetailBySlugCached(slug);
  if (!bundle) notFound();

  const [canEdit, persistEnabled] = await Promise.all([
    getNganhAdminStatus(slug),
    Promise.resolve(hasServiceRoleEnv()),
  ]);

  return (
    <CinsShell data-screen-label="Nganh-chi-tiet">
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
      />
      <SiteFooter />
    </CinsShell>
  );
}
