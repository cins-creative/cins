"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { HinhAnhTabPanel } from "@/components/truong/HinhAnhTabPanel";
import { TruongAdminToolbar } from "@/components/truong/inline/TruongAdminToolbar";
import {
  TruongInlineEditProvider,
  useTruongInlineEdit,
} from "@/components/truong/inline/TruongInlineEditContext";
import { TruongOrgCover } from "@/components/truong/TruongOrgCover";
import { StudioPageSettingsModal } from "@/components/to-chuc/StudioPageSettingsModal";
import { StudioSidebar } from "@/components/to-chuc/StudioSidebar";
import { StudioJobsSidebar } from "@/components/to-chuc/StudioJobsSidebar";
import { StudioTabBaiDang } from "@/components/to-chuc/StudioTabBaiDang";
import { StudioTabTuyenDung } from "@/components/to-chuc/tabs/StudioTabTuyenDung";
import {
  STUDIO_SHOWCASE_LOAI,
  STUDIO_TAB_IDS,
  STUDIO_TAB_LABELS,
  type StudioTabId,
} from "@/lib/to-chuc/studio-page-config";
import {
  STUDIO_DEFAULT_TAB,
  parseStudioTabFromPathname,
  studioTabPath,
} from "@/lib/to-chuc/studio-routes";
import { studioToInlinePayload } from "@/lib/to-chuc/studio-inline-payload";
import type { StudioDetailPayload, StudioOwner } from "@/lib/to-chuc/studio-page-queries";
import type { StudioJob } from "@/lib/to-chuc/studio-tuyen-dung-types";
import type { SystemRole } from "@/lib/auth/system-role";

const TABS = STUDIO_TAB_IDS.map((id) => ({
  id,
  label: STUDIO_TAB_LABELS[id],
})) satisfies ReadonlyArray<{ id: StudioTabId; label: string }>;

type Props = {
  payload: StudioDetailPayload;
  jobs: StudioJob[];
  canEdit?: boolean;
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
  jobs,
  canEdit = false,
  viewerProfileId = null,
  systemRole = null,
}: Props) {
  return (
    <TruongInlineEditProvider
      canEdit={canEdit}
      systemRole={systemRole}
      initial={studioToInlinePayload(payload)}
    >
      <TruongAdminToolbar />
      <StudioDetailViewInner
        payload={payload}
        jobs={jobs}
        canEdit={canEdit}
        viewerProfileId={viewerProfileId}
      />
    </TruongInlineEditProvider>
  );
}

function StudioDetailViewInner({
  payload,
  jobs,
  canEdit = false,
  viewerProfileId = null,
}: Omit<Props, "systemRole">) {
  const { studio, baidang, showcase, hinhanh } = payload;
  const ctx = useTruongInlineEdit();
  const editableMedia = canEdit && Boolean(ctx?.isEditing);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pathname = usePathname();
  const tab = useMemo(
    () => parseStudioTabFromPathname(pathname ?? ""),
    [pathname],
  );
  const [mountedTabs, setMountedTabs] = useState<Set<StudioTabId>>(
    () => new Set([tab]),
  );

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

  const showcaseCount = useMemo(() => {
    if (ctx?.baidang) {
      return ctx.baidang.filter(
        (p) =>
          String(p.loai_bai_dang ?? "")
            .trim()
            .toLowerCase() === STUDIO_SHOWCASE_LOAI,
      ).length;
    }
    return showcase.length;
  }, [ctx?.baidang, showcase.length]);

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

  return (
    <div
      className={`tdh-v6-shell${ctx?.isEditing ? " tdh-v6-shell--editing" : ""}`}
    >
      <StudioSidebar
        studio={studio}
        openJobCount={openJobs.length}
        showcaseCount={showcaseCount}
        canEditMedia={canEdit}
        onOpenSettings={canEdit ? () => setSettingsOpen(true) : undefined}
      />

      <div className="tdh-v6-center" id="cso-shell-panel-content">
        <div className="tdh-v6-cover-mobile">
          <TruongOrgCover
            school={coverOwner}
            layout="v6"
            editable={editableMedia}
          />
        </div>

        <div className="tdh-v6-tabs-bar">
          <div
            className="tdh-v6-tabs"
            role="tablist"
            aria-label="Nội dung studio / doanh nghiệp"
          >
            {TABS.map((t) => (
              <Link
                key={t.id}
                href={studioTabPath(studio.slug, t.id)}
                scroll={false}
                role="tab"
                aria-selected={tab === t.id}
                id={`cso-tab-${t.id}`}
                aria-controls={`cso-panel-${t.id}`}
                className={`tdh-v6-tab${tab === t.id ? " on" : ""}`}
              >
                {t.label}
              </Link>
            ))}
          </div>
        </div>

        {TABS.map((t) => {
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
                  variant="showcase"
                  posts={showcase}
                  owner={coverOwner}
                  guestEmptyMessage="Chưa có dự án nào trong showcase. Các tác phẩm và dự án tiêu biểu sẽ xuất hiện tại đây."
                />
              ) : null}

              {t.id === "tuyen-dung" ? (
                <StudioTabTuyenDung
                  jobs={jobs}
                  orgId={studio.id}
                  orgTen={studio.ten}
                  canEdit={canEdit}
                  viewerLoggedIn={Boolean(viewerProfileId)}
                />
              ) : null}

              {t.id === "hinh-anh" ? (
                <HinhAnhTabPanel
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

      <StudioJobsSidebar jobs={openJobs} orgSlug={studio.slug} />

      {canEdit ? (
        <StudioPageSettingsModal
          open={settingsOpen}
          orgId={studio.id}
          onClose={() => setSettingsOpen(false)}
          onSaved={(patch) => {
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
  );
}

export { STUDIO_DEFAULT_TAB };
