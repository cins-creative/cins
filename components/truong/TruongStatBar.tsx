"use client";

import { TruongEditableHocPhi } from "@/components/truong/inline/TruongEditableHocPhi";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { formatDiemChuan } from "@/lib/truong/diem-chuan";
import { formatHocPhiLabel } from "@/lib/truong/display";
import type { TruongStats } from "@/lib/truong/types";

type Props = { stats?: TruongStats };

export function TruongStatBar({ stats: statsProp }: Props) {
  const ctx = useTruongInlineEdit();
  const stats = ctx?.stats ?? statsProp;
  if (!stats) return null;

  const hocPhiLabel =
    stats.hocPhiLabel ??
    (ctx
      ? formatHocPhiLabel(
          ctx.school.hoc_phi_nam_tu,
          ctx.school.hoc_phi_nam_den,
        )
      : null);

  const hocPhiLong = (hocPhiLabel?.length ?? 0) > 18;

  return (
    <div className="tdh-detail-stats fade f2">
      <div className="tdh-list-stats">
        <div className="tdh-list-stats-grid tdh-list-stats-grid--4">
          <div className="tdh-list-stat">
            <div className="tdh-list-stat-label">Điểm chuẩn cao nhất</div>
            <div className="tdh-list-stat-value">
              {stats.diemChuanMax != null
                ? formatDiemChuan(stats.diemChuanMax)
                : "—"}
              {stats.diemChuanMax != null ? (
                <span className="unit">/{stats.year}</span>
              ) : null}
            </div>
          </div>
          <div className="tdh-list-stat">
            <div className="tdh-list-stat-label">Chỉ tiêu</div>
            <div className="tdh-list-stat-value">
              {stats.chiTieuTong != null
                ? stats.chiTieuTong.toLocaleString("vi-VN")
                : "—"}
            </div>
          </div>
          {ctx?.isEditing ? (
            <TruongEditableHocPhi />
          ) : (
            <div className="tdh-list-stat">
              <div className="tdh-list-stat-label">Học phí</div>
              <div
                className={`tdh-list-stat-value is-text${hocPhiLong ? " is-text-long" : ""}`}
              >
                {hocPhiLabel ?? "—"}
              </div>
            </div>
          )}
          <div className="tdh-list-stat">
            <div className="tdh-list-stat-label">Journey</div>
            <div
              className={`tdh-list-stat-value${stats.journeyCount > 0 ? "" : " is-text"}`}
            >
              {stats.journeyCount > 0 ? (
                <>
                  {stats.journeyCount}
                  <span className="unit">người</span>
                </>
              ) : (
                "—"
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
