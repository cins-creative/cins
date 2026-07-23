import type { Metadata } from "next";

import { HoTroClient } from "@/app/ho-tro/HoTroClient";
import { CinsShell } from "@/components/cins/CinsShell";
import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import { listHuongDanPublic } from "@/lib/huong-dan/huong-dan";

import "@/styles/article-rich-content.css";

type Props = {
  params: Promise<{
    segments?: string[];
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { segments = [] } = await params;
  const [nhom, phien] = segments;
  const path = phien
    ? `/ho-tro/huong-dan/${nhom}/${phien}`
    : nhom
      ? `/ho-tro/huong-dan/${nhom}`
      : "/ho-tro/huong-dan";

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
  const [nhomSlug = null, phienSlug = null] = segments;
  const [guideCatalog, isCinsAdmin] = await Promise.all([
    listHuongDanPublic(),
    getCurrentUserIsCinsAdmin(),
  ]);

  return (
    <CinsShell data-screen-label="Ho-tro-huong-dan">
      <HoTroClient
        initialMode="guide"
        initialNhomSlug={nhomSlug}
        initialPhienSlug={phienSlug}
        guideCatalog={guideCatalog}
        isCinsAdmin={isCinsAdmin}
      />
    </CinsShell>
  );
}
