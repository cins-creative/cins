"use client";

import { ClipboardList, Heart, Loader2, Users, X } from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { ShopQuaySuKienPanel } from "@/components/shop/ShopQuaySuKienPanel";
import { getNameInitials } from "@/lib/journey/profile";
import { journeyPathForView } from "@/lib/journey/profile-share";
import type {
  SuKienQuanLyPayload,
  SuKienQuanLyStats,
  SuKienQuanLyThanhVien,
} from "@/lib/to-chuc/su-kien-quan-ly-types";

import "@/components/shop/shop-dashboard.css";

type Props = {
  orgId: string;
  suKienId: string;
  /** Khi true — tải lại (vd. vừa mở tab). */
  active?: boolean;
  onPendingReviewCountChange?: (count: number) => void;
};

const EMPTY_STATS: SuKienQuanLyStats = {
  soSeThamGia: 0,
  soQuanTam: 0,
  soChoDuyetNoiDung: 0,
  soDaDuyetNoiDung: 0,
  slotToiDa: null,
};

const FACEPILE_COLORS = [
  "#1f74c9",
  "#1fb36b",
  "#e07a3a",
  "#7c5cbf",
  "#c94b6a",
];

function PersonAvatar({
  tv,
  className,
  color,
}: {
  tv: Pick<SuKienQuanLyThanhVien, "ten" | "slug" | "avatarUrl">;
  className?: string;
  color?: string;
}) {
  const initials = getNameInitials(tv.ten, tv.slug);
  return (
    <span
      className={className}
      style={
        !tv.avatarUrl && color
          ? { background: color, color: "#fff" }
          : undefined
      }
      aria-hidden
    >
      {tv.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={tv.avatarUrl} alt="" />
      ) : (
        <span>{initials}</span>
      )}
    </span>
  );
}

