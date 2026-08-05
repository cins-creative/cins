import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ChatPageClient } from "@/components/cins/ChatPageClient";
import { CinsShell } from "@/components/cins/CinsShell";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Tin nhắn · CINs",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    redirect("/login?next=/chat");
  }

  return (
    <CinsShell data-screen-label="Tin-nhan" className="cins-shell--chat-page">
      <ChatPageClient />
    </CinsShell>
  );
}
