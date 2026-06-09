"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { TruongYearSelect } from "@/components/truong/YearFilterProvider";
import { defaultTruongNganhYear } from "@/lib/truong/diem-chuan";
import { TruongTimelineMocSingleForm } from "@/components/truong/tuyensinh/TruongTimelineMocSingleForm";
import { truongInlineFetch } from "@/lib/truong/inline-api";
import {
  aggregateTimelineForYear,
  buildTimelineStepsFromMocDraft,
  buildTuyenSinhTimelineStepsForCalendarYear,
  collectTimelineCalendarYears,
  mocMatchesCalendarYear,
  emptyTimelineMoc,
  getAdmissionTimelineFocus,
  normalizeTimelineMoc,
  parseTimelineMocStore,
  resolveTimelineMocForRow,
  serializeTimelineMocStore,
  TIMELINE_MOC_MAX_ITEMS,
  timelineLinkHref,
  timelineLinkLabel,
  tuyenSinhRowMatchesCalendarYear,
  type TuyenSinhTimelineMoc,
  type TuyenSinhTimelineStep,
} from "@/lib/truong/timeline-steps";

type StepRole = "past" | "current" | "next" | "default";
type MocModalMode = { kind: "new" } | { kind: "edit"; mocId: string };

function TimelineStepItem({
  step,
  role,
  isEditing,
  onEdit,
}: {
  step: TuyenSinhTimelineStep;
  role: StepRole;
  isEditing?: boolean;
  onEdit?: () => void;
}) {
  const className = [
    "timeline-item",
    step.status,
    role === "past" ? "timeline-item--past" : "",
    role === "current" ? "timeline-item--focus timeline-item--current" : "",
    role === "next" ? "timeline-item--focus timeline-item--next" : "",
    isEditing ? "timeline-item--editable" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <div className="timeline-dot">{step.dot}</div>
      <div className="timeline-content">
        {role === "next" ? (
          <span className="timeline-focus-kicker">Tiếp theo</span>
        ) : null}
        {role === "current" ? (
          <span className="timeline-focus-kicker timeline-focus-kicker--now">
            Hiện tại
          </span>
        ) : null}
        <div className="timeline-date">{step.dateLabel}</div>
        {step.link && !isEditing ? (
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
        {step.desc ? <p className="timeline-desc">{step.desc}</p> : null}
        {isEditing ? (
          <span className="timeline-edit-hint">Bấm để sửa hoặc xóa</span>
        ) : null}
      </div>
    </>
  );

  if (isEditing && onEdit) {
    return (
      <button type="button" className={className} onClick={onEdit}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}

export function TruongAdmissionTimelineSidebar() {
  const ctx = useTruongInlineEdit();
  const tuyenSinh = ctx?.tuyenSinh ?? [];
  const isEditing = ctx?.isEditing ?? false;

  const [timelineMoc, setTimelineMoc] = useState<TuyenSinhTimelineMoc[]>([]);
  const [tlLink, setTlLink] = useState("");
  const [showPastSteps, setShowPastSteps] = useState(false);
  const [mocModal, setMocModal] = useState<MocModalMode | null>(null);
  const persistingMocRef = useRef(false);
  const [timelineYear, setTimelineYear] = useState(defaultTruongNganhYear());

  const timelineYearOptions = useMemo(
    () => collectTimelineCalendarYears(tuyenSinh),
    [tuyenSinh],
  );

  useEffect(() => {
    if (!timelineYearOptions.length) return;
    if (!timelineYearOptions.includes(timelineYear)) {
      setTimelineYear(timelineYearOptions[0]!);
    }
  }, [timelineYearOptions, timelineYear]);

  const yearRows = useMemo(
    () =>
      tuyenSinh.filter((r) => tuyenSinhRowMatchesCalendarYear(r, timelineYear)),
    [tuyenSinh, timelineYear],
  );

  const timelineRow = useMemo(
    () => aggregateTimelineForYear(yearRows),
    [yearRows],
  );

  useEffect(() => {
    if (!isEditing) {
      setMocModal(null);
      return;
    }
    if (mocModal || persistingMocRef.current) return;
    const loaded = timelineRow ? resolveTimelineMocForRow(timelineRow) : [];
    setTimelineMoc(loaded);
    setTlLink(timelineRow?.link_thong_tin ?? "");
  }, [isEditing, timelineYear, timelineRow, mocModal]);

  const timelineSteps = useMemo(() => {
    if (isEditing) {
      const draft = buildTimelineStepsFromMocDraft(
        timelineMoc.filter((m) => mocMatchesCalendarYear(m, timelineYear)),
      );
      if (draft.length) return draft;
    }
    if (timelineRow) {
      return buildTuyenSinhTimelineStepsForCalendarYear(
        timelineRow,
        timelineYear,
      );
    }
    return [];
  }, [timelineRow, isEditing, timelineMoc, timelineYear]);

  const focus = useMemo(
    () => getAdmissionTimelineFocus(timelineSteps),
    [timelineSteps],
  );

  const pastSteps = useMemo(
    () => timelineSteps.filter((s) => focus.pastIds.has(s.id)),
    [timelineSteps, focus.pastIds],
  );

  const visibleSteps = useMemo(
    () =>
      showPastSteps
        ? timelineSteps
        : timelineSteps.filter((s) => !focus.pastIds.has(s.id)),
    [timelineSteps, focus.pastIds, showPastSteps],
  );

  const modalMoc = useMemo(() => {
    if (!mocModal) return null;
    if (mocModal.kind === "new") return emptyTimelineMoc();
    return timelineMoc.find((m) => m.id === mocModal.mocId) ?? null;
  }, [mocModal, timelineMoc]);

  function stepRole(step: TuyenSinhTimelineStep): StepRole {
    if (focus.pastIds.has(step.id)) return "past";
    if (step.id === focus.currentId) return "current";
    if (step.id === focus.nextId) return "next";
    return "default";
  }

  useEffect(() => {
    setShowPastSteps(false);
  }, [timelineYear, timelineSteps.length]);

  async function persistTimeline(nextMoc: TuyenSinhTimelineMoc[]) {
    if (!ctx) return false;
    if (!yearRows.length) {
      ctx.showToast(
        `Chưa có dữ liệu tuyển sinh năm ${timelineYear}. Thêm dữ liệu năm trên tab Tuyển sinh trước.`,
      );
      return false;
    }
    const serialized = serializeTimelineMocStore(nextMoc);
    const savedMoc = parseTimelineMocStore(serialized);
    if (!savedMoc?.length) {
      ctx.showToast("Cần ít nhất một mốc có tên và ngày (từ hoặc đến).");
      return false;
    }
    const patch = {
      ghi_chu_timeline: serialized,
      link_thong_tin: tlLink.trim() || null,
    };
    const prev = ctx.tuyenSinh;
    ctx.setTuyenSinh((list) =>
      list.map((r) => (r.nam === timelineYear ? { ...r, ...patch } : r)),
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
      ctx.showToast("Lưu lịch thất bại");
      return false;
    }
    setTimelineMoc(savedMoc);
    ctx.showToast("Đã cập nhật lịch tuyển sinh");
    return true;
  }

  async function handleSaveMoc(moc: TuyenSinhTimelineMoc) {
    const normalized = normalizeTimelineMoc(moc);
    if (!normalized) {
      ctx?.showToast("Cần tên mốc và ít nhất một ngày (từ hoặc đến).");
      return;
    }

    const prevModal = mocModal;
    const prevTimelineMoc = timelineMoc;
    let next: TuyenSinhTimelineMoc[];
    if (mocModal?.kind === "new") {
      if (timelineMoc.length >= TIMELINE_MOC_MAX_ITEMS) {
        ctx?.showToast(`Tối đa ${TIMELINE_MOC_MAX_ITEMS} mốc.`);
        return;
      }
      next = [...timelineMoc, normalized];
    } else {
      next = timelineMoc.map((item) =>
        item.id === normalized.id ? normalized : item,
      );
    }

    persistingMocRef.current = true;
    setTimelineMoc(next);
    setMocModal(null);
    const ok = await persistTimeline(next);
    persistingMocRef.current = false;
    if (!ok) {
      setMocModal(prevModal);
      setTimelineMoc(prevTimelineMoc);
    }
  }

  async function handleDeleteMoc() {
    if (!mocModal || mocModal.kind !== "edit") return;
    const next = timelineMoc.filter((m) => m.id !== mocModal.mocId);
    if (!next.length) {
      ctx?.showToast("Cần ít nhất một mốc trên lịch.");
      return;
    }
    const prevModal = mocModal;
    const prevTimelineMoc = timelineMoc;
    persistingMocRef.current = true;
    setTimelineMoc(next);
    setMocModal(null);
    const ok = await persistTimeline(next);
    persistingMocRef.current = false;
    if (!ok) {
      setMocModal(prevModal);
      setTimelineMoc(prevTimelineMoc);
    }
  }

  const canAddMoc =
    isEditing && timelineMoc.length < TIMELINE_MOC_MAX_ITEMS && yearRows.length > 0;

  return (
    <>
      <aside className="tdh-admission-side" aria-label="Lịch tuyển sinh">
        <div className="tdh-admission-side-head">
          <div className="tdh-admission-side-year-row">
            <p className="timeline-year-kicker">Tuyển sinh</p>
            <TruongYearSelect
              label="Năm lịch"
              years={timelineYearOptions}
              value={timelineYear}
              onChange={setTimelineYear}
            />
          </div>
        </div>

        <section className="timeline-section timeline-section--rail">
          {timelineSteps.length === 0 && !isEditing ? (
            <p className="ptxt-empty-text tdh-admission-side-empty">
              Chưa có lịch cho năm {timelineYear}.
            </p>
          ) : (
            <div className="timeline">
              {!showPastSteps && pastSteps.length > 0 ? (
                <button
                  type="button"
                  className="timeline-past-toggle"
                  onClick={() => setShowPastSteps(true)}
                >
                  Xem thêm {pastSteps.length} mốc đã qua
                </button>
              ) : null}
              {showPastSteps && pastSteps.length > 0 ? (
                <button
                  type="button"
                  className="timeline-past-toggle timeline-past-toggle--collapse"
                  onClick={() => setShowPastSteps(false)}
                >
                  Ẩn mốc đã qua
                </button>
              ) : null}
              {visibleSteps.map((step) => (
                <TimelineStepItem
                  key={step.id}
                  step={step}
                  role={stepRole(step)}
                  isEditing={isEditing}
                  onEdit={
                    isEditing
                      ? () => setMocModal({ kind: "edit", mocId: step.id })
                      : undefined
                  }
                />
              ))}
              {canAddMoc ? (
                <button
                  type="button"
                  className="timeline-item timeline-add-moc"
                  onClick={() => setMocModal({ kind: "new" })}
                >
                  <div className="timeline-dot timeline-dot--add">+</div>
                  <div className="timeline-content">
                    <div className="timeline-label">Thêm mốc</div>
                    <p className="timeline-desc">Nhập tên, ngày và mô tả mốc mới</p>
                  </div>
                </button>
              ) : null}
              {isEditing && !yearRows.length ? (
                <p className="tdh-admission-side-empty tdh-admission-side-empty--inline">
                  Thêm dữ liệu tuyển sinh năm {timelineYear} trước khi tạo mốc lịch.
                </p>
              ) : null}
            </div>
          )}
        </section>
      </aside>

      <TruongInlineModal
        open={mocModal !== null && modalMoc !== null}
        onClose={() => setMocModal(null)}
        className="tdh-inline-modal--wide tdh-timeline-moc-single-modal"
        labelledBy="tdh-timeline-moc-single-title"
      >
        <h3 id="tdh-timeline-moc-single-title" className="tdh-inline-modal-title">
          {mocModal?.kind === "new" ? "Thêm mốc lịch" : "Sửa mốc lịch"}
        </h3>
        <p className="tdh-calc-config-lead">
          Áp dụng cho tất cả ngành trong năm {timelineYear}.
        </p>
        {modalMoc ? (
          <TruongTimelineMocSingleForm
            initial={modalMoc}
            onSubmit={(moc) => void handleSaveMoc(moc)}
            onDelete={
              mocModal?.kind === "edit" ? () => void handleDeleteMoc() : undefined
            }
            submitLabel={mocModal?.kind === "new" ? "Thêm mốc" : "Lưu mốc"}
          />
        ) : null}
      </TruongInlineModal>
    </>
  );
}
