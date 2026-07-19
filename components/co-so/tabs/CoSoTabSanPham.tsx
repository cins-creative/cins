"use client";

import { useEffect, useMemo, useState } from "react";

import { ContentSurfaceViewToggle } from "@/components/cins/ContentSurfaceViewToggle";
import { CoSoDoanSanPhamAdmin } from "@/components/co-so/CoSoDoanSanPhamAdmin";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import { EntityLightJourneyFeed } from "@/components/tag/EntityLightJourneyFeed";
import { TruongDoanProjectMasonry } from "@/components/truong/TruongDoanProjectMasonry";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import type { ContentSurfaceView } from "@/lib/cins/content-surface-view";
import type { OrgDoanProjectItem } from "@/lib/journey/org-milestone-tag-types";
import { sortDoanProjectsForPublic } from "@/lib/truong/doan-project-sort";

type Props = {
  orgId: string;
  num?: string;
  canManageKhoaHoc?: boolean;
};

const ALL_KHOA = "";

type KhoaOption = { id: string; ten: string };

async function fetchProjects(
  orgId: string,
  params: URLSearchParams,
  signal: AbortSignal,
): Promise<OrgDoanProjectItem[]> {
  const res = await fetch(
    `/api/org/${encodeURIComponent(orgId)}/doan-projects?${params.toString()}`,
    { cache: "no-store", signal, credentials: "include" },
  );
  const json = (await res.json()) as { projects?: OrgDoanProjectItem[] };
  if (!res.ok) throw new Error("fetch failed");
  return Array.isArray(json.projects) ? json.projects : [];
}

