"use client";

import {
  Briefcase,
  Globe,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
} from "lucide-react";
import { useState } from "react";

import { CoSoOrgFollowButton } from "@/components/co-so/CoSoOrgFollowButton";
import { TruongMessageInbox } from "@/components/truong/TruongMessageInbox";
import { TruongMilestoneTagNotify } from "@/components/truong/TruongMilestoneTagNotify";
import { TruongOrgAvatar } from "@/components/truong/TruongOrgAvatar";
import { TruongOrgCover } from "@/components/truong/TruongOrgCover";
import { TruongUserChatLauncher } from "@/components/truong/TruongUserChatLauncher";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { labelTinhThanh } from "@/lib/truong/contact";
import type { StudioOwner } from "@/lib/to-chuc/studio-page-queries";

type Props = {
  studio: StudioOwner;
  openJobCount: number;
  /** Bật chỉnh sửa ảnh bìa / logo (chỉ owner). */
  canEditMedia?: boolean;
  /** Mở modal cài đặt trang studio (chỉ owner). */
  onOpenSettings?: () => void;
  /** Render như tab-panel trong mobile shell. */
  isMobileShell?: boolean;
  isMobileShellActive?: boolean;
};

function studioSubtitle(studio: StudioOwner): string | null {
  const moTa = studio.moTa?.trim();
  if (moTa) return moTa;
  const official = studio.tenChinhThuc?.trim();
  if (official && official !== studio.ten.trim()) return official;
  return null;
}

