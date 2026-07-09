"use client";

import {
  BadgeCheck,
  Calendar,
  MessageSquare,
  Pencil,
  Shield,
} from "lucide-react";

import { CoSoOrgFollowButton } from "@/components/co-so/CoSoOrgFollowButton";
import type { CoSoSettingsSection } from "@/components/co-so/CoSoPageSettingsModal";
import { OrgSidebarShareButton } from "@/components/org/OrgSidebarShareButton";
import { useOrgSidebarShareSource } from "@/components/org/useOrgSidebarShareSource";
import { TruongMessageInbox } from "@/components/truong/TruongMessageInbox";
import { TruongMilestoneTagNotify } from "@/components/truong/TruongMilestoneTagNotify";
import { TruongOrgCover } from "@/components/truong/TruongOrgCover";
import { TruongOrgAvatar } from "@/components/truong/TruongOrgAvatar";
import { TruongSchoolContact } from "@/components/truong/TruongSchoolContact";
import { TruongUserChatLauncher } from "@/components/truong/TruongUserChatLauncher";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import type { TruongDetail } from "@/lib/truong/types";

type Props = {
  school: TruongDetail;
  daVerify: boolean;
  hocVienXacThucCount?: number;
  canEditMedia?: boolean;
  onOpenSettings?: (section: CoSoSettingsSection) => void;
  isMobileShell?: boolean;
  isMobileShellActive?: boolean;
};

function csoSidebarSubtitle(school: TruongDetail): string | null {
  const moTa = school.mo_ta?.trim();
  if (moTa) return moTa;
  const official = school.ten_chinh_thuc?.trim();
  if (official && official !== school.ten.trim()) return official;
  const en = school.ten_tieng_anh?.trim();
  if (en && en !== school.ten.trim()) return en;
  return null;
}

export function CoSoSchoolSidebar({
  school: schoolProp,
  daVerify,
  hocVienXacThucCount = 0,
  canEditMedia = false,
  onOpenSettings,
  isMobileShell = false,
  isMobileShellActive = false,
}: Props) {
  const ctx = useTruongInlineEdit();
  const school = ctx?.school ?? schoolProp;
  const isEditing = Boolean(canEditMedia && ctx?.isEditing);
  // isOwner (member trục 2): khoá theo dõi/nhắn tin chính org của mình.
  const isOwner = Boolean(ctx?.isOrgMember);
  /** Tin nhắn + tag đồ án: mọi admin org (member trục 2 hoặc CINs trục 1). */
  const showAdminCta = isEditing && Boolean(ctx?.canEdit);
  const editable = canEditMedia;
  const subtitle = csoSidebarSubtitle(school);
  const shareSource = useOrgSidebarShareSource(school);

  const hasStudents = hocVienXacThucCount > 0;

  return (
    <aside
      className="school-side fade f1 cso-ss-side"
      aria-label="Thông tin cơ sở đào tạo"
      id={isMobileShell ? "cso-shell-panel-info" : undefined}
      role={isMobileShell ? "tabpanel" : undefined}
      aria-labelledby={isMobileShell ? "cso-shell-tab-info" : undefined}
      hidden={isMobileShell ? !isMobileShellActive : undefined}
    >
      <div className="cso-ss-card">
        <div className="cso-ss-pad">
          <div className="cso-ss-cover">
            <div className="ss-cover">
              <TruongOrgCover school={school} layout="v6" editable={editable} />
            </div>
          </div>

          <div className="cso-ss-stack">
            <div className="cso-ss-ava-row">
              <TruongOrgAvatar
                school={school}
                size="lg"
                className="cso-ss-ava"
                editable={editable}
              />
            </div>

            <div className="cso-ss-identity">
              <h1 className="cso-ss-name">{school.ten}</h1>
              {subtitle ? <p className="cso-ss-sub">{subtitle}</p> : null}
              {isEditing && onOpenSettings ? (
                <button
                  type="button"
                  className="cso-ss-edit-info-btn"
                  onClick={() => onOpenSettings("identity")}
                >
                  <Pencil size={14} strokeWidth={2.2} aria-hidden />
                  Sửa thông tin cơ sở
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
                <CoSoOrgFollowButton orgId={school.id} disabled={isOwner} />
                <OrgSidebarShareButton kind="co_so" source={shareSource} />
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
                <OrgSidebarShareButton kind="co_so" source={shareSource} />
              </>
            )}
          </div>

          <section className="cso-ss-sec" aria-labelledby="cso-ss-contact-title">
            <div className="cso-ss-sec-head">
              <h2 id="cso-ss-contact-title" className="cso-ss-sec-title">
                Cơ sở chính
              </h2>
            </div>
            <TruongSchoolContact
              school={school}
              isEditing={isEditing}
              variant="sidebar"
            />
          </section>

          <section className="cso-ss-sec" aria-labelledby="cso-ss-stats-title">
            <div className="cso-ss-sec-head">
              <h2 id="cso-ss-stats-title" className="cso-ss-sec-title">
                Số liệu đào tạo
              </h2>
            </div>

            <div className="cso-ss-stat-grid">
              <div className="cso-ss-stat-card">
                <div className="cso-ss-stat-card-label">
                  <BadgeCheck size={12} strokeWidth={2.2} aria-hidden />
                  Xác thực
                </div>
                {hasStudents ? (
                  <div className="cso-ss-stat-card-val">{hocVienXacThucCount}</div>
                ) : (
                  <p className="cso-ss-stat-empty">
                    {isOwner && isEditing
                      ? "Chưa có học viên được xác nhận"
                      : "Đang cập nhật"}
                  </p>
                )}
              </div>

              <div className="cso-ss-stat-card">
                <div className="cso-ss-stat-card-label">
                  <Calendar size={12} strokeWidth={2.2} aria-hidden />
                  Năm thành lập
                </div>
                <div className="cso-ss-stat-card-val cso-ss-stat-card-val--text">
                  {school.nam_thanh_lap ?? "—"}
                </div>
              </div>
            </div>

            <div
              className={`cso-ss-verify${daVerify ? " is-verified" : " is-pending"}`}
            >
              <div className="cso-ss-verify-icon" aria-hidden>
                {daVerify ? (
                  <BadgeCheck size={18} strokeWidth={2.2} />
                ) : (
                  <Shield size={18} strokeWidth={2.2} />
                )}
              </div>
              <div className="cso-ss-verify-copy">
                <div className="cso-ss-verify-title">
                  {daVerify
                    ? "Đã xác thực giấy phép"
                    : "Chưa xác thực giấy phép"}
                </div>
                <div className="cso-ss-verify-sub">
                  {daVerify
                    ? school.giay_phep_dao_tao?.trim() ||
                      "CINS đã xác minh giấy phép đào tạo"
                    : isOwner && isEditing
                      ? "Tải GPKD / GP đào tạo để nhận huy hiệu"
                      : "Cơ sở chưa cung cấp giấy phép"}
                </div>
              </div>
            </div>
          </section>
          </div>
        </div>
      </div>
    </aside>
  );
}
