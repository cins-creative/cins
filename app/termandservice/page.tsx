import type { Metadata } from "next";

import { TermAndServiceContent } from "@/app/termandservice/TermAndServiceContent";
import { CinsShell } from "@/components/cins/CinsShell";

import "./termandservice.css";

export const metadata: Metadata = {
  title: "Điều khoản dịch vụ | Terms of Service — CINs",
  description:
    "Điều khoản dịch vụ (Terms of Service) của CINs — mạng xã hội chuyên môn cho ngành sáng tạo Việt Nam. URL công khai: https://cins.vn/termandservice",
  alternates: {
    canonical: "/termandservice",
  },
  openGraph: {
    title: "CINs Terms of Service",
    description:
      "Official Terms of Service for CINs (cins.vn) — professional social network for Vietnam’s creative industry.",
    url: "/termandservice",
    type: "website",
  },
};

export default function TermAndServicePage() {
  return (
    <CinsShell data-screen-label="Term-and-service">
      <TermAndServiceContent />
    </CinsShell>
  );
}
