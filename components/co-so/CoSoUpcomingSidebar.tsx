"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { TruongYearSelect } from "@/components/truong/YearFilterProvider";
import { TruongTimelineMocSingleForm } from "@/components/truong/tuyensinh/TruongTimelineMocSingleForm";
import { KhoaHocCreateModal } from "@/components/co-so/KhoaHocCreateModal";
import {
  CO_SO_KHOA_UPDATED_EVENT,
  notifyCoSoKhoaListChanged,
} from "@/lib/to-chuc/co-so-khoa-events";
import {
  loadCoSoTimelineMoc,
  saveCoSoTimelineMoc,
} from "@/lib/to-chuc/co-so-timeline-moc-storage";
import {
  buildCoSoAutoPinSteps,
  collectCoSoTimelineYears,
  filterCoSoTimelineMocForYear,
  parseCoSoAutoPinKhoaId,
} from "@/lib/to-chuc/co-so-timeline";
import type { KhoaHocCardData } from "@/lib/to-chuc/khoa-hoc-types";
import { defaultTruongNganhYear } from "@/lib/truong/diem-chuan";
import {
  buildTimelineStepsFromMocDraft,
  emptyTimelineMoc,
  getAdmissionTimelineFocus,
  normalizeTimelineMoc,
  TIMELINE_MOC_MAX_ITEMS,
  timelineLinkHref,
  timelineLinkLabel,
  type TuyenSinhTimelineMoc,
  type TuyenSinhTimelineStep,
} from "@/lib/truong/timeline-steps";
import { isValidTruongYear } from "@/lib/truong/year-tabs";

type Props = {
  orgId: string;
  orgSlug: string;
  orgDiaChi?: string | null;
  canManageKhoaHoc?: boolean;
};

type StepRole = "past" | "current" | "next" | "pinned" | "default";
type MocModalMode = { kind: "new" } | { kind: "edit"; mocId: string };

const WEEKLY_KHAI_GIANG_LABEL = "Khai giảng hàng tuần";

function timelineDateClass(step: TuyenSinhTimelineStep): string {
  if (step.dateLabel === WEEKLY_KHAI_GIANG_LABEL) {
    return "timeline-date timeline-date--recurring";
  }
  if (step.status === "active") {
    return "timeline-date timeline-date--live";
  }
  return "timeline-date";
}