function AttendeesListModal({
  open,
  orgId,
  suKienId,
  onClose,
}: {
  open: boolean;
  orgId: string;
  suKienId: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<SuKienQuanLyThanhVien[] | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    void fetch(
      `/api/org/${encodeURIComponent(orgId)}/su-kien/${encodeURIComponent(suKienId)}/quan-ly/thanh-vien`,
      { credentials: "include", cache: "no-store" },
    )
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as {
          thanhVien?: SuKienQuanLyThanhVien[];
          error?: string;
        } | null;
        if (!res.ok) {
          throw new Error(json?.error ?? "Không tải được danh sách.");
        }
        if (!cancelled) setItems(json?.thanhVien ?? []);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setErr(
            e instanceof Error ? e.message : "Không tải được danh sách.",
          );
          setItems(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, orgId, suKienId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  let body: ReactNode;
  if (loading && !items) {
    body = (
      <p className="cso-sk-manage-loading">
        <Loader2 className="shop-spin" size={16} /> Đang tải danh sách…
      </p>
    );
  } else if (err) {
    body = (
      <p className="cso-sk-manage-err" role="alert">
        {err}
      </p>
    );
  } else if (!items?.length) {
    body = (
      <p className="cso-sk-manage-empty">
        Chưa có ai quan tâm hoặc đăng ký tham gia.
      </p>
    );
  } else {
    body = (
      <ul className="cso-sk-attendees-list">
        {items.map((tv) => (
          <li key={`${tv.id}-${tv.loai}`} className="cso-sk-attendees-row">
            <div className="cso-sk-attendees-row-main">
              <PersonAvatar
                tv={tv}
                className="cso-sk-attendees-row-avatar"
              />
              <div className="cso-sk-manage-person-copy">
                {tv.slug ? (
                  <Link
                    href={journeyPathForView(tv.slug, "journey")}
                    className="cso-sk-manage-person-name"
                  >
                    {tv.ten ?? "Thành viên"}
                  </Link>
                ) : (
                  <span className="cso-sk-manage-person-name">
                    {tv.ten ?? "Thành viên"}
                  </span>
                )}
                {tv.slug ? (
                  <span className="cso-sk-manage-person-meta">@{tv.slug}</span>
                ) : null}
              </div>
            </div>
            <span
              className={
                tv.loai === "se_tham_gia"
                  ? "cso-sk-manage-chip is-join"
                  : "cso-sk-manage-chip is-interest"
              }
            >
              {tv.loai === "se_tham_gia" ? "Sẽ tham gia" : "Quan tâm"}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return createPortal(
    <div className="uas-backdrop" role="presentation" onClick={onClose}>
      <div
        className="uas-modal cso-sk-attendees-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="uas-head">
          <div className="cso-sk-manage-head-copy">
            <h2 id={titleId} className="uas-title">
              Người đăng ký tham gia
            </h2>
            {items ? (
              <p className="cso-sk-manage-sub">
                {items.length.toLocaleString("vi-VN")} người
              </p>
            ) : null}
          </div>
          <button type="button" className="uas-close" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="cso-sk-attendees-modal-body">{body}</div>
      </div>
    </div>,
    document.body,
  );
}

/** Nội dung tab/modal quản lý sự kiện (thống kê, danh sách RSVP, chờ duyệt). */
export function SuKienManagePanel({
  orgId,
  suKienId,
  active = true,
  onPendingReviewCountChange,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<SuKienQuanLyPayload | null>(null);
  const [attendeesOpen, setAttendeesOpen] = useState(false);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    void fetch(
      `/api/org/${encodeURIComponent(orgId)}/su-kien/${encodeURIComponent(suKienId)}/quan-ly`,
      { credentials: "include", cache: "no-store" },
    )
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as
          | (SuKienQuanLyPayload & { error?: string })
          | null;
        if (!res.ok) {
          throw new Error(json?.error ?? "Không tải được bảng quản lý.");
        }
        if (!cancelled && json) {
          const stats = json.stats ?? EMPTY_STATS;
          setData({
            stats,
            thanhVien: json.thanhVien ?? [],
          });
          onPendingReviewCountChange?.(stats.soChoDuyetNoiDung);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setErr(
            e instanceof Error ? e.message : "Không tải được bảng quản lý.",
          );
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active, orgId, suKienId, onPendingReviewCountChange]);

  const closeAttendees = useCallback(() => setAttendeesOpen(false), []);

  const stats = data?.stats ?? EMPTY_STATS;
  const slotLabel =
    stats.slotToiDa != null
      ? `${stats.soSeThamGia}/${stats.slotToiDa}`
      : String(stats.soSeThamGia);

  const peopleTotal = stats.soSeThamGia + stats.soQuanTam;
  const facepile = data?.thanhVien ?? [];

  return (
    <div className="cso-sk-manage-body cso-sk-manage-body--embedded">
      {loading ? (
        <p className="cso-sk-manage-loading">
          <Loader2 className="shop-spin" size={16} /> Đang tải…
        </p>
      ) : err ? (
        <p className="cso-sk-manage-err" role="alert">
          {err}
        </p>
      ) : (
        <>
          <div className="cso-sk-manage-stats" role="group" aria-label="Thống kê">
            <div className="cso-sk-manage-stat">
              <span className="cso-sk-manage-stat-ico" aria-hidden>
                <Users size={16} />
              </span>
              <span className="cso-sk-manage-stat-val">{slotLabel}</span>
              <span className="cso-sk-manage-stat-lbl">Sẽ tham gia</span>
            </div>
            <div className="cso-sk-manage-stat">
              <span className="cso-sk-manage-stat-ico" aria-hidden>
                <Heart size={16} />
              </span>
              <span className="cso-sk-manage-stat-val">{stats.soQuanTam}</span>
              <span className="cso-sk-manage-stat-lbl">Quan tâm</span>
            </div>
            <div className="cso-sk-manage-stat">
              <span className="cso-sk-manage-stat-ico" aria-hidden>
                <ClipboardList size={16} />
              </span>
              <span className="cso-sk-manage-stat-val">
                {stats.soChoDuyetNoiDung}
              </span>
              <span className="cso-sk-manage-stat-lbl">Chờ duyệt nội dung</span>
            </div>
            <div className="cso-sk-manage-stat">
              <span className="cso-sk-manage-stat-ico" aria-hidden>
                <ClipboardList size={16} />
              </span>
              <span className="cso-sk-manage-stat-val">
                {stats.soDaDuyetNoiDung}
              </span>
              <span className="cso-sk-manage-stat-lbl">Đã duyệt nội dung</span>
            </div>
          </div>

          <section className="cso-sk-manage-section">
            <h3 className="cso-sk-manage-section-title">Người tham dự</h3>
            {peopleTotal > 0 ? (
              <button
                type="button"
                className="cso-sk-facepile-btn"
                onClick={() => setAttendeesOpen(true)}
                aria-label={`Xem ${peopleTotal} người đăng ký tham gia`}
              >
                <span className="cso-sk-facepile" aria-hidden>
                  {facepile.map((tv, i) => (
                    <PersonAvatar
                      key={`${tv.id}-${tv.loai}`}
                      tv={tv}
                      className="cso-sk-facepile-item"
                      color={FACEPILE_COLORS[i % FACEPILE_COLORS.length]}
                    />
                  ))}
                  {peopleTotal > facepile.length ? (
                    <span className="cso-sk-facepile-more">
                      +{peopleTotal - facepile.length}
                    </span>
                  ) : null}
                </span>
                <span className="cso-sk-facepile-note">
                  <strong>{peopleTotal.toLocaleString("vi-VN")}</strong> người
                  tham dự
                </span>
              </button>
            ) : (
              <p className="cso-sk-manage-empty">
                Chưa có ai quan tâm hoặc đăng ký tham gia.
              </p>
            )}
          </section>

          <section className="cso-sk-manage-section">
            <h3 className="cso-sk-manage-section-title">
              Nội dung chờ duyệt
            </h3>
            <ShopQuaySuKienPanel
              suKienId={suKienId}
              canManage
              alwaysShow
              title="Đăng ký tham gia / quầy"
              onPendingCountChange={onPendingReviewCountChange}
            />
          </section>
        </>
      )}

      <AttendeesListModal
        open={attendeesOpen}
        orgId={orgId}
        suKienId={suKienId}
        onClose={closeAttendees}
      />
    </div>
  );
}
