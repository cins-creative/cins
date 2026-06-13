"use client";

import Link from "next/link";
import { BookOpen, FileText, ShieldCheck, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type OrgKind = "cong_dong" | "co_so_dao_tao";

type OrgPreview = {
  slug: string;
  ten: string;
  moTa: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  tinhThanh: string | null;
  soThanhVien: number;
  soHocVien?: number;
  soBaiViet?: number;
  soKhoaHoc?: number;
  daVerify?: boolean;
  loaiCoSo?: string | null;
  href: string;
};

type Props = {
  slug?: string | null;
  orgKind?: OrgKind | "truong" | null;
  fallbackName?: string | null;
  fallbackAvatarUrl?: string | null;
  href?: string | null;
  children: React.ReactNode;
};

function previewApi(orgKind: OrgKind, slug: string): string {
  return orgKind === "co_so_dao_tao"
    ? `/api/co-so/preview?slug=${encodeURIComponent(slug)}`
    : `/api/cong-dong/preview?slug=${encodeURIComponent(slug)}`;
}

function defaultHref(orgKind: OrgKind, slug: string): string {
  return orgKind === "co_so_dao_tao" ? `/co-so/${slug}` : `/cong-dong/${slug}`;
}

function slugPath(orgKind: OrgKind, slug: string): string {
  return orgKind === "co_so_dao_tao" ? `/co-so/${slug}` : `/cong-dong/${slug}`;
}

function orgKicker(orgKind: OrgKind): string {
  return orgKind === "co_so_dao_tao" ? "Cơ sở đào tạo" : "Cộng đồng";
}

function orgPrimaryCta(orgKind: OrgKind): string {
  return orgKind === "co_so_dao_tao" ? "Xem cơ sở" : "Xem cộng đồng";
}

function isPopoverKind(orgKind: OrgKind | "truong" | null | undefined): orgKind is OrgKind {
  return orgKind === "cong_dong" || orgKind === "co_so_dao_tao";
}

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
  const [org, setOrg] = useState<OrgPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const popoverKind = isPopoverKind(orgKind) ? orgKind : null;

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
    if (!slug || !popoverKind) return;
    setOpen((value) => !value);
    if (org || loading) return;
    setLoading(true);
    void fetch(previewApi(popoverKind, slug))
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        setOrg(json?.org ?? null);
      })
      .finally(() => setLoading(false));
  };

  if (!slug || !popoverKind) return <>{children}</>;

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
          soHocVien: 0,
          soBaiViet: 0,
          href: href ?? defaultHref(popoverKind, slug),
        }
      : null);

  const dialogLabel =
    popoverKind === "co_so_dao_tao"
      ? "Thông tin cơ sở đào tạo"
      : "Thông tin cộng đồng";

  return (
    <span className="j-user-pop-wrap j-org-pop-wrap" ref={wrapRef}>
      <button
        type="button"
        className="j-user-pop-trigger"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          toggle();
        }}
      >
        {children}
      </button>
      {mounted && open
        ? createPortal(
            <div
              className="j-user-popover-backdrop"
              role="presentation"
              onClick={() => setOpen(false)}
            >
              <div
                className="j-user-popover j-org-popover"
                role="dialog"
                aria-modal="true"
                aria-label={dialogLabel}
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
                  <article
                    className={`j-org-pop-card${popoverKind === "co_so_dao_tao" ? " is-coso" : ""}`}
                  >
                    <div
                      className={`j-org-pop-cover${visible.coverUrl ? " has-img" : ""}${popoverKind === "co_so_dao_tao" ? " is-coso" : ""}`}
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
                      <p className="j-org-pop-kicker">
                        {orgKicker(popoverKind)}
                        {visible.daVerify ? (
                          <span className="j-org-pop-verified">
                            <ShieldCheck size={12} strokeWidth={2.2} aria-hidden />
                            Verified
                          </span>
                        ) : null}
                      </p>
                      <h3>{visible.ten}</h3>
                      <p className="j-org-pop-slug">{slugPath(popoverKind, visible.slug)}</p>
                      {visible.moTa ? (
                        <p className="j-org-pop-bio">{visible.moTa}</p>
                      ) : null}
                      <div className="j-org-pop-stats">
                        {popoverKind === "co_so_dao_tao" ? (
                          <>
                            <span>
                              <Users size={14} aria-hidden />
                              <strong>{visible.soHocVien ?? 0}</strong> học viên
                            </span>
                            {typeof visible.soKhoaHoc === "number" ? (
                              <span>
                                <BookOpen size={14} aria-hidden />
                                <strong>{visible.soKhoaHoc}</strong> khóa học
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <>
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
                          </>
                        )}
                        {visible.tinhThanh ? <span>{visible.tinhThanh}</span> : null}
                      </div>
                      <div className="j-org-pop-actions">
                        <Link href={visible.href} className="j-org-pop-primary">
                          {orgPrimaryCta(popoverKind)}
                        </Link>
                      </div>
                    </div>
                  </article>
                ) : loading ? (
                  <span className="j-user-pop-loading">Đang tải…</span>
                ) : (
                  <span className="j-user-pop-loading">
                    {popoverKind === "co_so_dao_tao"
                      ? "Không tải được cơ sở."
                      : "Không tải được cộng đồng."}
                  </span>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
