import Link from "next/link";
import { notFound } from "next/navigation";

import { ChatGroupInviteClient } from "@/components/cins/ChatGroupInviteClient";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getGroupInvitePreview } from "@/lib/chat/group-invite";

type PageProps = {
  params: Promise<{ ma: string }>;
};

export default async function ChatGroupInvitePage({ params }: PageProps) {
  const { ma } = await params;
  const decoded = decodeURIComponent(ma?.trim() || "");
  if (!decoded) notFound();

  const session = await getCurrentSessionAndProfile();
  const result = await getGroupInvitePreview(
    decoded,
    session?.profile?.id ?? null,
  );

  if (!result.ok) {
    return (
      <main className="cins-chat-invite-page">
        <div className="cins-chat-invite-card">
          <h1>Link mời không hợp lệ</h1>
          <p>{result.error}</p>
          <Link href="/" className="cins-chat-invite-home">
            Về trang chủ
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="cins-chat-invite-page">
      <ChatGroupInviteClient
        maMoi={decoded}
        initialPreview={result.preview}
        isLoggedIn={Boolean(session?.profile)}
      />
    </main>
  );
}
