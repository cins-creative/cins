"use client";

import { Pencil } from "lucide-react";

import { TruongGioiThieuTruong } from "@/components/truong/TruongGioiThieuTruong";
import type { TruongSettingsSection } from "@/components/truong/TruongPageSettingsModal";
import { TruongOrgCover } from "@/components/truong/TruongOrgCover";
import { TruongMessageInbox } from "@/components/truong/TruongMessageInbox";
import { TruongMilestoneTagNotify } from "@/components/truong/TruongMilestoneTagNotify";
import { TruongOrgAvatar } from "@/components/truong/TruongOrgAvatar";
import { TruongSchoolContact } from "@/components/truong/TruongSchoolContact";
import { TruongUserChatLauncher } from "@/components/truong/TruongUserChatLauncher";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { labelLoaiTruong } from "@/lib/nganh/truong-shared";
import type { TruongDetail } from "@/lib/truong/types";

type Props = {
  onOpenSettings?: (section: TruongSettingsSection) => void;
  isMobileShell?: boolean;
  isMobileShellActive?: boolean;
};

function truongSidebarSubtitle(school: TruongDetail): string | null {
  const moTa = school.mo_ta?.trim();
  if (moTa) return moTa;
  const en = school.ten_tieng_anh?.trim();
  if (en && en !== school.ten.trim()) return en;
  return null;
}

