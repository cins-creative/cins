"use client";

import { Eye, EyeOff, Unlink } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { GalleryVideoPlayBadge } from "@/components/journey/GalleryItemVisual";
import { JourneyCoverImage } from "@/components/journey/JourneyCoverImage";
import type { OrgDoanProjectItem } from "@/lib/journey/org-milestone-tag-types";
import {
  displayMediaPostTitle,
  isGalleryVideoCoverSrc,
} from "@/lib/journey/post-media";
import { sortDoanProjectsForPublic } from "@/lib/truong/doan-project-sort";

import "@/app/co-so/cso-sp-admin.css";

type Props = {
  orgId: string;
  /** Nếu không truyền — tự fetch `scope=admin`. */
  projects?: OrgDoanProjectItem[];
  onUpdated?: (item: OrgDoanProjectItem) => void;
  /** Sau khi gỡ tag khỏi org (detach). */
  onDetached?: (requestId: string) => void;
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

async function detachProject(orgId: string, requestId: string): Promise<void> {
  const res = await fetch(
    `/api/org/${encodeURIComponent(orgId)}/milestone-tag-requests/${encodeURIComponent(requestId)}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "detach" }),
    },
  );
  const json = (await res.json()) as { error?: string };
  if (!res.ok) {
    throw new Error(json.error ?? "Không gỡ được.");
  }
}

function studentInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

function DoanAdminProjectCell({ project }: { project: OrgDoanProjectItem }) {
  const hasImage = Boolean(project.coverSrc);
  const isVideo = project.isVideo ?? isGalleryVideoCoverSrc(project.coverSrc);
  const displayTitle = displayMediaPostTitle(project.projectTitle);
  const href = project.href?.trim() || null;

  const media = (
    <>
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
    </>
  );

  if (!href) {
    return <span className="cso-sp-admin-work-hit is-static">{media}</span>;
  }

  return (
    <a
      className="cso-sp-admin-work-hit"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Mở tác phẩm ${displayTitle} (tab mới)`}
    >
      {media}
    </a>
  );
}

/**
 * Bảng quản trị hiển thị / thứ tự bài học viên trên tường (CSĐT + trường).
 * Dùng trong panel «Quản lý bài học viên» (quan-ly / sidebar).
 */
