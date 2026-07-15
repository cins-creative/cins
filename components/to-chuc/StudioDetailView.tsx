"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  prefetchStudioTab,
  StudioHinhAnhTabLazy,
  StudioTabTuyenDungLazy,
} from "@/components/org/org-tab-lazy-views";
import { TruongAdminToolbar } from "@/components/truong/inline/TruongAdminToolbar";
import {
  TruongInlineEditProvider,
  useTruongInlineEdit,
} from "@/components/truong/inline/TruongInlineEditContext";
import { TruongOrgCover } from "@/components/truong/TruongOrgCover";
import { OrgBaiDangFilterShareProvider } from "@/components/org/OrgBaiDangFilterShareContext";
import { OrgNotifyFab } from "@/components/org/OrgNotifyFab";
import { StudioPageSettingsModal } from "@/components/to-chuc/StudioPageSettingsModal";
import { StudioSidebar } from "@/components/to-chuc/StudioSidebar";
import { StudioJobsSidebar } from "@/components/to-chuc/StudioJobsSidebar";
import { StudioTabBaiDang } from "@/components/to-chuc/StudioTabBaiDang";
import { StudioTabTuyenDung } from "@/components/to-chuc/tabs/StudioTabTuyenDung";
import { useCoSoMobileShell } from "@/components/co-so/useCoSoMobileShell";
import { buildOrgShareBundle } from "@/lib/org/org-profile-share";
import {
  isStudioTabVisible,
  STUDIO_TAB_IDS,
  STUDIO_TAB_LABELS,
  type StudioPageCauHinh,
  type StudioTabId,
} from "@/lib/to-chuc/studio-page-config";
import {
  STUDIO_DEFAULT_TAB,
  studioTabPath,
} from "@/lib/to-chuc/studio-routes";
import { useStudioTabNav } from "@/lib/to-chuc/use-studio-tab-nav";
import { useOrgStudioJobs } from "@/lib/to-chuc/use-org-studio-jobs";
import { studioToInlinePayload } from "@/lib/to-chuc/studio-inline-payload";
import type { StudioDetailPayload, StudioOwner } from "@/lib/to-chuc/studio-page-queries";
import type { SystemRole } from "@/lib/auth/system-role";

const TABS = STUDIO_TAB_IDS.map((id) => ({
  id,
  label: STUDIO_TAB_LABELS[id],
})) satisfies ReadonlyArray<{ id: StudioTabId; label: string }>;

type Props = {
  payload: StudioDetailPayload;
  canEdit?: boolean;
  /** Member org thật (trục 2) — khoá theo dõi/nhắn tin chính org của mình. */
  isOrgMember?: boolean;
  viewerProfileId?: string | null;
  systemRole?: SystemRole | null;
};

function studioCoverOwner(studio: StudioOwner) {
  return {
    cover_id: studio.cover_id,
    cover_src: studio.cover_src,
    avatar_id: studio.avatar_id,
    logo_id: studio.logo_id,
    ten: studio.ten,
    avatar_src: studio.avatar_src,
  };
}

export function StudioDetailView({
  payload,
  canEdit = false,
  isOrgMember = false,
  viewerProfileId = null,
  systemRole = null,
}: Props) {
  return (
    <TruongInlineEditProvider
      canEdit={canEdit}
      isOrgMember={isOrgMember}
      systemRole={systemRole}
      initial={studioToInlinePayload(payload)}
    >
      <TruongAdminToolbar />
      <StudioDetailViewInner
        payload={payload}
        canEdit={canEdit}
        viewerProfileId={viewerProfileId}
      />
    </TruongInlineEditProvider>
  );
}

function studioTabPrefetch(tab: StudioTabId) {
  if (tab === "bai-dang") return;
  prefetchStudioTab(tab);
}

