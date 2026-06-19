import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { CinsShell } from "@/components/cins/CinsShell";
import { CinsHomeV2Page } from "@/components/cins/home-v2/CinsHomeV2Page";
import { HomeWorldJourneyMain } from "@/components/cins/home-v2/HomeWorldJourneyMain";
import { AuthGateRoot } from "@/components/auth/AuthGateProvider";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { injectHomeSidebarNav } from "@/lib/cins/homeSidebarNav";

import "@/app/login/login.css";

export const metadata: Metadata = {
  title: "CINs — Khám phá ngành sáng tạo thị giác tại Việt Nam",
  description:
    "120+ nghề sáng tạo thị giác, sự kiện tuyển sinh, trường ĐH, khoá học và lịch open day — CINs.",
};

export default async function Home() {
  const session = await getCurrentSessionAndProfile();
  const raw = await readFile(
    path.join(
      process.cwd(),
      "components/cins/home-v2/home-v2-body.html",
    ),
    "utf8",
  );
  const guestMarkup = injectHomeSidebarNav(raw);

  if (session?.profile?.slug) {
    return (
      <CinsShell data-screen-label="Trang-chu">
        <AuthGateRoot initialAuthenticated>
          <HomeWorldJourneyMain />
        </AuthGateRoot>
      </CinsShell>
    );
  }

  return <CinsHomeV2Page guestMarkup={guestMarkup} />;
}
