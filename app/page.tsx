import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { CinsHomeV2Page } from "@/components/cins/home-v2/CinsHomeV2Page";
import { injectHomeSidebarNav } from "@/lib/cins/homeSidebarNav";

export const metadata: Metadata = {
  title: "CINs — Khám phá ngành sáng tạo thị giác tại Việt Nam",
  description:
    "120+ nghề sáng tạo thị giác, sự kiện tuyển sinh, trường ĐH, khoá học và lịch open day — CINs.",
};

export default async function Home() {
  const raw = await readFile(
    path.join(
      process.cwd(),
      "components/cins/home-v2/home-v2-body.html",
    ),
    "utf8",
  );
  const markup = injectHomeSidebarNav(raw);

  return <CinsHomeV2Page markup={markup} />;
}
