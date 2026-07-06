"use client";

import { useEffect, useMemo, useState } from "react";

import { TruongDoanProjectMasonry } from "@/components/truong/TruongDoanProjectMasonry";
import type { OrgDoanProjectItem } from "@/lib/journey/org-milestone-tag-types";
import { sortDoanProjects } from "@/lib/truong/doan-project-sort";

type Props = {
  orgId: string;
  num?: string;
};

export function CoSoTabSanPham({ orgId, num = "03" }: Props) {
  const [projects, setProjects] = useState<OrgDoanProjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    void fetch(`/api/org/${encodeURIComponent(orgId)}/doan-projects`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        const json = (await res.json()) as { projects?: OrgDoanProjectItem[] };
        if (!res.ok) throw new Error("fetch failed");
        setProjects(Array.isArray(json.projects) ? json.projects : []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setProjects([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [orgId]);

  const sortedProjects = useMemo(
    () => sortDoanProjects(projects, "moi_nhat"),
    [projects],
  );

  return (
    <>
      <div className="sec-hdr">
        <span className="sec-num">{num}</span>
        <h2 className="sec-title">
          Sản phẩm <em>học viên</em>
        </h2>
      </div>

      {loading ? (
        <p className="tdh-placeholder">Đang tải sản phẩm học viên…</p>
      ) : sortedProjects.length === 0 ? (
        <p className="tdh-placeholder">
          Chưa có sản phẩm học viên nào được gắn với cơ sở. Học viên gắn cơ sở từ
          Journey — admin duyệt tại Thông báo.
        </p>
      ) : (
        <TruongDoanProjectMasonry projects={sortedProjects} />
      )}
    </>
  );
}
