"use client";

import Link from "next/link";
import { FileText, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type CongDongPreview = {
  slug: string;
  ten: string;
  moTa: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  tinhThanh: string | null;
  soThanhVien: number;
  soBaiViet?: number;
  href: string;
};

type Props = {
  slug?: string | null;
  orgKind?: "cong_dong" | "truong" | null;
  fallbackName?: string | null;
  fallbackAvatarUrl?: string | null;
  href?: string | null;
  children: React.ReactNode;
};

export function JourneyOrgPopover({
  slug,
  orgKind = "cong_dong",
  fallbackName,
  fallbackAvatarUrl,
  href,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [org, setOrg] = useState<CongDongPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    if (!slug || orgKind !== "cong_dong") return;
    setOpen((value) => !value);
    if (org || loading) return;
    setLoading(true);
    void fetch(`/api/cong-dong/preview?slug=${encodeURIComponent(slug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        setOrg(json?.org ?? null);
      })
      .finally(() => setLoading(false));
  };

  if (!slug) return <>{children}</>;

  const visible =
    org ??
    (fallbackName
      ? {
          slug,
          ten: fallbackName,
          moTa: null,
          avatarUrl: fallbackAvatarUrl ?? null,
          coverUrl: null,
          tinhThanh: null,
          soThanhVien: 0,
          soBaiViet: 0,
          href: href ?? `/cong-dong/${slug}`,
        }
      : null);

  return (
    <span className="j-user-pop-wrap j-org-pop-wrap" ref={wrapRef}>
      <button
        type="button"
        className="j-user-pop-trigger"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          toggle();
        }}
      >
        {children}
      </button>
      {mounted && open ? createPortal(
        <div
          className="j-user-popover-backdrop"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="j-user-popover j-org-popover"
            role="dialog"
            aria-modal="true"
            aria-label="Thông tin cộng đồng"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="j-user-pop-close"
              aria-label="Đóng"
              onClick={() => setOpen(false)}
            >
              <X size={16} aria-hidden />
            </button>
            {visible ? (
              <article className="j-org-pop-card">
                <div
                  className={`j-org-pop-cover${visible.coverUrl ? " has-img" : ""}`}
                  aria-hidden
                >
                  {visible.coverUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={visible.coverUrl} alt="" />
                  ) : null}
                </div>
                <div className="j-org-pop-avatar" aria-hidden>
                  {visible.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={visible.avatarUrl} alt="" />
                  ) : (
                    <span>{visible.ten.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="j-org-pop-body">
                  <p className="j-org-pop-kicker">Cộng đồng</p>
                  <h3>{visible.ten}</h3>
                  <p className="j-org-pop-slug">/cong-dong/{visible.slug}</p>
                  {visible.moTa ? (
                    <p className="j-org-pop-bio">{visible.moTa}</p>
                  ) : null}
                  <div className="j-org-pop-stats">
                    <span>
                      <Users size={14} aria-hidden />
                      <strong>{visible.soThanhVien}</strong> thành viên
                    </span>
                    {typeof visible.soBaiViet === "number" ? (
                      <span>
                        <FileText size={14} aria-hidden />
                        <strong>{visible.soBaiViet}</strong> bài viết
                      </span>
                    ) : null}
                    {visible.tinhThanh ? <span>{visible.tinhThanh}</span> : null}
                  </div>
                  <div className="j-org-pop-actions">
                    <Link href={visible.href} className="j-org-pop-primary">
                      Xem cộng đồng
                    </Link>
                  </div>
                </div>
              </article>
            ) : loading ? (
              <span className="j-user-pop-loading">Đang tải...</span>
            ) : (
              <span className="j-user-pop-loading">Không tải được cộng đồng.</span>
            )}
          </div>
        </div>,
        document.body,
      ) : null}
    </span>
  );
}
