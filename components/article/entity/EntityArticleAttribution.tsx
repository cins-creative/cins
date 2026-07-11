"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

import type { EntityAttributionDisplay, EntityContributorDisplay } from "@/lib/article/dong-gop/types";
import type { VaiTroTacGia } from "@/lib/article/dong-gop/types";
import { getNameInitials } from "@/lib/journey/profile";

type Props = {
  data: EntityAttributionDisplay;
};

const VAI_TRO_LABEL: Record<VaiTroTacGia, string> = {
  tac_gia_chinh: "Tác giả chính",
  dong_gop: "Đóng góp",
};

function displayName(c: EntityContributorDisplay): string {
  if (c.tenHienThi) return c.tenHienThi;
  if (c.slug) return `@${c.slug}`;
  return "Thành viên CINs";
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function roleLabel(c: EntityContributorDisplay): string {
  if (c.laHienTai && c.vaiTro === "tac_gia_chinh") {
    return "Tác giả chính hiện tại";
  }
  return VAI_TRO_LABEL[c.vaiTro];
}

function sortContributors(items: EntityContributorDisplay[]): EntityContributorDisplay[] {
  return [...items].sort((a, b) => {
    if (a.laHienTai !== b.laHienTai) return a.laHienTai ? -1 : 1;
    if (a.vaiTro !== b.vaiTro) {
      if (a.vaiTro === "tac_gia_chinh") return -1;
      if (b.vaiTro === "tac_gia_chinh") return 1;
    }
    return Date.parse(b.taoLuc) - Date.parse(a.taoLuc);
  });
}

export function EntityArticleAttribution({ data }: Props) {
  const [panelOpen, setPanelOpen] = useState(false);
  const { tacGiaChinh, soNguoiDongGop, contributors } = data;

  if (!tacGiaChinh && contributors.length === 0) {
    return null;
  }

  const showContributorsLink =
    contributors.length > 0 && soNguoiDongGop > 0;

  return (
    <>
      <p className="ent-attribution">
        {tacGiaChinh ? (
          <>
            bởi{" "}
            {tacGiaChinh.href ? (
              <Link href={tacGiaChinh.href} className="ent-attribution-author">
                {displayName(tacGiaChinh)}
              </Link>
            ) : (
              <strong className="ent-attribution-author">{displayName(tacGiaChinh)}</strong>
            )}
          </>
        ) : null}
        {tacGiaChinh && showContributorsLink ? (
          <span className="ent-attribution-sep" aria-hidden>
            ·
          </span>
        ) : null}
        {showContributorsLink ? (
          <button
            type="button"
            className="ent-attribution-contributors"
            onClick={() => setPanelOpen(true)}
          >
            <strong>{soNguoiDongGop} người</strong> đã đóng góp
          </button>
        ) : null}
      </p>

      <ContributorsPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        contributors={sortContributors(contributors)}
      />
    </>
  );
}

function ContributorsPanel({
  open,
  onClose,
  contributors,
}: {
  open: boolean;
  onClose: () => void;
  contributors: EntityContributorDisplay[];
}) {
  const uid = useId().replace(/:/g, "");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="ent-contributors-modal"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="ent-contributors-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-title`}
      >
        <header className="ent-contributors-head">
          <div>
            <h2 id={`${uid}-title`} className="ent-contributors-title">
              Người đóng góp
            </h2>
            <p className="ent-contributors-sub">
              {contributors.length} thành viên đã góp nội dung cho bài này.
            </p>
          </div>
          <button
            type="button"
            className="ent-contributors-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <ul className="ent-contributors-list">
          {contributors.map((c) => (
            <li key={`${c.id}-${c.taoLuc}`} className="ent-contributors-item">
              <ContributorAvatar contributor={c} />
              <div className="ent-contributors-meta">
                {c.href ? (
                  <Link href={c.href} className="ent-contributors-name">
                    {displayName(c)}
                  </Link>
                ) : (
                  <span className="ent-contributors-name">{displayName(c)}</span>
                )}
                <span className="ent-contributors-role">{roleLabel(c)}</span>
                <span className="ent-contributors-date">
                  Đóng góp {fmtDate(c.taoLuc)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}

function ContributorAvatar({ contributor }: { contributor: EntityContributorDisplay }) {
  const label = displayName(contributor);

  if (contributor.avatarUrl) {
    return (
      <Image
        src={contributor.avatarUrl}
        alt=""
        width={44}
        height={44}
        className="ent-contributors-avatar"
        unoptimized
      />
    );
  }

  return (
    <span className="ent-contributors-avatar ent-contributors-avatar--fallback">
      {getNameInitials(contributor.tenHienThi, contributor.slug ?? "")}
    </span>
  );
}
