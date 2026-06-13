"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";

import type { PendingFollowRequest } from "@/lib/social/types";

type Props = {
  requests: ReadonlyArray<PendingFollowRequest>;
};

function dispatchNotificationsChanged() {
  window.dispatchEvent(new Event("cins:notifications-changed"));
}

function RequestAvatar({ request }: { request: PendingFollowRequest }) {
  const initial = (request.tenHienThi || request.slug || "?").slice(0, 1).toUpperCase();
  return (
    <span className="j-pending-avatar" aria-hidden>
      {request.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={request.avatarUrl} alt="" />
      ) : (
        <span>{initial}</span>
      )}
    </span>
  );
}

export function JourneyFollowRequestBanner({ requests }: Props) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [errors, setErrors] = useState<Map<string, string>>(() => new Map());
  const [pending, startTransition] = useTransition();

  const visibleRequests = useMemo(
    () => requests.filter((req) => !dismissedIds.has(req.idNguoiDung)),
    [dismissedIds, requests],
  );

  const respond = useCallback(
    (request: PendingFollowRequest, action: "accept" | "decline") => {
      const recordId = request.ketBanId;
      if (!recordId) {
        setErrors((prev) => {
          const next = new Map(prev);
          next.set(request.idNguoiDung, "Không tìm thấy lời mời.");
          return next;
        });
        return;
      }
      startTransition(async () => {
        setErrors((prev) => {
          const next = new Map(prev);
          next.delete(request.idNguoiDung);
          return next;
        });
        const res = await fetch(`/api/ket-ban/${recordId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErrors((prev) => {
            const next = new Map(prev);
            next.set(
              request.idNguoiDung,
              typeof json.error === "string" ? json.error : "Không xử lý được.",
            );
            return next;
          });
          return;
        }
        setDismissedIds((prev) => new Set(prev).add(request.idNguoiDung));
        dispatchNotificationsChanged();
      });
    },
    [],
  );

  if (visibleRequests.length === 0) return null;

  return (
    <div className="j-coauthor-pending-stack j-follow-request-stack" aria-live="polite">
      {visibleRequests.map((request) => {
        const error = errors.get(request.idNguoiDung);
        return (
          <div key={request.idNguoiDung} className="j-coauthor-pending j-follow-request-pending">
            <div className="j-coauthor-pending-body j-follow-request-body">
              <RequestAvatar request={request} />
              <p className="j-coauthor-pending-message">
                <strong>{request.tenHienThi}</strong> muốn kết nối với bạn.
                <span className="j-follow-request-slug">@{request.slug}</span>
              </p>
            </div>
            <div className="j-coauthor-pending-actions">
              <Link
                href={`/${request.slug}`}
                className="j-coauthor-pending-btn is-view"
              >
                Xem hồ sơ
              </Link>
              <button
                type="button"
                className="j-coauthor-pending-btn is-accept"
                disabled={pending}
                onClick={() => respond(request, "accept")}
              >
                Chấp nhận
              </button>
              <button
                type="button"
                className="j-coauthor-pending-btn is-decline"
                disabled={pending}
                onClick={() => respond(request, "decline")}
              >
                Từ chối
              </button>
              {error ? <p className="j-coauthor-pending-error">{error}</p> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