export function CoSoTabSanPham({
  orgId,
  num = "03",
  canManageKhoaHoc = false,
}: Props) {
  const ctx = useTruongInlineEdit();
  const isManaging = Boolean(canManageKhoaHoc && ctx?.isEditing);

  const [adminProjects, setAdminProjects] = useState<OrgDoanProjectItem[]>([]);
  const [publicProjects, setPublicProjects] = useState<OrgDoanProjectItem[]>([]);
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [loadingPublic, setLoadingPublic] = useState(true);
  const [loadingMilestones, setLoadingMilestones] = useState(false);
  const [khoaFilter, setKhoaFilter] = useState(ALL_KHOA);
  const [khoaOptions, setKhoaOptions] = useState<KhoaOption[]>([]);
  /** Mặc định lưới gọn — khớp ContentSurfaceViewToggle «Lưới gọn». */
  const [view, setView] = useState<ContentSurfaceView>("masonry");

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/co-so/${encodeURIComponent(orgId)}/khoa-hoc`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (res) => {
        const json = (await res.json()) as {
          khoaHoc?: Array<{ id: string; tenKhoaHoc: string }>;
        };
        if (!res.ok) return;
        setKhoaOptions(
          (json.khoaHoc ?? []).map((k) => ({ id: k.id, ten: k.tenKhoaHoc })),
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) setKhoaOptions([]);
      });
    return () => controller.abort();
  }, [orgId]);

  useEffect(() => {
    if (!isManaging) {
      setAdminProjects([]);
      setLoadingAdmin(false);
      return;
    }

    const controller = new AbortController();
    setLoadingAdmin(true);
    void fetchProjects(
      orgId,
      new URLSearchParams({ scope: "admin" }),
      controller.signal,
    )
      .then(setAdminProjects)
      .catch(() => {
        if (!controller.signal.aborted) setAdminProjects([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingAdmin(false);
      });

    return () => controller.abort();
  }, [orgId, isManaging]);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingPublic(true);
    const params = new URLSearchParams({ featured: "1" });
    if (khoaFilter) params.set("khoaHocId", khoaFilter);

    void fetchProjects(orgId, params, controller.signal)
      .then(setPublicProjects)
      .catch(() => {
        if (!controller.signal.aborted) setPublicProjects([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingPublic(false);
      });

    return () => controller.abort();
  }, [orgId, khoaFilter]);

  useEffect(() => {
    if (view !== "timeline") return;

    const controller = new AbortController();
    setLoadingMilestones(true);
    void fetch(
      `/api/org/${encodeURIComponent(orgId)}/doan-milestones?sort=moi_nhat`,
      { cache: "no-store", signal: controller.signal },
    )
      .then(async (res) => {
        const json = (await res.json()) as { milestones?: MilestoneItem[] };
        if (!res.ok) throw new Error("fetch failed");
        setMilestones(Array.isArray(json.milestones) ? json.milestones : []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setMilestones([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingMilestones(false);
      });

    return () => {
      controller.abort();
      setLoadingMilestones(false);
    };
  }, [orgId, view]);

  const sortedPublic = useMemo(
    () => sortDoanProjectsForPublic(publicProjects),
    [publicProjects],
  );

  const allowedMocIds = useMemo(
    () => new Set(sortedPublic.map((p) => p.cotMocId)),
    [sortedPublic],
  );

  const filteredMilestones = useMemo(
    () => milestones.filter((m) => allowedMocIds.has(m.cotMocId ?? m.id)),
    [allowedMocIds, milestones],
  );

  function handleAdminUpdated(item: OrgDoanProjectItem) {
    setAdminProjects((prev) =>
      prev.map((p) => (p.id === item.id ? item : p)),
    );
    setPublicProjects((prev) => {
      const without = prev.filter((p) => p.id !== item.id);
      if (!item.hienThiSanPham) return without;
      if (khoaFilter && item.khoaHocId !== khoaFilter) return without;
      const next = [...without, item];
      return sortDoanProjectsForPublic(next);
    });
  }

  const waitingTimeline =
    view === "timeline" && loadingMilestones && milestones.length === 0;

  const showPublicEmpty =
    !loadingPublic &&
    !waitingTimeline &&
    sortedPublic.length === 0 &&
    !(isManaging && loadingAdmin);

  return (
    <>
      <div className="sec-hdr">
        <span className="sec-num">{num}</span>
        <h2 className="sec-title">
          Sản phẩm <em>học viên</em>
        </h2>
      </div>

      {isManaging ? (
        loadingAdmin ? (
          <p className="tdh-placeholder">Đang tải danh sách quản trị…</p>
        ) : adminProjects.length === 0 ? (
          <p className="tdh-placeholder">
            Chưa có sản phẩm nào được duyệt. Học viên gắn cơ sở từ Journey — duyệt
            tại Thông báo.
          </p>
        ) : (
          <CoSoDoanSanPhamAdmin
            orgId={orgId}
            projects={adminProjects}
            onUpdated={handleAdminUpdated}
          />
        )
      ) : null}

      {!isManaging || adminProjects.length > 0 ? (
        <div
          className={`cso-sp-public${isManaging ? " cso-sp-public--below-admin" : ""}`}
        >
          <div className="cso-sp-filter-bar" role="group" aria-label="Lọc sản phẩm">
            <label className="cso-sp-filter">
              <span className="cso-sp-filter-label">Khóa học</span>
              <select
                className="cso-sp-filter-select"
                value={khoaFilter}
                onChange={(e) => setKhoaFilter(e.target.value)}
              >
                <option value={ALL_KHOA}>Tất cả khóa</option>
                {khoaOptions.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.ten}
                  </option>
                ))}
              </select>
            </label>
            <ContentSurfaceViewToggle view={view} onViewChange={setView} />
          </div>

          {loadingPublic || waitingTimeline ? (
            <p className="tdh-placeholder">Đang tải sản phẩm học viên…</p>
          ) : showPublicEmpty ? (
            <p className="tdh-placeholder">
              {isManaging
                ? "Chưa có sản phẩm nào được bật hiển thị công khai. Bật «Hiển thị» trong Quản lý bài học viên."
                : "Chưa có sản phẩm học viên nào được cơ sở chọn hiển thị."}
            </p>
          ) : view === "timeline" ? (
            <section
              className="entity-light-works tdh-doan-works"
              aria-label="Sản phẩm học viên"
            >
              <EntityLightJourneyFeed
                milestones={filteredMilestones}
                sort="moi_nhat"
                viewerProfileId={null}
                ariaLabel="Sản phẩm học viên"
                hostOrgSlug={ctx?.school.slug ?? null}
                hostOrgName={ctx?.school.ten ?? null}
              />
            </section>
          ) : (
            <TruongDoanProjectMasonry
              projects={sortedPublic}
              layout={view === "masonry" ? "masonry" : "card"}
            />
          )}
        </div>
      ) : null}
    </>
  );
}
