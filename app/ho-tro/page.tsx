import type { Metadata } from "next";

import { HoTroClient } from "@/app/ho-tro/HoTroClient";
import { CinsShell } from "@/components/cins/CinsShell";
import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import { listHuongDanPublic } from "@/lib/huong-dan/huong-dan";

import "@/styles/article-rich-content.css";

export const metadata: Metadata = {
  title: "Trợ giúp — CINs",
  description:
    "Câu hỏi thường gặp, sự khác biệt của CINs, đưa bài lên top, hỗ trợ tài khoản và liên hệ đội ngũ CINs.",
  alternates: {
    canonical: "/ho-tro",
  },
  openGraph: {
    title: "Trợ giúp — CINs",
    description:
      "FAQ, hỗ trợ tài khoản, xếp hạng World Timeline và liên hệ CINs.",
    url: "/ho-tro",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function HoTroPage() {
  const [guideCatalog, isCinsAdmin] = await Promise.all([
    listHuongDanPublic(),
    getCurrentUserIsCinsAdmin(),
  ]);
  return (
    <CinsShell data-screen-label="Ho-tro">
      <HoTroClient
        initialMode="help"
        guideCatalog={guideCatalog}
        isCinsAdmin={isCinsAdmin}
      />
    </CinsShell>
  );
}