function StudioDetailViewInner({
  payload,
  canEdit = false,
  viewerProfileId = null,
}: {
  payload: StudioDetailPayload;
  canEdit?: boolean;
  viewerProfileId?: string | null;
}) {
  const { studio, baidang, showcase, hinhanh } = payload;
  const ctx = useTruongInlineEdit();
  const editableMedia = canEdit && Boolean(ctx?.isEditing);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pageConfig, setPageConfig] = useState<StudioPageCauHinh>(
    () => payload.pageConfig,
  );
  const { tab, selectTab } = useStudioTabNav(studio.slug);
  const { jobs } = useOrgStudioJobs(studio.id);
  const [mountedTabs, setMountedTabs] = useState<Set<StudioTabId>>(
    () => new Set([tab]),
  );
  const { isMobileShell } = useCoSoMobileShell();
  const [notifyCount, setNotifyCount] = useState(0);

  const visibleTabs = useMemo(
    () => TABS.filter((t) => isStudioTabVisible(t.id, pageConfig)),
    [pageConfig],
  );

  useEffect(() => {
    setPageConfig(payload.pageConfig);
  }, [payload.pageConfig]);

  useEffect(() => {
    if (visibleTabs.some((t) => t.id === tab)) return;
    const fallback = visibleTabs[0]?.id ?? STUDIO_DEFAULT_TAB;
    selectTab(fallback);
  }, [tab, visibleTabs, selectTab]);

  useEffect(() => {
    setMountedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  }, [tab]);

  const openJobs = useMemo(
    () => jobs.filter((j) => j.trangThai === "dang_mo"),
    [jobs],
  );

  // Cover/avatar lấy id từ inline-edit context để phản ánh thay đổi sau khi lưu.
  const coverOwner = {
    ...studioCoverOwner(studio),
    ...(ctx?.school
      ? {
          cover_id: ctx.school.cover_id,
          avatar_id: ctx.school.avatar_id,
          logo_id: ctx.school.logo_id,
          ten: ctx.school.ten,
        }
      : {}),
  };

  const shellClass = [
    "tdh-v6-shell",
    ctx?.isEditing ? "tdh-v6-shell--editing" : "",
    isMobileShell ? "tdh-v6-shell--mobile-tabs" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const { profile: shareProfile, orgShare } = useMemo(
    () =>
      buildOrgShareBundle("studio", {
        slug: studio.slug,
        ten: coverOwner.ten,
        orgId: studio.id,
        mo_ta: studio.moTa,
        avatar_id: coverOwner.avatar_id,
        logo_id: coverOwner.logo_id,
        avatar_src: coverOwner.avatar_src,
        cover_id: coverOwner.cover_id,
        cover_src: coverOwner.cover_src,
        tinh_thanh: studio.tinhThanh,
      }),
    [
      studio.slug,
      studio.id,
      studio.moTa,
      studio.tinhThanh,
      coverOwner.ten,
      coverOwner.avatar_id,
      coverOwner.logo_id,
      coverOwner.avatar_src,
      coverOwner.cover_id,
      coverOwner.cover_src,
    ],
  );

  return (
    <OrgBaiDangFilterShareProvider
      profile={shareProfile}
      orgShare={orgShare}
      viewerProfileId={viewerProfileId}
    >
    <div
      className={shellClass}
      data-mobile-shell={isMobileShell ? "1" : undefined}
    >
      {studio.trangThaiHoatDong === "tam_ngung" ||
      studio.trangThaiHoatDong === "da_dong_cua" ? (
        <div
          className={`sps-lifecycle-banner${
            studio.trangThaiHoatDong === "da_dong_cua" ? " is-closed" : ""
          }`}
          role="status"
        >
          {studio.trangThaiHoatDong === "tam_ngung"
            ? "Studio đang tạm ngưng — ẩn khỏi hub và tìm kiếm."
            : "Studio đã đóng cửa — chỉ thành viên quản trị còn xem được trang này."}
        </div>
      ) : null}
      <StudioSidebar
        studio={studio}
        openJobCount={openJobs.length}
        canEditMedia={canEdit}
        onOpenSettings={canEdit ? () => setSettingsOpen(true) : undefined}
        isMobileShell={isMobileShell}
        isMobileShellActive
      />

      <div className="tdh-v6-center" id="cso-shell-panel-content">
        {!isMobileShell ? (
          <div className="tdh-v6-cover-mobile">
            <TruongOrgCover
              school={coverOwner}
              layout="v6"
              editable={editableMedia}
            />
          </div>
        ) : null}

        <div className="tdh-v6-tabs-bar">
          <div
            className="tdh-v6-tabs"
            role="tablist"
            aria-label="Nội dung studio / doanh nghiệp"
          >
            {visibleTabs.map((t) => (
              <Link
                key={t.id}
                href={studioTabPath(studio.slug, t.id)}
                scroll={false}
                role="tab"
                aria-selected={tab === t.id}
                id={`cso-tab-${t.id}`}
                aria-controls={`cso-panel-${t.id}`}
                className={`tdh-v6-tab${tab === t.id ? " on" : ""}`}
                onMouseEnter={() => studioTabPrefetch(t.id)}
                onFocus={() => studioTabPrefetch(t.id)}
                onClick={(event) => {
                  event.preventDefault();
                  if (tab !== t.id) selectTab(t.id);
                }}
              >
                {t.label}
              </Link>
            ))}
          </div>
        </div>

        {visibleTabs.map((t) => {
          const isActive = tab === t.id;
          if (!mountedTabs.has(t.id)) return null;

          return (
            <div
              key={t.id}
              id={`cso-panel-${t.id}`}
              role="tabpanel"
              aria-labelledby={`cso-tab-${t.id}`}
              hidden={!isActive}
              className={`tdh-v6-panel${isActive ? " on" : ""}`}
            >
              {t.id === "bai-dang" ? (
                <StudioTabBaiDang
                  variant="bai-dang"
                  posts={baidang}
                  owner={coverOwner}
                  guestEmptyMessage="Chưa có bài đăng công khai. Tin tức và cập nhật sẽ hiển thị tại đây khi tổ chức đăng trên CINs."
                />
              ) : null}

              {t.id === "showcase" ? (
                <StudioTabBaiDang
                  key={`showcase-${pageConfig.showcaseDefaultView ?? "masonry"}`}
                  variant="showcase"
                  posts={showcase}
                  owner={coverOwner}
                  showcaseDefaultView={
                    pageConfig.showcaseDefaultView ?? "masonry"
                  }
                  guestEmptyMessage="Chưa có dự án nào trong showcase. Các tác phẩm và dự án tiêu biểu sẽ xuất hiện tại đây."
                />
              ) : null}

              {t.id === "tuyen-dung" ? (
                <StudioTabTuyenDungLazy
                  jobs={jobs}
                  orgId={studio.id}
                  orgSlug={studio.slug}
                  orgTen={studio.ten}
                  canEdit={canEdit}
                  viewerLoggedIn={Boolean(viewerProfileId)}
                />
              ) : null}

              {t.id === "hinh-anh" ? (
                <StudioHinhAnhTabLazy
                  images={hinhanh}
                  sectionNum="04"
                  sectionTitle="Hình ảnh"
                  emptyHint="Gallery sẽ hiển thị khi ảnh được đăng từ tổ chức."
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <OrgNotifyFab enabled={isMobileShell} count={notifyCount}>
        <StudioJobsSidebar
          jobs={openJobs}
          orgSlug={studio.slug}
          posts={baidang}
          canManage={canEdit}
          onUpcomingCountChange={setNotifyCount}
        />
      </OrgNotifyFab>

      {canEdit ? (
        <StudioPageSettingsModal
          open={settingsOpen}
          orgId={studio.id}
          onClose={() => setSettingsOpen(false)}
          onSaved={(patch) => {
            if (patch.pageConfig) setPageConfig(patch.pageConfig);
            ctx?.applySchoolPatch({
              ...(patch.ten ? { ten: patch.ten } : {}),
              ...(patch.moTa !== undefined ? { mo_ta: patch.moTa } : {}),
              ...(patch.gioiThieu !== undefined
                ? { gioi_thieu_truong: patch.gioiThieu }
                : {}),
              ...(patch.tinhThanh !== undefined
                ? { tinh_thanh: patch.tinhThanh }
                : {}),
              ...(patch.diaChi !== undefined ? { dia_chi: patch.diaChi } : {}),
              ...(patch.dienThoai !== undefined
                ? { dien_thoai: patch.dienThoai }
                : {}),
              ...(patch.emailLienHe !== undefined
                ? { email_lien_he: patch.emailLienHe }
                : {}),
              ...(patch.website !== undefined ? { website: patch.website } : {}),
            });
            ctx?.showToast("Đã cập nhật thông tin studio.");
          }}
        />
      ) : null}
    </div>
    </OrgBaiDangFilterShareProvider>
  );
}

export { STUDIO_DEFAULT_TAB } from "@/lib/to-chuc/studio-routes";
