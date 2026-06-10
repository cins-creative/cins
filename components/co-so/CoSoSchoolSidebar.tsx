"use client";

import { Settings2 } from "lucide-react";
import { useState } from "react";

import { CoSoPageSettingsModal } from "@/components/co-so/CoSoPageSettingsModal";
import { TruongOrgCover } from "@/components/truong/TruongOrgCover";
import { TruongMessageInbox } from "@/components/truong/TruongMessageInbox";
import { TruongMilestoneTagNotify } from "@/components/truong/TruongMilestoneTagNotify";
import { TruongOrgAvatar } from "@/components/truong/TruongOrgAvatar";
import { TruongSchoolContact } from "@/components/truong/TruongSchoolContact";
import { TruongUserChatLauncher } from "@/components/truong/TruongUserChatLauncher";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import type { CoSoFilterChip } from "@/lib/to-chuc/co-so-page-queries";
import type { CoSoPageCauHinh } from "@/lib/to-chuc/co-so-page-cau-hinh";
import type { TruongDetail } from "@/lib/truong/types";

type Props = {
  school: TruongDetail;
  canEditMedia?: boolean;
  onSettingsSaved: (patch: {
    slug?: string;
    ten?: string;
    pageConfig: CoSoPageCauHinh;
    filters: CoSoFilterChip[];
    loaiCoSo?: string;
    namThanhLap?: number | null;
    giayPhepDaoTao?: string | null;
  }) => void;
};

function MessageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function CoSoSchoolSidebar({
  school: schoolProp,
  canEditMedia = false,
  onSettingsSaved,
}: Props) {
  const ctx = useTruongInlineEdit();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const school = ctx?.school ?? schoolProp;
  const editable = canEditMedia && Boolean(ctx?.canEdit);
  const showAdminCta = canEditMedia && Boolean(ctx?.canEdit) && Boolean(ctx?.isEditing);

  return (
    <aside className="school-side fade f1" aria-label="Thông tin cơ sở đào tạo">
      <div className="cso-ss-profile-head">
        <div className="cso-ss-cover-block">
          <div className="ss-cover">
            <TruongOrgCover school={school} layout="v6" editable={editable} />
          </div>
          <TruongOrgAvatar
            school={school}
            size="lg"
            className="ss-avatar cso-ss-avatar-overlap"
            editable={editable}
          />
        </div>

        <div className="ss-card-id cso-ss-card-id">
          <div className="cso-ss-id-top">
            <div className="cso-ss-avatar-gutter" aria-hidden="true" />
            <div className="cso-ss-id-body">
              <h1 className="ss-name">{school.ten}</h1>
              {school.ten_tieng_anh?.trim() ? (
                <p className="ss-en">{school.ten_tieng_anh.trim()}</p>
              ) : null}
            </div>
            <div className="cso-ss-card-actions ss-cta">
              {showAdminCta ? (
                <>
                  <TruongMilestoneTagNotify />
                  <TruongMessageInbox />
                </>
              ) : canEditMedia && ctx ? (
                <TruongUserChatLauncher />
              ) : (
                <button type="button" className="ss-btn primary" disabled>
                  <MessageIcon />
                  Nhắn tin
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="ss-section">
        <div className="ss-section-label">Liên hệ</div>
        <TruongSchoolContact
          school={school}
          isEditing={ctx?.isEditing ?? false}
          variant="sidebar"
        />
      </div>

      <div className="ss-section">
        <div className="ss-section-label">Số liệu đào tạo</div>
        <div className="ss-stat-grid">
          <div className="ss-stat span-2">
            <div className="lbl">Học viên</div>
            <div className="val text">—</div>
          </div>
          <div className="ss-stat">
            <div className="lbl">Khóa đang mở</div>
            <div className="val num">0</div>
          </div>
          <div className="ss-stat">
            <div className="lbl">Năm thành lập</div>
            <div className="val num">{school.nam_thanh_lap ?? "—"}</div>
          </div>
          {school.giay_phep_dao_tao?.trim() ? (
            <div className="ss-stat span-2">
              <div className="lbl">Giấy phép đào tạo</div>
              <div className="val text">{school.giay_phep_dao_tao.trim()}</div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="ss-section cso-ss-settings-section">
        {showAdminCta ? (
          <button
            type="button"
            className="ss-btn ghost cso-ss-settings-btn"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 size={15} strokeWidth={2} aria-hidden />
            Cài đặt trang
          </button>
        ) : null}
      </div>

      <CoSoPageSettingsModal
        open={settingsOpen}
        orgId={school.id}
        onClose={() => setSettingsOpen(false)}
        onSaved={(patch) => {
          onSettingsSaved(patch);
          ctx?.showToast("Đã cập nhật cài đặt trang.");
        }}
      />
    </aside>
  );
}
