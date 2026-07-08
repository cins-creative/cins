"use client";

import Link from "next/link";
import { BookOpen, Briefcase, FileText, ShieldCheck, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { truongRootPath } from "@/lib/truong/truong-routes";

type OrgPopoverKind = "cong_dong" | "co_so_dao_tao" | "truong" | "studio";

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
  soNganh?: number;
  soTuyenDung?: number;
  namThanhLap?: number | null;
  daVerify?: boolean;
  loaiCoSo?: string | null;
  href: string;
};

type Props = {
  slug?: string | null;
  orgKind?: OrgPopoverKind | null;
  fallbackName?: string | null;
  fallbackAvatarUrl?: string | null;
  href?: string | null;
  children: React.ReactNode;
};

function previewApi(orgKind: OrgPopoverKind, slug: string): string {
  if (orgKind === "co_so_dao_tao") {
    return `/api/co-so/preview?slug=${encodeURIComponent(slug)}`;
  }
  if (orgKind === "truong") {
    return `/api/truong/preview?slug=${encodeURIComponent(slug)}`;
  }
  if (orgKind === "studio") {
    return `/api/studio/preview?slug=${encodeURIComponent(slug)}`;
  }
  return `/api/cong-dong/preview?slug=${encodeURIComponent(slug)}`;
}

function defaultHref(orgKind: OrgPopoverKind, slug: string): string {
  if (orgKind === "co_so_dao_tao") return `/co-so/${slug}`;
  if (orgKind === "truong") return truongRootPath(slug);
  if (orgKind === "studio") return `/studio/${slug}`;
  return `/cong-dong/${slug}`;
}

function slugPath(orgKind: OrgPopoverKind, slug: string): string {
  if (orgKind === "co_so_dao_tao") return `/co-so/${slug}`;
  if (orgKind === "truong") return truongRootPath(slug);
  if (orgKind === "studio") return `/studio/${slug}`;
  return `/cong-dong/${slug}`;
}

function orgKicker(orgKind: OrgPopoverKind): string {
  if (orgKind === "co_so_dao_tao") return "Cơ sở đào tạo";
  if (orgKind === "truong") return "Trường đại học";
  if (orgKind === "studio") return "Studio";
  return "Cộng đồng";
}

function orgPrimaryCta(orgKind: OrgPopoverKind): string {
  if (orgKind === "co_so_dao_tao") return "Xem cơ sở";
  if (orgKind === "truong") return "Xem trường";
  if (orgKind === "studio") return "Xem studio";
  return "Xem cộng đồng";
}

function orgLoadError(orgKind: OrgPopoverKind): string {
  if (orgKind === "co_so_dao_tao") return "Không tải được cơ sở.";
  if (orgKind === "truong") return "Không tải được trường.";
  if (orgKind === "studio") return "Không tải được studio.";
  return "Không tải được cộng đồng.";
}

function orgDialogLabel(orgKind: OrgPopoverKind): string {
  if (orgKind === "co_so_dao_tao") return "Thông tin cơ sở đào tạo";
  if (orgKind === "truong") return "Thông tin trường đại học";
  if (orgKind === "studio") return "Thông tin studio";
  return "Thông tin cộng đồng";
}

function isPopoverKind(
  orgKind: OrgPopoverKind | null | undefined,
): orgKind is OrgPopoverKind {
  return (
    orgKind === "cong_dong" ||
    orgKind === "co_so_dao_tao" ||
    orgKind === "truong" ||
    orgKind === "studio"
  );
}

function orgCardClass(orgKind: OrgPopoverKind): string {
  if (orgKind === "co_so_dao_tao") return " is-coso";
  if (orgKind === "truong") return " is-truong";
  if (orgKind === "studio") return " is-studio";
  return "";
}

function orgCoverClass(orgKind: OrgPopoverKind, hasCover: boolean): string {
  return `j-org-pop-cover${hasCover ? " has-img" : ""}${orgCardClass(orgKind)}`;
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

  const dialogLabel = orgDialogLabel(popoverKind);

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
                  <article className={`j-org-pop-card${orgCardClass(popoverKind)}`}>
                    <div
                      className={orgCoverClass(popoverKind, Boolean(visible.coverUrl))}
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
                        ) : popoverKind === "truong" ? (
                          <>
                            <span>
                              <BookOpen size={14} aria-hidden />
                              <strong>{visible.soNganh ?? 0}</strong> ngành
                            </span>
                            {visible.namThanhLap ? (
                              <span>Thành lập {visible.namThanhLap}</span>
                            ) : null}
                          </>
                        ) : popoverKind === "studio" ? (
                          <>
                            <span>
                              <Users size={14} aria-hidden />
                              <strong>{visible.soThanhVien}</strong> thành viên
                            </span>
                            {typeof visible.soTuyenDung === "number" ? (
                              <span>
                                <Briefcase size={14} aria-hidden />
                                <strong>{visible.soTuyenDung}</strong> tin tuyển dụng
                              </span>
                            ) : null}
                            {typeof visible.soBaiViet === "number" ? (
                              <span>
                                <FileText size={14} aria-hidden />
                                <strong>{visible.soBaiViet}</strong> bài viết
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
                    {orgLoadError(popoverKind)}
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