export function TruongSchoolSidebar({
  onOpenSettings,
  isMobileShell = false,
  isMobileShellActive = false,
}: Props) {
  const ctx = useTruongInlineEdit();
  if (!ctx) return null;

  const { school, isEditing, canEdit } = ctx;
  const showAdminCta = canEdit && isEditing;
  const loai = labelLoaiTruong(school.loai_truong);
  const subtitle = truongSidebarSubtitle(school);

  const showTuyenSinStats = isEditing || school.co_ktx != null;

  const ktxPriceLabel =
    typeof school.ktx_gia_thang === "number"
      ? `~${school.ktx_gia_thang.toLocaleString("vi-VN")} đ/tháng`
      : null;

  const showKtxStat = Boolean(school.co_ktx);

  const asideProps = {
    className: `school-side fade f1${isMobileShell ? " cso-ss-side" : ""}`,
    "aria-label": "Thông tin trường",
    id: isMobileShell ? "cso-shell-panel-info" : undefined,
    role: isMobileShell ? ("tabpanel" as const) : undefined,
    "aria-labelledby": isMobileShell ? "cso-shell-tab-info" : undefined,
    hidden: isMobileShell ? !isMobileShellActive : undefined,
  };

  if (isMobileShell) {
    return (
      <aside {...asideProps}>
        <div className="cso-ss-card">
          <div className="cso-ss-pad">
            <div className="cso-ss-cover">
              <div className="ss-cover">
                <TruongOrgCover school={school} editable layout="v6" />
              </div>
            </div>

            <div className="cso-ss-stack">
              <div className="cso-ss-ava-row">
                <TruongOrgAvatar
                  school={school}
                  size="lg"
                  className="cso-ss-ava"
                  editable
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
                    Sửa thông tin trường
                  </button>
                ) : null}
              </div>

              <div className="cso-ss-badges">
                <span className="cso-ss-badge">Trường ĐH</span>
                {loai !== "—" ? <span className="cso-ss-badge">{loai}</span> : null}
                {school.ma_truong ? (
                  <span className="cso-ss-badge">{school.ma_truong}</span>
                ) : null}
                {school.nam_thanh_lap ? (
                  <span className="cso-ss-badge">
                    Thành lập {school.nam_thanh_lap}
                  </span>
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
                ) : (
                  <div className="cso-ss-primary-action--single">
                    <TruongUserChatLauncher />
                  </div>
                )}
              </div>

              <section className="cso-ss-sec" aria-labelledby="truong-ss-contact-title">
                <div className="cso-ss-sec-head">
                  <h2 id="truong-ss-contact-title" className="cso-ss-sec-title">
                    Liên hệ
                  </h2>
                </div>
                <TruongSchoolContact
                  school={school}
                  isEditing={isEditing}
                  variant="sidebar"
                />
              </section>

              {showTuyenSinStats ? (
                <section className="cso-ss-sec" aria-labelledby="truong-ss-stats-title">
                  <div className="cso-ss-sec-head">
                    <h2 id="truong-ss-stats-title" className="cso-ss-sec-title">
                      Số liệu tuyển sinh
                    </h2>
                    {isEditing && onOpenSettings ? (
                      <button
                        type="button"
                        className="cso-ss-sec-edit"
                        onClick={() => onOpenSettings("tuyen-sinh")}
                      >
                        Sửa
                      </button>
                    ) : null}
                  </div>
                  <div className="ss-stat-grid">
                    {showKtxStat ? (
                      <div className="ss-stat span-2">
                        <div className="lbl">Ký túc xá</div>
                        {ktxPriceLabel ? (
                          <div className="val text">{ktxPriceLabel}</div>
                        ) : null}
                        {school.ktx_dia_chi ? (
                          <div className="sub">{school.ktx_dia_chi}</div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside {...asideProps}>
      <div className="ss-cover">
        <TruongOrgCover school={school} editable layout="v6" />
      </div>

      <div className="ss-card-id">
        <div className="ss-id-top">
          <TruongOrgAvatar school={school} size="lg" className="ss-avatar" editable />
          <div className="ss-cta">
            {showAdminCta ? (
              <>
                <TruongMilestoneTagNotify />
                <TruongMessageInbox />
              </>
            ) : (
              <TruongUserChatLauncher />
            )}
          </div>
        </div>

        <h1 className="ss-name">{school.ten}</h1>
        {school.ten_tieng_anh?.trim() ? (
          <p className="ss-en">{school.ten_tieng_anh.trim()}</p>
        ) : null}
        {school.mo_ta?.trim() ? (
          <p className="ss-mo-ta">{school.mo_ta.trim()}</p>
        ) : null}
        {isEditing && onOpenSettings ? (
          <button
            type="button"
            className="ss-edit-info-btn"
            onClick={() => onOpenSettings("identity")}
          >
            <Pencil size={14} strokeWidth={2.2} aria-hidden />
            Sửa thông tin trường
          </button>
        ) : null}

        <div className="ss-badges">
          <span className="ss-badge">Trường ĐH</span>
          {loai !== "—" ? <span className="ss-badge">{loai}</span> : null}
          {school.ma_truong ? (
            <span className="ss-badge">{school.ma_truong}</span>
          ) : null}
          {school.nam_thanh_lap ? (
            <span className="ss-badge">Thành lập {school.nam_thanh_lap}</span>
          ) : null}
        </div>

        <div className="ss-gioi-thieu-wrap">
          <TruongGioiThieuTruong
            school={school}
            onOpenAbout={
              isEditing && onOpenSettings
                ? () => onOpenSettings("about")
                : undefined
            }
          />
        </div>
      </div>

      <div className="ss-section">
        <div className="ss-section-head ss-section-head--contact">
          <div className="ss-section-label">Liên hệ</div>
        </div>
        <TruongSchoolContact school={school} isEditing={isEditing} variant="sidebar" />
      </div>

      {showTuyenSinStats ? (
        <div className="ss-section">
          <div className="ss-section-head">
            <div className="ss-section-label">Số liệu tuyển sinh</div>
            {isEditing && onOpenSettings ? (
              <button
                type="button"
                className="tdh-inline-chip-btn"
                onClick={() => onOpenSettings("tuyen-sinh")}
              >
                Sửa
              </button>
            ) : null}
          </div>
          <div className="ss-stat-grid">
            {showKtxStat ? (
              <div className="ss-stat span-2">
                <div className="lbl">Ký túc xá</div>
                {ktxPriceLabel ? (
                  <div className="val text">{ktxPriceLabel}</div>
                ) : null}
                {school.ktx_dia_chi ? (
                  <div className="sub">{school.ktx_dia_chi}</div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
