"use client";

import { Eye, EyeOff, LayoutList } from "lucide-react";
import { useCallback, useId, useState } from "react";

import { GalleryVideoPlayBadge } from "@/components/journey/GalleryItemVisual";
import { JourneyCoverImage } from "@/components/journey/JourneyCoverImage";
import { JourneyPostModal } from "@/components/journey/JourneyPostModal";
import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import type { OrgDoanProjectItem } from "@/lib/journey/org-milestone-tag-types";
import {
  displayMediaPostTitle,
  isGalleryVideoCoverSrc,
} from "@/lib/journey/post-media";
import { sortDoanProjectsForPublic } from "@/lib/truong/doan-project-sort";

type Props = {
  orgId: string;
  projects: OrgDoanProjectItem[];
  onUpdated: (item: OrgDoanProjectItem) => void;
};

function patchProject(
  orgId: string,
  requestId: string,
  body: { hienThiSanPham?: boolean; diemSapXep?: number },
): Promise<OrgDoanProjectItem> {
  return fetch(
    `/api/org/${encodeURIComponent(orgId)}/doan-projects/${encodeURIComponent(requestId)}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  ).then(async (res) => {
    const json = (await res.json()) as { item?: OrgDoanProjectItem; error?: string };
    if (!res.ok || !json.item) {
      throw new Error(json.error ?? "Không lưu được.");
    }
    return json.item;
  });
}

function studentInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

function DoanAdminProjectCell({
  project,
  onOpen,
}: {
  project: OrgDoanProjectItem;
  onOpen: (project: OrgDoanProjectItem) => void;
}) {
  const hasImage = Boolean(project.coverSrc);
  const isVideo = project.isVideo ?? isGalleryVideoCoverSrc(project.coverSrc);
  const displayTitle = displayMediaPostTitle(project.projectTitle);

  return (
    <button
      type="button"
      className="cso-sp-admin-work-hit"
      onClick={() => onOpen(project)}
      aria-label={`Xem tác phẩm ${displayTitle}`}
    >
      <span
        className="cso-sp-admin-thumb"
        style={
          !hasImage && project.coverGradient
            ? { background: project.coverGradient }
            : undefined
        }
      >
        {hasImage ? (
          <JourneyCoverImage
            src={project.coverSrc!}
            alt={project.coverAlt ?? project.projectTitle}
            width={96}
            height={72}
            className="cso-sp-admin-thumb-img"
          />
        ) : (
          <span className="cso-sp-admin-thumb-fallback" aria-hidden>
            {studentInitials(project.studentName)}
          </span>
        )}
        {isVideo ? <GalleryVideoPlayBadge /> : null}
      </span>
      <span className="cso-sp-admin-work-copy">
        <span className="cso-sp-admin-work-title">{displayTitle}</span>
        {project.milestoneTitle ? (
          <span className="cso-sp-admin-work-milestone">{project.milestoneTitle}</span>
        ) : null}
      </span>
    </button>
  );
}

type AdminTableProps = {
  projects: OrgDoanProjectItem[];
  busyId: string | null;
  scoreDraft: Record<string, string>;
  onScoreDraftChange: (id: string, value: string) => void;
  onCommitScore: (project: OrgDoanProjectItem) => void;
  onToggleVisibility: (project: OrgDoanProjectItem) => void;
  onOpenProject: (project: OrgDoanProjectItem) => void;
};

function CoSoDoanSanPhamAdminTable({
  projects,
  busyId,
  scoreDraft,
  onScoreDraftChange,
  onCommitScore,
  onToggleVisibility,
  onOpenProject,
}: AdminTableProps) {
  const sorted = sortDoanProjectsForPublic(projects);

  return (
    <div className="cso-sp-admin-table-wrap">
      <table className="cso-sp-admin-table">
        <thead>
          <tr>
            <th scope="col">Học viên</th>
            <th scope="col">Tác phẩm</th>
            <th scope="col">Khóa</th>
            <th scope="col">Hiển thị</th>
            <th scope="col">Điểm</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((project) => {
            const busy = busyId === project.id;
            const scoreValue = scoreDraft[project.id] ?? String(project.diemSapXep);
            return (
              <tr key={project.id} className={project.hienThiSanPham ? "is-on" : ""}>
                <td className="cso-sp-admin-student">{project.studentName}</td>
                <td className="cso-sp-admin-title-cell">
                  <DoanAdminProjectCell project={project} onOpen={onOpenProject} />
                </td>
                <td className="cso-sp-admin-khoa">
                  {project.khoaHocTen ?? project.nganhLabel ?? "—"}
                </td>
                <td>
                  <button
                    type="button"
                    className={`cso-sp-admin-toggle${project.hienThiSanPham ? " is-on" : ""}`}
                    disabled={busy}
                    aria-pressed={project.hienThiSanPham}
                    title={
                      project.hienThiSanPham
                        ? "Ẩn khỏi tab công khai"
                        : "Hiện trên tab công khai"
                    }
                    onClick={() => onToggleVisibility(project)}
                  >
                    {project.hienThiSanPham ? (
                      <Eye size={15} strokeWidth={2.2} aria-hidden />
                    ) : (
                      <EyeOff size={15} strokeWidth={2.2} aria-hidden />
                    )}
                    <span>{project.hienThiSanPham ? "Đang hiện" : "Ẩn"}</span>
                  </button>
                </td>
                <td>
                  <input
                    type="number"
                    className="cso-sp-admin-score"
                    min={0}
                    max={9999}
                    step={1}
                    value={scoreValue}
                    disabled={busy}
                    aria-label={`Điểm sắp xếp: ${project.projectTitle}`}
                    onChange={(e) => onScoreDraftChange(project.id, e.target.value)}
                    onBlur={() => onCommitScore(project)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onCommitScore(project);
                      }
                    }}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function CoSoDoanSanPhamAdmin({ orgId, projects, onUpdated }: Props) {
  const modalTitleId = useId();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailMilestoneId, setDetailMilestoneId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scoreDraft, setScoreDraft] = useState<Record<string, string>>({});

  const runPatch = useCallback(
    async (
      project: OrgDoanProjectItem,
      body: { hienThiSanPham?: boolean; diemSapXep?: number },
    ) => {
      setBusyId(project.id);
      setError(null);
      try {
        const item = await patchProject(orgId, project.id, body);
        onUpdated(item);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không lưu được.");
      } finally {
        setBusyId(null);
      }
    },
    [orgId, onUpdated],
  );

  function commitScore(project: OrgDoanProjectItem) {
    const raw = scoreDraft[project.id];
    const parsed = raw === undefined ? project.diemSapXep : Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 9999) {
      setError("Điểm phải từ 0 đến 9999.");
      return;
    }
    if (Math.round(parsed) === project.diemSapXep) return;
    void runPatch(project, { diemSapXep: Math.round(parsed) });
  }

  function handleScoreDraftChange(id: string, value: string) {
    setScoreDraft((prev) => ({ ...prev, [id]: value }));
  }

  function handleToggleVisibility(project: OrgDoanProjectItem) {
    void runPatch(project, { hienThiSanPham: !project.hienThiSanPham });
  }

  function openProjectDetail(project: OrgDoanProjectItem) {
    const id = project.cotMocId?.trim();
    if (!id) return;
    setDetailMilestoneId(id);
  }

  function closeAdminModal() {
    setDetailMilestoneId(null);
    setModalOpen(false);
  }

  return (
    <section className="cso-sp-admin" aria-label="Quản lý hiển thị sản phẩm học viên">
      {error && !modalOpen ? (
        <p className="cso-sp-admin-err" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        className="cso-sp-admin-open-btn"
        onClick={() => setModalOpen(true)}
      >
        <LayoutList size={16} strokeWidth={2.2} aria-hidden />
        Quản lý bài học viên
      </button>

      <TruongInlineModal
        open={modalOpen}
        onClose={closeAdminModal}
        className="tdh-inline-modal--wide cso-sp-admin-modal"
        labelledBy={modalTitleId}
      >
        <h2 id={modalTitleId} className="tdh-inline-modal-title">
          Quản lý bài học viên
        </h2>

        {error ? (
          <p className="cso-sp-admin-err" role="alert">
            {error}
          </p>
        ) : null}

        <CoSoDoanSanPhamAdminTable
          projects={projects}
          busyId={busyId}
          scoreDraft={scoreDraft}
          onScoreDraftChange={handleScoreDraftChange}
          onCommitScore={commitScore}
          onToggleVisibility={handleToggleVisibility}
          onOpenProject={openProjectDetail}
        />
      </TruongInlineModal>

      <JourneyPostModal
        milestoneId={detailMilestoneId}
        onClose={() => setDetailMilestoneId(null)}
        variant="slide-right"
        stacked
      />
    </section>
  );
}
