import type { Metadata } from "next";

import { HoTroClient } from "@/app/ho-tro/HoTroClient";
import { CinsShell } from "@/components/cins/CinsShell";

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

export default function HoTroPage() {
  return (
    <CinsShell data-screen-label="Ho-tro">
      <HoTroClient />
    </CinsShell>
  );
}
