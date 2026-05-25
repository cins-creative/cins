import type { Metadata } from "next";

import { notFound, permanentRedirect } from "next/navigation";



import { SoftwareArticleView } from "@/components/article/software/SoftwareArticleView";

import { SoftwareArticlePageShell } from "@/components/article/software/SoftwareArticlePageShell";

import { CinsShell } from "@/components/cins/CinsShell";

import { SiteFooter } from "@/components/cins/SiteFooter";

import {

  fetchRelatedArticles,

  getArticleById,

  getPhanMemArticleBySlug,

} from "@/lib/articles/queries";

import { getSoftwareAdminStatus } from "@/lib/articles/software-admin";

import { hasSupabaseEnv } from "@/lib/supabase/server";

import { hasServiceRoleEnv } from "@/lib/supabase/service-role";



export const dynamic = "force-dynamic";



type Props = {

  params: Promise<{ slug: string }>;

};



export async function generateMetadata({ params }: Props): Promise<Metadata> {

  const { slug } = await params;

  if (!hasSupabaseEnv()) {

    return { title: "Phần mềm | CINs" };

  }

  const article = await getPhanMemArticleBySlug(slug);

  if (!article) {

    return { title: "Không tìm thấy | CINs" };

  }

  const title =

    article.meta_title?.trim() ||

    `${article.tieu_de_viet?.trim() || article.tieu_de} | CINs`;

  const description =

    article.meta_description?.trim() || article.tom_tat?.trim() || undefined;

  return { title, description };

}



export default async function SoftwareDetailPage({ params }: Props) {

  const { slug } = await params;



  if (!hasSupabaseEnv()) {

    notFound();

  }



  const article = await getPhanMemArticleBySlug(slug);

  if (!article) {

    notFound();

  }



  if (article.trang_thai_noi_dung === "merged" && article.merged_vao_id) {

    const target = await getArticleById(article.merged_vao_id);

    if (target?.slug) {

      permanentRedirect(`/software/${encodeURIComponent(target.slug)}`);

    }

    notFound();

  }



  const lienQuan = await fetchRelatedArticles(article.id);



  const canEdit = await getSoftwareAdminStatus(slug);

  const persistEnabled = hasServiceRoleEnv();

  const resetKey = `${article.id}-${article.cap_nhat_luc}`;



  return (

    <CinsShell data-screen-label={`Software-${slug}`}>

      <SoftwareArticlePageShell

        canEdit={canEdit}

        persistEnabled={persistEnabled}

        article={article}

        resetKey={resetKey}

      >

        <SoftwareArticleView article={article} lienQuan={lienQuan} />

      </SoftwareArticlePageShell>

      <SiteFooter />

    </CinsShell>

  );

}

