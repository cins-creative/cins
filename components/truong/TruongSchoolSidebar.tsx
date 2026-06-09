"use client";

import { TruongEditableAbout } from "@/components/truong/inline/TruongEditableAbout";
import { TruongEditableHocPhi } from "@/components/truong/inline/TruongEditableHocPhi";
import { TruongEditableSidebarIdentity } from "@/components/truong/inline/TruongEditableSidebarIdentity";
import { TruongGioiThieuTruong } from "@/components/truong/TruongGioiThieuTruong";
import { TruongOrgCover } from "@/components/truong/TruongOrgCover";
import { TruongMessageInbox } from "@/components/truong/TruongMessageInbox";
import { TruongMilestoneTagNotify } from "@/components/truong/TruongMilestoneTagNotify";
import { TruongOrgAvatar } from "@/components/truong/TruongOrgAvatar";
import { TruongSchoolContact } from "@/components/truong/TruongSchoolContact";
import { TruongUserChatLauncher } from "@/components/truong/TruongUserChatLauncher";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { labelLoaiTruong } from "@/lib/nganh/truong-shared";
import { formatHocPhiLabel } from "@/lib/truong/display";

export function TruongSchoolSidebar() {
  const ctx = useTruongInlineEdit();
  if (!ctx) return null;

  const { school, isEditing, canEdit } = ctx;
  const showAdminCta = canEdit && isEditing;
  const loai = labelLoaiTruong(school.loai_truong);

  const hocPhiLabel = formatHocPhiLabel(
    school.hoc_phi_nam_tu,
    school.hoc_phi_nam_den,
  );

  return (
    <aside className="school-side fade f1" aria-label="Thông tin trường">
      <TruongEditableAbout hideTrigger />

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

        {isEditing ? (
          <TruongEditableSidebarIdentity />
        ) : (
          <>
            <h1 className="ss-name">{school.ten}</h1>
            {school.ten_tieng_anh?.trim() ? (
              <p className="ss-en">{school.ten_tieng_anh.trim()}</p>
            ) : null}
            {school.mo_ta?.trim() ? (
              <p className="ss-mo-ta">{school.mo_ta.trim()}</p>
            ) : null}
          </>
        )}

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
          <TruongGioiThieuTruong school={school} />
        </div>
      </div>

      <div className="ss-section">
        <div className="ss-section-head ss-section-head--contact">
          <div className="ss-section-label">Liên hệ</div>
          {isEditing ? (
            <button
              type="button"
              className="tdh-inline-chip-btn"
              onClick={() => ctx.openSchoolAboutEditor()}
            >
              Sửa liên hệ & giới thiệu
            </button>
          ) : null}
        </div>
        <TruongSchoolContact school={school} isEditing={isEditing} variant="sidebar" />
      </div>

      <div className="ss-section">
        <div className="ss-section-label">Số liệu tuyển sinh</div>
        <div className="ss-stat-grid">
          {isEditing ? (
            <div className="ss-stat span-2 ss-stat--editable">
              <TruongEditableHocPhi variant="sidebar" />
            </div>
          ) : (
            <>
              <div className="ss-stat span-2">
                <div className="lbl">Học phí</div>
                <div className="val text">{hocPhiLabel ?? "—"}</div>
              </div>
              {school.co_ktx != null ? (
                <div className="ss-stat span-2">
                  <div className="lbl">Ký túc xá</div>
                  <div className="val text">
                    {school.co_ktx
                      ? school.ktx_gia_thang
                        ? `Có · ~${school.ktx_gia_thang.toLocaleString("vi-VN")} đ/tháng`
                        : "Có"
                      : "Không"}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
