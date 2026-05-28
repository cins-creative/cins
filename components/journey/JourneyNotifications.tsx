"use client";

import Link from "next/link";
import { Bell, Check, ExternalLink, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import type {
  FollowAcceptedNotification,
  PendingFollowRequest,
} from "@/lib/social/types";

type Props = {
  initialFollowRequests: ReadonlyArray<PendingFollowRequest>;
  initialAcceptedNotifications?: ReadonlyArray<FollowAcceptedNotification>;
};

export function JourneyNotifications({
  initialFollowRequests,
  initialAcceptedNotifications = [],
}: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<PendingFollowRequest | null>(null);
  const [requests, setRequests] = useState<PendingFollowRequest[]>(
    [...initialFollowRequests],
  );
  const [accepted, setAccepted] = useState<FollowAcceptedNotification[]>(
    [...initialAcceptedNotifications],
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const count = requests.length + accepted.length;
  const title = count > 0 ? `${count} thông báo mới` : "Không có thông báo mới";
  const selectedStillPending = useMemo(
    () => selected && requests.some((r) => r.idNguoiDung === selected.idNguoiDung),
    [requests, selected],
  );

  const respond = (request: PendingFollowRequest, action: "accept" | "decline") => {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/follow/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_nguoi_dung: request.idNguoiDung,
          action,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Không xử lý được.");
        return;
      }
      const next = Array.isArray(json.requests)
        ? (json.requests as PendingFollowRequest[])
        : requests.filter((r) => r.idNguoiDung !== request.idNguoiDung);
      setRequests(next);
      if (Array.isArray(json.accepted)) {
        setAccepted(json.accepted as FollowAcceptedNotification[]);
      }
      setSelected(null);
    });
  };

  return (
    <div className="j-notify">
      <button
        type="button"
        className={`j-notify-trigger${count > 0 ? " has-unread" : ""}`}
        aria-expanded={open}
        aria-label={title}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={16} strokeWidth={1.9} aria-hidden />
        {count > 0 ? <span className="j-notify-count">{count}</span> : null}
      </button>

      {open ? (
        <div className="j-notify-menu">
          <div className="j-notify-head">
            <strong>Thông báo</strong>
            <span>{count} mới</span>
          </div>
          {count === 0 ? (
            <p className="j-notify-empty">Chưa có lời mời kết nối mới.</p>
          ) : (
            <ul className="j-notify-list">
              {accepted.map((notice) => (
                <li key={notice.notificationId}>
                  <Link
                    href={`/${notice.slug}`}
                    className="j-notify-item is-accepted"
                  >
                    <Avatar request={notice} />
                    <span>
                      <strong>{notice.tenHienThi}</strong> đã chấp nhận kết bạn.
                      <small>@{notice.slug}</small>
                    </span>
                  </Link>
                </li>
              ))}
              {requests.map((request) => (
                <li key={request.idNguoiDung}>
                  <button
                    type="button"
                    className="j-notify-item"
                    onClick={() => setSelected(request)}
                  >
                    <Avatar request={request} />
                    <span>
                      <strong>{request.tenHienThi}</strong> muốn kết nối với bạn.
                      <small>@{request.slug}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {error ? (
            <p className="j-notify-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}

      {selected ? (
        <div
          className="j-notify-modal-backdrop"
          role="presentation"
          onClick={() => setSelected(null)}
        >
          <div
            className="j-notify-modal j-notify-profile-card"
            role="dialog"
            aria-modal="true"
            aria-label={`Thông tin ${selected.tenHienThi}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="j-notify-modal-close"
              aria-label="Đóng"
              onClick={() => setSelected(null)}
            >
              <X size={16} aria-hidden />
            </button>
            <div
              className={`j-notify-cover${selected.coverUrl ? " has-img" : ""}`}
              aria-hidden
            >
              {selected.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.coverUrl} alt="" />
              ) : (
                <span />
              )}
            </div>
            <div className="j-notify-profile-main">
              <Avatar request={selected} large />
              <div className="j-notify-profile-title">
                <h2>{selected.tenHienThi}</h2>
                <p className="j-notify-modal-slug">@{selected.slug}</p>
              </div>
            </div>
            <div className="j-notify-stats" aria-label="Tổng quan hồ sơ">
              <span>
                <strong>{selected.stats.cotMoc}</strong>
                Cột mốc
              </span>
              <span>
                <strong>{selected.stats.tacPham}</strong>
                Tác phẩm
              </span>
              <span>
                <strong>{selected.stats.banBe}</strong>
                Bạn bè
              </span>
              <span>
                <strong>{selected.stats.toChucXacThuc}</strong>
                Xác thực
              </span>
            </div>
            {selected.bio ? <p className="j-notify-modal-bio">{selected.bio}</p> : null}
            <dl className="j-notify-modal-meta">
              {selected.giaiDoan ? (
                <div>
                  <dt>Giai đoạn</dt>
                  <dd>{selected.giaiDoan}</dd>
                </div>
              ) : null}
              {selected.tinhThanh ? (
                <div>
                  <dt>Khu vực</dt>
                  <dd>{selected.tinhThanh}</dd>
                </div>
              ) : null}
            </dl>
            <div className="j-notify-modal-actions">
              {selectedStillPending ? (
                <>
                  <button
                    type="button"
                    className="j-notify-action is-accept"
                    disabled={pending}
                    onClick={() => respond(selected, "accept")}
                  >
                    <Check size={14} aria-hidden /> Duyệt
                  </button>
                  <button
                    type="button"
                    className="j-notify-action"
                    disabled={pending}
                    onClick={() => respond(selected, "decline")}
                  >
                    Từ chối
                  </button>
                </>
              ) : null}
              <Link
                href={`/${selected.slug}`}
                className="j-notify-action is-link"
              >
                <ExternalLink size={14} aria-hidden /> Xem Journey
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Avatar({
  request,
  large = false,
}: {
  request: PendingFollowRequest;
  large?: boolean;
}) {
  const initial = (request.tenHienThi || request.slug || "?").slice(0, 1).toUpperCase();
  return (
    <span className={large ? "j-notify-avatar is-large" : "j-notify-avatar"}>
      {request.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={request.avatarUrl} alt="" />
      ) : (
        <span aria-hidden>{initial}</span>
      )}
    </span>
  );
}
