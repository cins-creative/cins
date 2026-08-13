"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import type { CallWindowSession } from "@/lib/media/call-window";
import {
  clearCallWindowSession,
  readCallWindowSession,
  subscribeCallWindowSession,
} from "@/lib/media/call-window";
import "@/components/media/phong-hoc.css";

const PhongHocMeeting = dynamic(
  () =>
    import("@/components/media/PhongHocMeeting").then((m) => m.PhongHocMeeting),
  { ssr: false },
);

function CallTabInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sid = searchParams.get("sid")?.trim() || "";
  const [session, setSession] = useState<CallWindowSession | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!sid) {
      setMissing(true);
      return;
    }
    const initial = readCallWindowSession(sid);
    if (initial) {
      setSession(initial);
    } else {
      setMissing(true);
    }
    return subscribeCallWindowSession(sid, (next) => {
      setSession(next);
      setMissing(false);
    });
  }, [sid]);

  useEffect(() => {
    document.title = session?.title
      ? `Gọi · ${session.title}`
      : "Cuộc gọi · CINs";
  }, [session?.title]);

  if (missing && !session) {
    return (
      <main className="cins-call-tab">
        <div className="cins-call-tab-empty">
          <p>Không tìm thấy phiên gọi.</p>
          <button
            type="button"
            className="cins-call-tab-back"
            onClick={() => {
              if (window.opener && !window.opener.closed) {
                window.close();
                return;
              }
              router.replace("/");
            }}
          >
            Đóng
          </button>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="cins-call-tab">
        <div className="cins-call-tab-empty">
          <p>Đang mở cuộc gọi…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="cins-call-tab">
      <PhongHocMeeting
        authToken={session.token}
        mode={session.mode}
        title={session.title}
        roomId={session.roomId}
        callMessageId={session.callMessageId}
        onClose={() => {
          clearCallWindowSession(sid);
          if (window.opener && !window.opener.closed) {
            window.close();
            return;
          }
          router.replace("/");
        }}
      />
    </main>
  );
}

export default function ChatGoiPage() {
  return (
    <Suspense
      fallback={
        <main className="cins-call-tab">
          <div className="cins-call-tab-empty">
            <p>Đang mở cuộc gọi…</p>
          </div>
        </main>
      }
    >
      <CallTabInner />
    </Suspense>
  );
}