export function CoSoDoanSanPhamAdmin({
  orgId,
  projects: projectsProp,
  onUpdated,
  onDetached,
}: Props) {
  const [projects, setProjects] = useState<OrgDoanProjectItem[]>(projectsProp ?? []);
  const [loading, setLoading] = useState(!projectsProp);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scoreDraft, setScoreDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (projectsProp) {
      setProjects(projectsProp);
      setLoading(false);
      setLoadError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    void fetch(
      `/api/org/${encodeURIComponent(orgId)}/doan-projects?scope=admin`,
      { cache: "no-store", credentials: "include", signal: controller.signal },
    )
      .then(async (res) => {
        const json = (await res.json()) as {
          projects?: OrgDoanProjectItem[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(json.error ?? "Không tải được danh sách.");
        }
        setProjects(Array.isArray(json.projects) ? json.projects : []);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setProjects([]);
        setLoadError(err instanceof Error ? err.message : "Lỗi mạng.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [orgId, projectsProp]);

  const applyUpdated = useCallback(
    (item: OrgDoanProjectItem) => {
      setProjects((prev) =>
        prev.map((p) => (p.id === item.id ? item : p)),
      );
      onUpdated?.(item);
    },
    [onUpdated],
  );

  const runPatch = useCallback(
    async (
      project: OrgDoanProjectItem,
      body: { hienThiSanPham?: boolean; diemSapXep?: number },
    ) => {
      setBusyId(project.id);
      setError(null);
      try {
        const item = await patchProject(orgId, project.id, body);
        applyUpdated(item);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không lưu được.");
      } finally {
        setBusyId(null);
      }
    },
    [orgId, applyUpdated],
  );

  function commitScore(project: OrgDoanProjectItem) {
    const raw = scoreDraft[project.id];
    const parsed = raw === undefined ? project.diemSapXep : Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 9999) {
      setError("Thứ tự hiển thị phải từ 0 đến 9999.");
      return;
    }
    if (Math.round(parsed) === project.diemSapXep) return;
    void runPatch(project, { diemSapXep: Math.round(parsed) });
  }

  function handleToggleVisibility(project: OrgDoanProjectItem) {
    if (busyId === project.id) return;
    const nextHienThi = !project.hienThiSanPham;
    applyUpdated({ ...project, hienThiSanPham: nextHienThi });
    setBusyId(project.id);
    setError(null);
    void patchProject(orgId, project.id, { hienThiSanPham: nextHienThi })
      .then((item) => {
        applyUpdated(item);
      })
      .catch((err) => {
        applyUpdated(project);
        setError(err instanceof Error ? err.message : "Không lưu được.");
      })
      .finally(() => {
        setBusyId(null);
      });
  }

  function handleDetach(project: OrgDoanProjectItem) {
    if (busyId === project.id) return;
    if (
      !window.confirm(
        "Gỡ milestone này khỏi trang tổ chức? Đồ án sẽ không còn hiển thị trên trang tổ chức.",
      )
    ) {
      return;
    }
    setBusyId(project.id);
    setError(null);
    void detachProject(orgId, project.id)
      .then(() => {
        setProjects((prev) => prev.filter((p) => p.id !== project.id));
        onDetached?.(project.id);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Không gỡ được.");
      })
      .finally(() => {
        setBusyId(null);
      });
  }

  const sorted = sortDoanProjectsForPublic(projects);

  return (
    <section
      className="cso-sp-admin cso-sp-admin--embedded"
      aria-label="Quản lý hiển thị sản phẩm học viên trên tường"
    >
      <p className="cso-sp-admin-lead cso-sp-admin-lead--modal">
        Bật / tắt và sắp xếp bài đã duyệt để hiện trên tab sản phẩm công khai.
        Gỡ khỏi trang nếu không còn gắn tổ chức.
      </p>

      {loading ? (
        <p className="cso-sp-admin-meta cso-sp-admin-meta--modal">Đang tải…</p>
      ) : null}
      {loadError ? (
        <p className="cso-sp-admin-err" role="alert">
          {loadError}
        </p>
      ) : null}
      {error ? (
        <p className="cso-sp-admin-err" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !loadError && projects.length === 0 ? (
        <p className="cso-sp-admin-meta cso-sp-admin-meta--modal">
          Chưa có bài nào được duyệt gắn org. Duyệt ở «Chờ duyệt» trước.
        </p>
      ) : null}

      {!loading && projects.length > 0 ? (
        <div className="cso-sp-admin-table-wrap">
          <table className="cso-sp-admin-table">
            <thead>
              <tr>
                <th scope="col">Học viên</th>
                <th scope="col">Tác phẩm</th>
                <th scope="col">Khóa</th>
                <th scope="col">Hiển thị</th>
                <th scope="col">Thứ tự hiển thị</th>
                <th scope="col">
                  <span className="cso-sp-admin-sr-only">Gỡ</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((project) => {
                const busy = busyId === project.id;
                const scoreValue =
                  scoreDraft[project.id] ?? String(project.diemSapXep);
                return (
                  <tr
                    key={project.id}
                    className={project.hienThiSanPham ? "is-on" : ""}
                  >
                    <td className="cso-sp-admin-student">{project.studentName}</td>
                    <td className="cso-sp-admin-title-cell">
                      <DoanAdminProjectCell project={project} />
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
                        onClick={() => handleToggleVisibility(project)}
                      >
                        {project.hienThiSanPham ? (
                          <Eye size={15} strokeWidth={2.2} aria-hidden />
                        ) : (
                          <EyeOff size={15} strokeWidth={2.2} aria-hidden />
                        )}
                        <span>
                          {project.hienThiSanPham ? "Đang hiện" : "Ẩn"}
                        </span>
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
                        aria-label={`Thứ tự hiển thị: ${project.projectTitle}`}
                        onChange={(e) =>
                          setScoreDraft((prev) => ({
                            ...prev,
                            [project.id]: e.target.value,
                          }))
                        }
                        onBlur={() => commitScore(project)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitScore(project);
                          }
                        }}
                      />
                    </td>
                    <td className="cso-sp-admin-detach-cell">
                      <button
                        type="button"
                        className="cso-sp-admin-detach"
                        disabled={busy}
                        title="Gỡ khỏi trang tổ chức"
                        onClick={() => handleDetach(project)}
                      >
                        <Unlink size={14} strokeWidth={2.2} aria-hidden />
                        <span>Gỡ khỏi trang</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
