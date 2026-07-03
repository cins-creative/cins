"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Props = {
  /** Server render ra trạng thái khách NHƯNG kho còn tài khoản + hint bật. */
  canRestore: boolean;
};

/**
 * Bootstrap khôi phục phiên: khi server render ra trạng thái khách mà kho vẫn
 * còn tài khoản (hint bật), gọi `/api/auth/restore` đúng MỘT lần để dựng lại
 * phiên tài khoản mặc định, rồi `router.refresh()` để render lại đã đăng nhập.
 *
 * Không render gì.
 */
export function SessionRestorer({ canRestore }: Props) {
  const router = useRouter();
  const triedRef = useRef(false);

  useEffect(() => {
    if (!canRestore || triedRef.current) return;
    triedRef.current = true;

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/restore", {
          method: "POST",
          credentials: "same-origin",
        });
        const json = (await res.json().catch(() => null)) as {
          restored?: boolean;
        } | null;
        if (!cancelled && json?.restored) {
          router.refresh();
        }
      } catch {
        /* Mất mạng / lỗi → cứ để trạng thái khách. */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canRestore, router]);

  return null;
}
