"use client";

import { MessageSquare } from "lucide-react";

import { CoSoOrgFollowButton } from "@/components/co-so/CoSoOrgFollowButton";
import { OrgSidebarShareButton } from "@/components/org/OrgSidebarShareButton";
import { useOrgSidebarShareSource } from "@/components/org/useOrgSidebarShareSource";
import { TruongOrgAvatar } from "@/components/truong/TruongOrgAvatar";
import { TruongSchoolContact } from "@/components/truong/TruongSchoolContact";
import { TruongUserChatLauncher } from "@/components/truong/TruongUserChatLauncher";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import type { TruongDetail } from "@/lib/truong/types";

type Props = {
  /** Fallback khi không có `TruongInlineEditProvider`. */
  school?: TruongDetail;
  orgId?: string;
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

/** Footer chi tiết khóa — thông tin cơ sở (cùng nội dung sidebar trái). */
export function CoSoKhoaHocOrgFooter({ school: schoolProp, orgId: orgIdProp }: Props) {
  const ctx = useTruongInlineEdit();
  const school = ctx?.school ?? schoolProp;
  const orgId = ctx?.orgId ?? orgIdProp ?? school?.id;

  if (!school || !orgId) return null;

  const isEditing = Boolean(ctx?.isEditing);
  const isOwner = Boolean(ctx?.isOrgMember);
  const showAdminCta = isOwner && isEditing;
  const subtitle = csoSidebarSubtitle(school);
  const shareSource = useOrgSidebarShareSource(school);

  return (
    <footer className="cso-khd-org-foot" aria-label="Thông tin cơ sở đào tạo">
      <div className="cso-khd-org-foot-card">
        <div className="cso-khd-org-foot-head">
          <TruongOrgAvatar
            school={school}
            size="lg"
            className="cso-ss-ava cso-khd-org-foot-ava"
          />
          <div className="cso-ss-identity cso-khd-org-foot-identity">
            <h2 className="cso-ss-name">{school.ten}</h2>
            {subtitle ? <p className="cso-ss-sub">{subtitle}</p> : null}
          </div>
        </div>

        <div
          className={`cso-ss-primary-action cso-khd-org-foot-actions${
            showAdminCta
              ? " cso-ss-primary-action--admin"
              : " cso-ss-primary-action--dual"
          }`}
        >
          {showAdminCta ? null : ctx ? (
            <>
              <TruongUserChatLauncher />
              <CoSoOrgFollowButton orgId={orgId} disabled={isOwner} />
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

        <section
          className="cso-ss-sec cso-khd-org-foot-contact"
          aria-labelledby="cso-khd-org-foot-contact-title"
        >
          <div className="cso-ss-sec-head">
            <h2 id="cso-khd-org-foot-contact-title" className="cso-ss-sec-title">
              Cơ sở chính
            </h2>
          </div>
          <TruongSchoolContact school={school} isEditing={isEditing} variant="sidebar" />
        </section>
      </div>
    </footer>
  );
}
