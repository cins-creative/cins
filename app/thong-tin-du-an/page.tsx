import type { Metadata } from "next";

import { ThongTinDuAnHub } from "@/app/thong-tin-du-an/ThongTinDuAnHub";
import { CinsShell } from "@/components/cins/CinsShell";

import "@/app/thong-tin-du-an.css";

export const metadata: Metadata = {
  title: "CINs — Thông tin dự án",
  description:
    "Hồ sơ sự nghiệp đã xác thực cho ngành sáng tạo Việt Nam — tầm nhìn, vấn đề, giải pháp và mô hình kinh doanh CINs.",
};

export default function ThongTinDuAnPage() {
  return (
    <CinsShell data-screen-label="Thong-tin-du-an">
      <ThongTinDuAnHub />
    </CinsShell>
  );
}