import type { Metadata } from "next";

import { HoTroClient } from "@/app/support/HoTroClient";
import { CinsShell } from "@/components/cins/CinsShell";

import "@/styles/article-rich-content.css";

export const metadata: Metadata = {
  title: "Trợ giúp — CINs",
  description:
    "Câu hỏi thường gặp, sự khác biệt của CINs, đưa bài lên top, hỗ trợ tài khoản và liên hệ đội ngũ CINs.",
  alternates: {
    canonical: "/support",
  },
  openGraph: {
    title: "Trợ giúp — CINs",
    description:
      "FAQ, hỗ trợ tài khoản, xếp hạng World Timeline và liên hệ CINs.",
    url: "/support",
    type: "website",
  },
};

export default function HoTroPage() {
  return (
    <CinsShell data-screen-label="Ho-tro">
      <HoTroClient initialMode="help" />
    </CinsShell>
  );
}
