"use client";

import { useEffect, useMemo, useState } from "react";

import { EntityLightJourneyFeed } from "@/components/tag/EntityLightJourneyFeed";
import { TruongDoanProjectMasonry } from "@/components/truong/TruongDoanProjectMasonry";
import { TruongDoanToolbar } from "@/components/truong/TruongDoanToolbar";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import type { OrgDoanProjectItem } from "@/lib/journey/org-milestone-tag-types";
import { doanProjectYearOptions } from "@/lib/truong/doan-project-mock";
import {
  sortDoanProjects,
  type DoanViewMode,
} from "@/lib/truong/doan-project-sort";
import type { TagAggSort } from "@/lib/tag/aggregation-types";

const ALL_YEAR = "";
const ALL_NGANH = "";

async function fetchJson<T>(
  url: string,
  signal: AbortSignal,
): Promise<T | null> {
  const res = await fetch(url, { cache: "no-store", signal });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export function TruongTabDoanSinhVien() {
  const inline = useTruongInlineEdit();
  const orgId = inline?.orgId;
  const [projects, setProjects] = useState<OrgDoanProjectItem[]>([]);
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingMilestones, setLoadingMilestones] = useState(false);
  const [view, setView] = useState<DoanViewMode>("grid");
  const [sort, setSort] = useState<TagAggSort>("moi_nhat");

  useEffect(() => {
    if (!orgId) {
      setProjects([]);
      setLoadingProjects(false);
      return;
    }

    const controller = new AbortController();
    setLoadingProjects(true);
    void fetchJson<{ projects?: OrgDoanProjectItem[] }>(
      `/api/org/${orgId}/doan-projects`,
      controller.signal,
    )
      .then((json) => {
        setProjects(Array.isArray(json?.projects) ? json.projects : []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setProjects([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingProjects(false);
      });

    return () => controller.abort();
  }, [orgId]);

  useEffect(() => {
    if (!orgId) {
      setMilestones([]);
      setLoadingMilestones(false);
      return;
    }

    const controller = new AbortController();
    setLoadingMilestones(true);
    void fetchJson<{ milestones?: MilestoneItem[] }>(
      `/api/org/${orgId}/doan-milestones?sort=${encodeURIComponent(sort)}`,
      controller.signal,
    )
      .then((json) => {
        setMilestones(Array.isArray(json?.milestones) ? json.milestones : []);
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
  }, [orgId, sort]);

  const yearOptions = useMemo(() => doanProjectYearOptions(projects), [projects]);
  const [yearFilter, setYearFilter] = useState(ALL_YEAR);
  const [nganhFilter, setNganhFilter] = useState(ALL_NGANH);

  const nganhOptions = useMemo(() => {
    const fromPrograms = (inline?.programs ?? []).map((p) => p.nganhTitle);
    const fromProjects = projects
      .map((p) => p.nganhLabel)
      .filter((l): l is string => Boolean(l?.trim()));
    return [...new Set([...fromPrograms, ...fromProjects])].sort((a, b) =>
      a.localeCompare(b, "vi"),
    );
  }, [inline?.programs, projects]);

  const filteredProjects = useMemo(() => {
    const yearNum = yearFilter ? Number(yearFilter) : null;
    return projects.filter((p) => {
      if (yearNum != null && p.nam !== yearNum) return false;
      if (nganhFilter && p.nganhLabel !== nganhFilter) return false;
      return true;
    });
  }, [projects, yearFilter, nganhFilter]);

  const sortedProjects = useMemo(
    () => sortDoanProjects(filteredProjects, sort),
    [filteredProjects, sort],
  );

  const allowedMocIds = useMemo(
    () => new Set(filteredProjects.map((p) => p.cotMocId)),
    [filteredProjects],
  );

  const filteredMilestones = useMemo(
    () =>
      milestones.filter((m) => allowedMocIds.has(m.cotMocId ?? m.id)),
    [allowedMocIds, milestones],
  );

  const waitingForProjects = loadingProjects && projects.length === 0;
  const waitingForTimeline =
    view === "timeline" && loadingMilestones && milestones.length === 0;

  const showEmpty =
    !waitingForProjects &&
    !waitingForTimeline &&
    (view === "grid"
      ? sortedProjects.length === 0
      : filteredMilestones.length === 0);

  return (
    <>
      <div className="sec-hdr">
        <span className="sec-num">05</span>
        <h2 className="sec-title">
          Đồ án <em>sinh viên</em>
        </h2>
      </div>

      <TruongDoanToolbar
        sort={sort}
        view={view}
        yearFilter={yearFilter}
        yearOptions={yearOptions}
        nganhFilter={nganhFilter}
        nganhOptions={nganhOptions}
        onViewChange={setView}
        onSortChange={setSort}
        onYearChange={setYearFilter}
        onNganhChange={setNganhFilter}
      />

      {waitingForProjects || waitingForTimeline ? (
        <p className="tdh-placeholder">Đang tải đồ án…</p>
      ) : showEmpty ? (
        <p className="tdh-placeholder">
          Chưa có đồ án nào được gắn vào trường
          {nganhFilter ? ` — ngành ${nganhFilter}` : ""}
          {yearFilter ? ` trong năm ${yearFilter}` : ""}.
          Sinh viên gắn tổ chức từ Journey — admin duyệt tại nút Thông báo.
        </p>
      ) : view === "grid" ? (
        <TruongDoanProjectMasonry projects={sortedProjects} />
      ) : (
        <section className="entity-light-works tdh-doan-works" aria-label="Đồ án sinh viên">
          <EntityLightJourneyFeed
            milestones={filteredMilestones}
            sort={sort}
            viewerProfileId={null}
            ariaLabel="Đồ án sinh viên"
          />
        </section>
      )}
    </>
  );
}