function cleanWebsite(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/** Ngưỡng ký tự trước khi cần thu gọn phần giới thiệu. */
const STUDIO_ABOUT_CLAMP_CHARS = 240;

function StudioAbout({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > STUDIO_ABOUT_CLAMP_CHARS;

  return (
    <>
      <p
        className={`studio-ss-about${
          isLong && !expanded ? " studio-ss-about--clamp" : ""
        }`}
      >
        {text}
      </p>
      {isLong ? (
        <button
          type="button"
          className="studio-ss-about-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Thu gọn" : "Xem thêm"}
        </button>
      ) : null}
    </>
  );
}

export function StudioSidebar({
  studio,
  openJobCount,
  canEditMedia = false,
  onOpenSettings,
  isMobileShell = false,
  isMobileShellActive = false,
}: Props) {
  const ctx = useTruongInlineEdit();
  const editableMedia = canEditMedia && Boolean(ctx?.isEditing);
  const isEditing = Boolean(canEditMedia && ctx?.isEditing);
  const isOwner = Boolean(canEditMedia && ctx?.canEdit);
  const showAdminCta = isOwner && isEditing;
  const showSettings = Boolean(onOpenSettings) && isEditing;
  const displayTen = ctx?.school?.ten ?? studio.ten;
  const displayMoTa = ctx?.school?.mo_ta ?? studio.moTa;
  const displayGioiThieu = ctx?.school?.gioi_thieu_truong ?? studio.gioiThieu;
  const displayTinhThanh = ctx?.school?.tinh_thanh ?? studio.tinhThanh;
  const displayDiaChi = ctx?.school?.dia_chi ?? studio.diaChi;
  const displayDienThoai = ctx?.school?.dien_thoai ?? studio.dienThoai;
  const displayEmail = ctx?.school?.email_lien_he ?? studio.emailLienHe;
  const displayWebsite = ctx?.school?.website ?? studio.website;
  const subtitle = studioSubtitle({
    ...studio,
    moTa: displayMoTa,
    ten: displayTen,
  });
  const tinhThanh = labelTinhThanh(displayTinhThanh);
  const coverOwner = {
    cover_id: ctx?.school?.cover_id ?? studio.cover_id,
    cover_src: studio.cover_src,
    avatar_id: ctx?.school?.avatar_id ?? studio.avatar_id,
    logo_id: ctx?.school?.logo_id ?? studio.logo_id,
    ten: displayTen,
    avatar_src: studio.avatar_src,
  };

  const contactItems = [
    tinhThanh ? { icon: MapPin, label: tinhThanh } : null,
    displayDiaChi?.trim() ? { icon: MapPin, label: displayDiaChi.trim() } : null,
    displayWebsite?.trim()
      ? {
          icon: Globe,
          label: cleanWebsite(displayWebsite.trim()),
          href: displayWebsite.trim().startsWith("http")
            ? displayWebsite.trim()
            : `https://${displayWebsite.trim()}`,
        }
      : null,
    displayEmail?.trim()
      ? {
          icon: Mail,
          label: displayEmail.trim(),
          href: `mailto:${displayEmail.trim()}`,
        }
      : null,
    displayDienThoai?.trim()
      ? {
          icon: Phone,
          label: displayDienThoai.trim(),
          href: `tel:${displayDienThoai.trim()}`,
        }
      : null,
  ].filter(Boolean) as Array<{
    icon: typeof MapPin;
    label: string;
    href?: string;
  }>;

  return (
    <aside
      className="school-side fade f1 cso-ss-side"
      aria-label="Thông tin studio"
      id={isMobileShell ? "cso-shell-panel-info" : undefined}
      role={isMobileShell ? "tabpanel" : undefined}
      aria-labelledby={isMobileShell ? "cso-shell-tab-info" : undefined}
      hidden={isMobileShell ? !isMobileShellActive : undefined}
    >
      <div className="cso-ss-card">
        <div className="cso-ss-pad">
          <div className="cso-ss-cover">
            <div className="ss-cover">
              <TruongOrgCover
                school={coverOwner}
                layout="v6"
                editable={editableMedia}
              />
            </div>
          </div>

          <div className="cso-ss-stack">
            <div className="cso-ss-ava-row">
              <TruongOrgAvatar
                school={coverOwner}
                size="lg"
                className="cso-ss-ava"
                editable={editableMedia}
              />
            </div>

            <div className="cso-ss-identity">
              <h1 className="cso-ss-name">{displayTen}</h1>
              {subtitle ? <p className="cso-ss-sub">{subtitle}</p> : null}
              {showSettings ? (
                <button
                  type="button"
                  className="cso-ss-edit-info-btn"
                  onClick={onOpenSettings}
                >
                  <Pencil size={14} strokeWidth={2.2} aria-hidden />
                  Sửa thông tin studio
                </button>
              ) : null}
            </div>

            <div
              className={`cso-ss-primary-action${
                showAdminCta
                  ? " cso-ss-primary-action--admin"
                  : " cso-ss-primary-action--dual"
              }`}
            >
              {showAdminCta ? (
                <>
                  <TruongMessageInbox />
                  <TruongMilestoneTagNotify />
                </>
              ) : ctx ? (
                <>
                  <TruongUserChatLauncher />
                  <CoSoOrgFollowButton orgId={studio.id} disabled={isOwner} />
                </>
              ) : (
                <>
                  <button type="button" className="cso-ss-btn-msg" disabled>
                    <MessageSquare size={17} strokeWidth={2} aria-hidden />
                    Nhắn tin
                  </button>
                  <button type="button" className="cso-ss-btn-follow" disabled>
                    Theo dõi
                  </button>
                </>
              )}
            </div>

            {contactItems.length > 0 ? (
              <section className="cso-ss-sec" aria-labelledby="studio-ss-contact-title">
                <div className="cso-ss-sec-head">
                  <h2 id="studio-ss-contact-title" className="cso-ss-sec-title">
                    Liên hệ
                  </h2>
                </div>
                <ul className="studio-ss-contact-list">
                  {contactItems.map((item) => (
                    <li key={item.label} className="studio-ss-contact-item">
                      <item.icon size={15} strokeWidth={2} aria-hidden />
                      {item.href ? (
                        <a
                          href={item.href}
                          target={item.href.startsWith("http") ? "_blank" : undefined}
                          rel="noopener noreferrer"
                        >
                          {item.label}
                        </a>
                      ) : (
                        <span>{item.label}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="cso-ss-sec" aria-labelledby="studio-ss-stats-title">
              <div className="cso-ss-sec-head">
                <h2 id="studio-ss-stats-title" className="cso-ss-sec-title">
                  Hoạt động
                </h2>
              </div>
              <div className="cso-ss-stat-grid">
                <div className="cso-ss-stat-card">
                  <div className="cso-ss-stat-card-label">
                    <Briefcase size={12} strokeWidth={2.2} aria-hidden />
                    Tuyển dụng
                  </div>
                  <div className="cso-ss-stat-card-val cso-ss-stat-card-val--text">
                    {openJobCount > 0 ? `${openJobCount} vị trí` : "—"}
                  </div>
                </div>
              </div>
            </section>

            {displayGioiThieu?.trim() ? (
              <section className="cso-ss-sec" aria-labelledby="studio-ss-about-title">
                <div className="cso-ss-sec-head">
                  <h2 id="studio-ss-about-title" className="cso-ss-sec-title">
                    Giới thiệu
                  </h2>
                </div>
                <StudioAbout text={displayGioiThieu.trim()} />
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
}
