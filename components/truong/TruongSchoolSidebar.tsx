"use client";

import { Pencil } from "lucide-react";

import { CoSoOrgFollowButton } from "@/components/co-so/CoSoOrgFollowButton";
import { TruongGioiThieuTruong } from "@/components/truong/TruongGioiThieuTruong";
import type { TruongSettingsSection } from "@/components/truong/TruongPageSettingsModal";
import { TruongOrgCover } from "@/components/truong/TruongOrgCover";
import { TruongMessageInbox } from "@/components/truong/TruongMessageInbox";
import { TruongMilestoneTagNotify } from "@/components/truong/TruongMilestoneTagNotify";
import { TruongOrgAvatar } from "@/components/truong/TruongOrgAvatar";
import { TruongSchoolContact } from "@/components/truong/TruongSchoolContact";
import { TruongUserChatLauncher } from "@/components/truong/TruongUserChatLauncher";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { hasTruongGioiThieuContent } from "@/lib/truong/gioi-thieu";
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

type BodyProps = {
  school: TruongDetail;
  subtitle: string | null;
  loai: string;
  showAdminCta: boolean;
  canEdit: boolean;
  /** Member org thật (trục 2) — khoá theo dõi/nhắn tin chính trường của mình. */
  isOrgMember: boolean;
  isEditing: boolean;
  showTuyenSinStats: boolean;
  showKtxStat: boolean;
  ktxPriceLabel: string | null;
  showGioiThieu: boolean;
  onOpenSettings?: (section: TruongSettingsSection) => void;
  /** Desktop trường: avatar overlap cover 168px — khác mobile/cơ sở. */
  layout?: "desktop" | "stack";
};

function TruongSidebarStack({
  school,
  subtitle,
  loai,
  showAdminCta,
  canEdit,
  isOrgMember,
  isEditing,
  showTuyenSinStats,
  showKtxStat,
  ktxPriceLabel,
  showGioiThieu,
  onOpenSettings,
  layout = "stack",
}: BodyProps) {
  const avatarClass =
    layout === "desktop" ? "cso-ss-ava truong-ss-ava" : "cso-ss-ava";

  return (
    <div className="cso-ss-stack">
      <div className="cso-ss-ava-row">
        <TruongOrgAvatar
          school={school}
          size="lg"
          className={avatarClass}
          editable={canEdit && isEditing}
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
          <span className="cso-ss-badge">Thành lập {school.nam_thanh_lap}</span>
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
          <>
            <TruongUserChatLauncher />
            <CoSoOrgFollowButton orgId={school.id} disabled={isOrgMember} />
          </>
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
          {showKtxStat ? (
            <div className="cso-ss-stat-grid">
              <div className="cso-ss-stat-card">
                <div className="cso-ss-stat-card-label">Ký túc xá</div>
                <div className="cso-ss-stat-card-val cso-ss-stat-card-val--text">
                  {ktxPriceLabel ?? "Có KTX"}
                </div>
                {school.ktx_dia_chi ? (
                  <p className="cso-ss-stat-empty">{school.ktx_dia_chi}</p>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="cso-ss-stat-empty">Đang cập nhật</p>
          )}
        </section>
      ) : null}

      {showGioiThieu ? (
        <section className="cso-ss-sec" aria-labelledby="truong-ss-about-title">
          <div className="cso-ss-sec-head">
            <h2 id="truong-ss-about-title" className="cso-ss-sec-title">
              Giới thiệu
            </h2>
          </div>
          <TruongGioiThieuTruong
            school={school}
            onOpenAbout={
              isEditing && onOpenSettings
                ? () => onOpenSettings("about")
                : undefined
            }
          />
        </section>
      ) : null}
    </div>
  );
}

export function TruongSchoolSidebar({
  onOpenSettings,
  isMobileShell = false,
  isMobileShellActive = false,
}: Props) {
  const ctx = useTruongInlineEdit();
  if (!ctx) return null;

  const { school, isEditing, canEdit } = ctx;
  const isOrgMember = Boolean(ctx.isOrgMember);
  const showAdminCta = isOrgMember && isEditing;
  const loai = labelLoaiTruong(school.loai_truong);
  const subtitle = truongSidebarSubtitle(school);

  const showTuyenSinStats = isEditing || school.co_ktx != null;

  const ktxPriceLabel =
    typeof school.ktx_gia_thang === "number"
      ? `~${school.ktx_gia_thang.toLocaleString("vi-VN")} đ/tháng`
      : null;

  const showKtxStat = Boolean(school.co_ktx);
  const showGioiThieu =
    hasTruongGioiThieuContent(school.gioi_thieu_truong) || canEdit;

  const bodyProps: BodyProps = {
    school,
    subtitle,
    loai,
    showAdminCta,
    canEdit,
    isOrgMember,
    isEditing,
    showTuyenSinStats,
    showKtxStat,
    ktxPriceLabel,
    showGioiThieu,
    onOpenSettings,
  };

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
            <TruongSidebarStack {...bodyProps} layout="stack" />
          </div>
        </div>
      </aside>
    );
  }

  /* Desktop trường ĐH: cover full-width trên sidebar (3 cột), stack nội dung
   * giống cơ sở/studio — KHÔNG dùng cso-ss-side shell (overflow/ẩn cover). */
  return (
    <aside {...asideProps}>
      <div className="ss-cover">
        <TruongOrgCover
          school={school}
          editable={canEdit && isEditing}
          layout="v6"
        />
      </div>
      <div className="truong-ss-pad">
        <TruongSidebarStack {...bodyProps} layout="desktop" />
      </div>
    </aside>
  );
}
