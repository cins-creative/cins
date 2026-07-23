import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { HoTroClient } from "@/app/ho-tro/HoTroClient";
import { CinsShell } from "@/components/cins/CinsShell";
import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import { listHuongDanPublic } from "@/lib/huong-dan/huong-dan";
import { huongDanHref } from "@/lib/huong-dan/slug";

import "@/styles/article-rich-content.css";

type Props = {
  params: Promise<{
    segments?: string[];
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { segments = [] } = await params;
  const nhom = segments[0];
  const path = huongDanHref(nhom ?? null);

  return {
    title: "Hướng dẫn — CINs",
    description:
      "Hướng dẫn dùng CINs theo đối tượng: người dùng, chủ shop, cơ sở đào tạo, trường đại học.",
    alternates: { canonical: path },
    openGraph: {
      title: "Hướng dẫn — CINs",
      description: "Video và nội dung hướng dẫn theo nhóm đối tượng trên CINs.",
      url: path,
      type: "website",
    },
  };
}

export const dynamic = "force-dynamic";

export default async function HoTroHuongDanPage({ params }: Props) {
  const { segments = [] } = await params;
  const nhomSlug = segments[0] ?? null;

  // URL chỉ tới nhóm; deep-link cũ `/nhom/phien` → `/nhom`.
  if (segments.length >= 2 && nhomSlug) {
    redirect(huongDanHref(nhomSlug));
  }

  const [guideCatalog, isCinsAdmin] = await Promise.all([
    listHuongDanPublic(),
    getCurrentUserIsCinsAdmin(),
  ]);

  return (
    <CinsShell data-screen-label="Ho-tro-huong-dan">
      <HoTroClient
        initialMode="guide"
        initialNhomSlug={nhomSlug}
        guideCatalog={guideCatalog}
        isCinsAdmin={isCinsAdmin}
      />
    </CinsShell>
  );
}
