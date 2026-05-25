"use client";

import { useEffect, useMemo, useState } from "react";

import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import {
  TruongYearSelect,
  useYearFilter,
} from "@/components/truong/YearFilterProvider";
import { TruongYearTabsPicker } from "@/components/truong/TruongYearTabsPicker";
import { TruongTimelineMocEditor } from "@/components/truong/tuyensinh/TruongTimelineMocEditor";
import { truongInlineFetch } from "@/lib/truong/inline-api";
import {
  aggregateTimelineForYear,
  buildTimelineStepsFromMocDraft,
  buildTuyenSinhTimelineSteps,
  emptyTimelineMoc,
  parseTimelineMocStore,
  resolveTimelineMocForRow,
  serializeTimelineMocStore,
  timelineLinkHref,
  timelineLinkLabel,
  type TuyenSinhTimelineMoc,
} from "@/lib/truong/timeline-steps";

export function TruongAdmissionTimelineSidebar() {
  const ctx = useTruongInlineEdit();
  const { year } = useYearFilter();
  const tuyenSinh = ctx?.tuyenSinh ?? [];
  const isEditing = ctx?.isEditing ?? false;

  const [timelineMoc, setTimelineMoc] = useState<TuyenSinhTimelineMoc[]>([]);
  const [tlLink, setTlLink] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  const yearRows = useMemo(
    () => tuyenSinh.filter((r) => r.nam === year),
    [tuyenSinh, year],
  );

  const timelineRow = useMemo(
    () => aggregateTimelineForYear(yearRows),
    [yearRows],
  );

  const timelineSteps = useMemo(() => {
    if (isEditing && editOpen) {
      const draft = buildTimelineStepsFromMocDraft(timelineMoc);
      if (draft.length) return draft;
    }
    if (timelineRow) return buildTuyenSinhTimelineSteps(timelineRow);
    return [];
  }, [timelineRow, isEditing, editOpen, timelineMoc]);

  function openEdit() {
    setEditOpen(true);
  }

  useEffect(() => {
    if (!editOpen) return;
    const loaded = timelineRow ? resolveTimelineMocForRow(timelineRow) : [];
    setTimelineMoc(loaded.length ? loaded : [emptyTimelineMoc()]);
    setTlLink(timelineRow?.link_thong_tin ?? "");
  }, [editOpen, timelineRow]);

  async function saveTimeline() {
    if (!ctx) return;
    if (!yearRows.length) {
      ctx.showToast(
        `Chưa có dữ liệu tuyển sinh năm ${year}. Thêm dữ liệu năm trên tab Tuyển sinh trước.`,
      );
      return;
    }
    const serialized = serializeTimelineMocStore(timelineMoc);
    const savedMoc = parseTimelineMocStore(serialized);
    if (!savedMoc?.length) {
      ctx.showToast(
        "Cần ít nhất một mốc có tên và ngày (từ hoặc đến).",
      );
      return;
    }
    const patch = {
      ghi_chu_timeline: serialized,
      link_thong_tin: tlLink.trim() || null,
    };
    const prev = ctx.tuyenSinh;
    ctx.setTuyenSinh((list) =>
      list.map((r) => (r.nam === year ? { ...r, ...patch } : r)),
    );
    const results = await Promise.all(
      yearRows.map((row) =>
        truongInlineFetch(ctx.orgId, `/tuyen-sinh/${row.id}`, {
          method: "PATCH",
          body: JSON.stringify(patch),
        }),
      ),
    );
    if (results.some((r) => !r.ok)) {
      ctx.setTuyenSinh(prev);
      ctx.showToast("Lưu lịch thi thất bại");
      return;
    }
    ctx.showToast("Đã cập nhật lịch tuyển sinh");
    setEditOpen(false);
  }

  return (
    <>
      <aside className="tdh-admission-side" aria-label="Lịch tuyển sinh">
        <div className="tdh-admission-side-head">
          <div className="tdh-admission-side-year-row">
            <p className="timeline-year-kicker">Tuyển sinh</p>
            <TruongYearSelect label="Năm lịch" />
          </div>
          {isEditing ? (
            <button
              type="button"
              className="tdh-admission-side-edit"
              onClick={() => (editOpen ? setEditOpen(false) : openEdit())}
            >
              {editOpen ? "Đóng sửa lịch" : "Sửa lịch mốc"}
            </button>
          ) : null}
        </div>

        <section className="timeline-section timeline-section--rail">
          {timelineSteps.length === 0 ? (
            <p className="ptxt-empty-text tdh-admission-side-empty">
              Chưa có lịch cho năm {year}.
              {isEditing ? " Bấm «Sửa lịch mốc» để thêm." : null}
            </p>
          ) : (
            <div className="timeline">
              {timelineSteps.map((step) => (
                <div
                  key={step.id}
                  className={`timeline-item ${step.status}`}
                >
                  <div className="timeline-dot">{step.dot}</div>
                  <div className="timeline-content">
                    <div className="timeline-date">{step.dateLabel}</div>
                    {step.link ? (
                      <a
                        href={timelineLinkHref(step.link)}
                        className="timeline-label timeline-label--link"
                        target="_blank"
                        rel="noopener noreferrer"
                        title={timelineLinkLabel(step.link)}
                      >
                        {step.label}
                      </a>
                    ) : (
                      <div className="timeline-label">{step.label}</div>
                    )}
                    {step.desc ? (
                      <p className="timeline-desc">{step.desc}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </aside>

      <TruongInlineModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        className="tdh-inline-modal--wide tdh-timeline-moc-modal"
        labelledBy="tdh-timeline-moc-title"
      >
        <div className="tdh-timeline-moc-modal-inner">
          <header className="tdh-timeline-moc-modal-head">
            <h3 id="tdh-timeline-moc-title" className="tdh-inline-modal-title">
              Lịch tuyển sinh
            </h3>
            <div className="tdh-timeline-moc-modal-year">
              <span className="tdh-timeline-moc-year-label">Năm</span>
              <TruongYearTabsPicker className="tdh-timeline-moc-year-tabs" />
            </div>
            <p className="tdh-calc-config-lead">
              Áp dụng cho tất cả ngành trong năm {year}.
              {yearRows.length === 0
                ? " Chưa có bản ghi tuyển sinh — thêm dữ liệu năm trước khi lưu lịch."
                : null}
            </p>
          </header>
          <div className="tdh-timeline-moc-modal-body">
            <TruongTimelineMocEditor
              moc={timelineMoc}
              onChange={setTimelineMoc}
              linkThongTin={tlLink}
              onLinkThongTinChange={setTlLink}
            />
          </div>
          <div className="tdh-inline-modal-actions tdh-timeline-moc-modal-foot">
            <button
              type="button"
              className="tdh-inline-btn ghost"
              onClick={() => setEditOpen(false)}
            >
              Hủy
            </button>
            <button
              type="button"
              className="tdh-inline-btn primary"
              disabled={yearRows.length === 0}
              onClick={() => void saveTimeline()}
            >
              Lưu lịch {year}
            </button>
          </div>
        </div>
      </TruongInlineModal>
    </>
  );
}