function TimelineStepItem({
  step,
  role,
  isEditing,
  onEdit,
  editHint = "Bấm để sửa hoặc xóa",
}: {
  step: TuyenSinhTimelineStep;
  role: StepRole;
  isEditing?: boolean;
  onEdit?: () => void;
  editHint?: string;
}) {
  const className = [
    "timeline-item",
    step.status,
    role === "past" ? "timeline-item--past" : "",
    role === "current" ? "timeline-item--focus timeline-item--current" : "",
    role === "next" ? "timeline-item--focus timeline-item--next" : "",
    role === "pinned" ? "timeline-item--focus timeline-item--current" : "",
    isEditing ? "timeline-item--editable" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const labelNode =
    step.link && !isEditing ? (
      step.link.startsWith("/") ? (
        <Link
          href={step.link}
          className="timeline-label timeline-label--link"
          title={step.label}
        >
          {step.label}
        </Link>
      ) : (
        <a
          href={timelineLinkHref(step.link)}
          className="timeline-label timeline-label--link"
          target="_blank"
          rel="noopener noreferrer"
          title={timelineLinkLabel(step.link)}
        >
          {step.label}
        </a>
      )
    ) : (
      <div className="timeline-label">{step.label}</div>
    );

  const content = (
    <>
      <div className="timeline-dot">{step.dot}</div>
      <div className="timeline-content">
        {role === "pinned" ? (
          <span className="timeline-focus-kicker timeline-focus-kicker--now">
            Khai giảng
          </span>
        ) : null}
        {role === "next" ? (
          <span className="timeline-focus-kicker">Tiếp theo</span>
        ) : null}
        {role === "current" ? (
          <span className="timeline-focus-kicker timeline-focus-kicker--now">
            Hiện tại
          </span>
        ) : null}
        <div className={timelineDateClass(step)}>{step.dateLabel}</div>
        {labelNode}
        {step.desc ? <p className="timeline-desc">{step.desc}</p> : null}
        {isEditing ? (
          <span className="timeline-edit-hint">{editHint}</span>
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

export function CoSoUpcomingSidebar({
  orgId,
  orgSlug,
  orgDiaChi = null,
  canManageKhoaHoc = false,
}: Props) {
  const ctx = useTruongInlineEdit();
  const pathname = usePathname();
  const isManaging = canManageKhoaHoc && (ctx?.isEditing ?? false);

  const [khoaList, setKhoaList] = useState<KhoaHocCardData[]>([]);
  const [timelineMoc, setTimelineMoc] = useState<TuyenSinhTimelineMoc[]>([]);
  const [showPastSteps, setShowPastSteps] = useState(false);
  const [mocModal, setMocModal] = useState<MocModalMode | null>(null);
  const [editingKhoa, setEditingKhoa] = useState<KhoaHocCardData | null>(null);
  const [timelineYear, setTimelineYear] = useState(defaultTruongNganhYear());

  const loadKhoa = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/co-so/${encodeURIComponent(orgId)}/khoa-hoc`,
        { credentials: "include" },
      );
      const data = (await res.json()) as {
        khoaHoc?: KhoaHocCardData[];
      };
      if (res.ok) {
        setKhoaList(data.khoaHoc ?? []);
      }
    } catch {
      /* giữ danh sách cũ */
    }
  }, [orgId]);

  useEffect(() => {
    void loadKhoa();
  }, [loadKhoa, pathname]);

  useEffect(() => {
    function onKhoaUpdated(ev: Event) {
      const detail = (ev as CustomEvent<{ orgId?: string }>).detail;
      if (detail?.orgId === orgId) void loadKhoa();
    }
    window.addEventListener(CO_SO_KHOA_UPDATED_EVENT, onKhoaUpdated);
    return () =>
      window.removeEventListener(CO_SO_KHOA_UPDATED_EVENT, onKhoaUpdated);
  }, [orgId, loadKhoa]);

  useEffect(() => {
    setTimelineMoc(loadCoSoTimelineMoc(orgId));
  }, [orgId]);

  useEffect(() => {
    if (!isManaging) {
      setMocModal(null);
      setEditingKhoa(null);
    }
  }, [isManaging]);

  const autoPinSteps = useMemo(
    () => buildCoSoAutoPinSteps(khoaList, orgSlug),
    [khoaList, orgSlug],
  );

  const timelineYearOptions = useMemo(() => {
    const years = collectCoSoTimelineYears(timelineMoc);
    if (
      isManaging &&
      isValidTruongYear(timelineYear) &&
      !years.includes(timelineYear)
    ) {
      return [timelineYear, ...years].sort((a, b) => b - a);
    }
    return years;
  }, [timelineMoc, isManaging, timelineYear]);

  useEffect(() => {
    if (!timelineYearOptions.length) return;
    if (!timelineYearOptions.includes(timelineYear)) {
      setTimelineYear(timelineYearOptions[0]!);
    }
  }, [timelineYearOptions, timelineYear]);

  const yearMoc = useMemo(
    () => filterCoSoTimelineMocForYear(timelineMoc, timelineYear),
    [timelineMoc, timelineYear],
  );

  const customSteps = useMemo(
    () => buildTimelineStepsFromMocDraft(yearMoc),
    [yearMoc],
  );

  const focus = useMemo(
    () => getAdmissionTimelineFocus(customSteps),
    [customSteps],
  );

  const pastSteps = useMemo(
    () => customSteps.filter((s) => focus.pastIds.has(s.id)),
    [customSteps, focus.pastIds],
  );

  const visibleCustomSteps = useMemo(
    () =>
      showPastSteps
        ? customSteps
        : customSteps.filter((s) => !focus.pastIds.has(s.id)),
    [customSteps, focus.pastIds, showPastSteps],
  );

  const modalMoc = useMemo(() => {
    if (!mocModal) return null;
    if (mocModal.kind === "new") return emptyTimelineMoc();
    return timelineMoc.find((m) => m.id === mocModal.mocId) ?? null;
  }, [mocModal, timelineMoc]);

  function customStepRole(step: TuyenSinhTimelineStep): StepRole {
    if (focus.pastIds.has(step.id)) return "past";
    if (step.id === focus.currentId) return "current";
    if (step.id === focus.nextId) return "next";
    return "default";
  }

  useEffect(() => {
    setShowPastSteps(false);
  }, [timelineYear, customSteps.length]);

  function handleSaveMoc(moc: TuyenSinhTimelineMoc) {
    const normalized = normalizeTimelineMoc(moc);
    if (!normalized) {
      ctx?.showToast("Cần tên mốc và ít nhất một ngày (từ hoặc đến).");
      return;
    }

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

    saveCoSoTimelineMoc(orgId, next);
    setTimelineMoc(next);
    setMocModal(null);
    ctx?.showToast("Đã cập nhật mốc thông báo");
  }

  function handleEditAutoPin(step: TuyenSinhTimelineStep) {
    const khoaId = parseCoSoAutoPinKhoaId(step.id);
    if (!khoaId) return;
    const khoa = khoaList.find((k) => k.id === khoaId);
    if (!khoa) {
      ctx?.showToast("Không tìm thấy khóa học — thử tải lại trang.");
      void loadKhoa();
      return;
    }
    setMocModal(null);
    setEditingKhoa(khoa);
  }

  function handleKhoaUpdated(updated: KhoaHocCardData) {
    setKhoaList((prev) =>
      prev.map((k) => (k.id === updated.id ? updated : k)),
    );
    setEditingKhoa(null);
    notifyCoSoKhoaListChanged(orgId);
    ctx?.showToast("Đã cập nhật khóa học");
  }

  function handleDeleteMoc() {
    if (!mocModal || mocModal.kind !== "edit") return;
    const next = timelineMoc.filter((m) => m.id !== mocModal.mocId);
    saveCoSoTimelineMoc(orgId, next);
    setTimelineMoc(next);
    setMocModal(null);
    ctx?.showToast("Đã xóa mốc thông báo");
  }

  const canAddMoc = isManaging && timelineMoc.length < TIMELINE_MOC_MAX_ITEMS;
  const hasContent = autoPinSteps.length > 0 || customSteps.length > 0;

  return (
    <>
      <aside className="tdh-admission-side" aria-label="Khai giảng và thông báo">
        <div className="tdh-admission-side-head">
          <div className="tdh-admission-side-year-row">
            <p className="timeline-year-kicker">Thông báo</p>
            <TruongYearSelect
              label="Năm lịch"
              years={timelineYearOptions}
              value={timelineYear}
              onChange={setTimelineYear}
            />
          </div>
        </div>

        <section className="timeline-section timeline-section--rail">
          {!hasContent && !isManaging ? (
            <p className="ptxt-empty-text tdh-admission-side-empty">
              Chưa có lớp sắp khai giảng. Lịch khai giảng sẽ hiện khi bạn tạo
              khóa học và lớp.
            </p>
          ) : (
            <div className="timeline">
              {autoPinSteps.map((step, idx) => (
                <TimelineStepItem
                  key={step.id}
                  step={step}
                  role={idx === 0 ? "pinned" : "default"}
                  isEditing={isManaging}
                  editHint="Bấm để sửa khóa học"
                  onEdit={
                    isManaging ? () => handleEditAutoPin(step) : undefined
                  }
                />
              ))}

              {autoPinSteps.length > 0 && visibleCustomSteps.length > 0 ? (
                <div
                  className="timeline-divider"
                  role="separator"
                  aria-hidden
                />
              ) : null}

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

              {visibleCustomSteps.map((step) => (
                <TimelineStepItem
                  key={step.id}
                  step={step}
                  role={customStepRole(step)}
                  isEditing={isManaging}
                  onEdit={
                    isManaging
                      ? () => {
                          setEditingKhoa(null);
                          setMocModal({ kind: "edit", mocId: step.id });
                        }
                      : undefined
                  }
                />
              ))}

              {isManaging &&
              customSteps.length === 0 &&
              autoPinSteps.length === 0 ? (
                <p className="ptxt-empty-text tdh-admission-side-empty">
                  Chưa có mốc thông báo cho năm {timelineYear}. Thêm mốc hoặc
                  tạo khóa học để hiện lịch khai giảng.
                </p>
              ) : null}

              {canAddMoc ? (
                <button
                  type="button"
                  className="timeline-item timeline-add-moc"
                  onClick={() => {
                    setEditingKhoa(null);
                    setMocModal({ kind: "new" });
                  }}
                >
                  <div className="timeline-dot timeline-dot--add">+</div>
                  <div className="timeline-content">
                    <div className="timeline-label">Thêm mốc</div>
                    <p className="timeline-desc">
                      Nhập tên, ngày và mô tả mốc mới
                    </p>
                  </div>
                </button>
              ) : null}
            </div>
          )}
        </section>
      </aside>

      {isManaging ? (
        <KhoaHocCreateModal
          open={Boolean(editingKhoa)}
          orgId={orgId}
          orgDiaChi={orgDiaChi}
          editing={editingKhoa}
          onClose={() => setEditingKhoa(null)}
          onUpdated={handleKhoaUpdated}
        />
      ) : null}

      <TruongInlineModal
        open={mocModal !== null && modalMoc !== null}
        onClose={() => setMocModal(null)}
        className="tdh-inline-modal--wide tdh-timeline-moc-single-modal"
        labelledBy="cso-timeline-moc-single-title"
      >
        <h3 id="cso-timeline-moc-single-title" className="tdh-inline-modal-title">
          {mocModal?.kind === "new" ? "Thêm mốc thông báo" : "Sửa mốc thông báo"}
        </h3>
        <p className="tdh-calc-config-lead">
          Hiển thị trên sidebar năm {timelineYear} — áp dụng cho toàn bộ trang
          cơ sở.
        </p>
        {modalMoc ? (
          <TruongTimelineMocSingleForm
            initial={modalMoc}
            onSubmit={handleSaveMoc}
            onDelete={
              mocModal?.kind === "edit" ? handleDeleteMoc : undefined
            }
            submitLabel={mocModal?.kind === "new" ? "Thêm mốc" : "Lưu mốc"}
          />
        ) : null}
      </TruongInlineModal>
    </>
  );
}
