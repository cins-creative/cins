"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { HaOrgUpCountdown } from "@/components/cins/home-adaptive/HaOrgUpCountdown";
import { SuKienCreateModal } from "@/components/co-so/SuKienCreateModal";
import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { TruongYearSelect } from "@/components/truong/YearFilterProvider";
import { TruongTimelineMocSingleForm } from "@/components/truong/tuyensinh/TruongTimelineMocSingleForm";
import {
  labelLoaiSuKien,
  labelSuKienVe,
  type SuKienCardData,
} from "@/lib/to-chuc/su-kien-constants";
import {
  loadStudioTimelineMoc,
  saveStudioTimelineMoc,
} from "@/lib/to-chuc/studio-timeline-moc-storage";
import {
  buildStudioBaiDangSteps,
  buildStudioJobSteps,
  collectStudioMocYears,
  collectStudioTimelineYears,
  parseStudioBaiDangStepId,
  parseStudioJobStepId,
  studioBaiDangStepSortKey,
} from "@/lib/to-chuc/studio-timeline";
import { STUDIO_DEFAULT_TAB, studioTabPath } from "@/lib/to-chuc/studio-routes";
import type { StudioJob } from "@/lib/to-chuc/studio-tuyen-dung-types";
import { formatSuKienDiaDiemDisplay } from "@/lib/truong/contact";
import { currentCalendarYear } from "@/lib/truong/diem-chuan";
import { formatTimelineDate, getStepStatus } from "@/lib/truong/timeline";
import { mocDateSortKey } from "@/lib/truong/timeline-moc";
import {
  buildTimelineStepsFromMocDraft,
  countUpcomingTimelineSteps,
  emptyTimelineMoc,
  getAdmissionTimelineFocus,
  mocMatchesCalendarYear,
  normalizeTimelineMoc,
  TIMELINE_MOC_MAX_ITEMS,
  timelineLinkHref,
  timelineLinkLabel,
  type TuyenSinhTimelineMoc,
  type TuyenSinhTimelineStep,
} from "@/lib/truong/timeline-steps";
import { isValidTruongYear } from "@/lib/truong/year-tabs";
import type { TruongBaiDang } from "@/lib/truong/types";

type Props = {
  orgId: string;
  jobs: StudioJob[];
  orgSlug: string;
  orgDiaChi?: string | null;
  orgTinhThanh?: string | null;
  /** Fallback khi không có `TruongInlineEditProvider` (khách). */
  posts?: TruongBaiDang[];
  canManage?: boolean;
  onUpcomingCountChange?: (count: number) => void;
};

type StepRole = "past" | "current" | "next" | "default";
type MocModalMode = { kind: "new" } | { kind: "edit"; mocId: string };

const SU_KIEN_STEP_PREFIX = "su-kien:";

function suKienStepId(eventId: string): string {
  return `${SU_KIEN_STEP_PREFIX}${eventId}`;
}

function parseSuKienStepId(stepId: string): string | null {
  return stepId.startsWith(SU_KIEN_STEP_PREFIX)
    ? stepId.slice(SU_KIEN_STEP_PREFIX.length)
    : null;
}

function buildStudioSuKienSteps(
  events: SuKienCardData[],
  orgSlug: string,
): TuyenSinhTimelineStep[] {
  const href = studioTabPath(orgSlug, STUDIO_DEFAULT_TAB);
  return events.map((ev) => {
    const status = getStepStatus(ev.batDau, ev.ketThuc);
    const startLabel = formatTimelineDate(ev.batDau) ?? "";
    const endLabel = ev.ketThuc ? formatTimelineDate(ev.ketThuc) : null;
    let dateLabel =
      endLabel && endLabel !== startLabel
        ? `${startLabel} – ${endLabel}`
        : startLabel;
    if (status === "active") dateLabel = `${dateLabel} · Đang diễn ra`;
    const descParts = [
      labelLoaiSuKien(ev.loaiSuKien),
      labelSuKienVe(ev.mienPhi, ev.giaVe, ev.loaiVe?.length),
    ];
    const diaDiemLabel = formatSuKienDiaDiemDisplay(ev.tinhThanh, ev.diaDiem);
    if (diaDiemLabel) descParts.push(diaDiemLabel);
    return {
      id: suKienStepId(ev.id),
      label: ev.ten,
      dateLabel,
      desc: descParts.join(" · "),
      link: href,
      status,
      dot: status === "done" ? "✓" : status === "active" ? "→" : "★",
      coverSrc: ev.coverSrc,
      countdownStartIso: ev.batDau,
      countdownEndIso: ev.ketThuc,
    };
  });
}

function studioStepSortKey(
  step: TuyenSinhTimelineStep,
  yearMoc: TuyenSinhTimelineMoc[],
  suKienList: SuKienCardData[],
  posts: ReadonlyArray<TruongBaiDang>,
): number {
  const suKienId = parseSuKienStepId(step.id);
  if (suKienId) {
    const ev = suKienList.find((e) => e.id === suKienId);
    return ev ? mocDateSortKey(ev.batDau, ev.ketThuc) : Number.MAX_SAFE_INTEGER;
  }
  if (parseStudioBaiDangStepId(step.id)) {
    return studioBaiDangStepSortKey(step, posts);
  }
  const moc = yearMoc.find((m) => m.id === step.id);
  return mocDateSortKey(moc?.ngay_tu ?? null, moc?.ngay_den ?? null);
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
    parseSuKienStepId(step.id) ? "timeline-item--su-kien" : "",
    role === "past" ? "timeline-item--past" : "",
    role === "current" ? "timeline-item--focus timeline-item--current" : "",
    role === "next" ? "timeline-item--focus timeline-item--next" : "",
    isEditing ? "timeline-item--editable" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const bannerImage = step.coverSrc ? (
    <Image
      src={step.coverSrc}
      alt=""
      fill
      className="timeline-event-banner-img"
      sizes="260px"
      unoptimized={step.coverSrc.includes("imagedelivery.net")}
    />
  ) : null;

  const bannerNode =
    bannerImage && step.link && !isEditing ? (
      step.link.startsWith("/") ? (
        <Link href={step.link} className="timeline-event-banner-link">
          {bannerImage}
        </Link>
      ) : (
        <a
          href={timelineLinkHref(step.link)}
          className="timeline-event-banner-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          {bannerImage}
        </a>
      )
    ) : bannerImage ? (
      <div className="timeline-event-banner-link">{bannerImage}</div>
    ) : null;

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
        {role === "next" ? (
          <div className="timeline-focus-row">
            <span className="timeline-focus-kicker">Tiếp theo</span>
            {step.countdownStartIso ? (
              <HaOrgUpCountdown
                batDauIso={step.countdownStartIso}
                ketThucIso={step.countdownEndIso ?? null}
                status={step.status === "active" ? "active" : "upcoming"}
              />
            ) : null}
          </div>
        ) : null}
        {role === "current" ? (
          <span className="timeline-focus-kicker timeline-focus-kicker--now">
            Hiện tại
          </span>
        ) : null}
        {bannerNode ? (
          <div className="timeline-event-banner">{bannerNode}</div>
        ) : null}
        <div
          className={[
            "timeline-date",
            step.status === "active" ? "timeline-date--live" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {step.dateLabel}
        </div>
        {labelNode}
        {step.desc ? <p className="timeline-desc">{step.desc}</p> : null}
        {isEditing && editHint ? (
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

export function StudioJobsSidebar({
  orgId,
  jobs,
  orgSlug,
  orgDiaChi = null,
  orgTinhThanh = null,
  posts: postsProp = [],
  canManage = false,
  onUpcomingCountChange,
}: Props) {
  const ctx = useTruongInlineEdit();
  const isManaging = canManage && (ctx?.isEditing ?? false);

  const [suKienList, setSuKienList] = useState<SuKienCardData[]>([]);
  const [timelineMoc, setTimelineMoc] = useState<TuyenSinhTimelineMoc[]>([]);
  const [showPastSteps, setShowPastSteps] = useState(false);
  const [mocModal, setMocModal] = useState<MocModalMode | null>(null);
  const [suKienModalOpen, setSuKienModalOpen] = useState(false);
  const [editingSuKien, setEditingSuKien] = useState<SuKienCardData | null>(
    null,
  );
  const [timelineYear, setTimelineYear] = useState(currentCalendarYear());

  const allPosts = useMemo(() => {
    if (!ctx) return postsProp;
    const published = ctx.baidang ?? [];
    if (!isManaging) return published;
    const scheduled = ctx.scheduledBaidang ?? [];
    const byId = new Map<string, TruongBaiDang>();
    for (const p of [...published, ...scheduled]) {
      byId.set(p.id, p);
    }
    return [...byId.values()];
  }, [ctx, postsProp, isManaging]);

  const loadSuKien = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/org/${encodeURIComponent(orgId)}/su-kien`,
        { credentials: "include" },
      );
      const data = (await res.json()) as { suKien?: SuKienCardData[] };
      if (res.ok) {
        setSuKienList(data.suKien ?? []);
      }
    } catch {
      /* giữ danh sách cũ */
    }
  }, [orgId]);

  useEffect(() => {
    void loadSuKien();
  }, [loadSuKien]);

  useEffect(() => {
    setTimelineMoc(loadStudioTimelineMoc(orgId));
  }, [orgId]);

  useEffect(() => {
    if (!isManaging) {
      setMocModal(null);
      setSuKienModalOpen(false);
      setEditingSuKien(null);
    }
  }, [isManaging]);

  const jobSteps = useMemo(
    () => buildStudioJobSteps(jobs, orgSlug),
    [jobs, orgSlug],
  );

  const baiDangSteps = useMemo(
    () =>
      buildStudioBaiDangSteps(allPosts, orgSlug, timelineYear, isManaging),
    [allPosts, orgSlug, timelineYear, isManaging],
  );

  const suKienOfYear = useMemo(
    () =>
      suKienList.filter((ev) => {
        const d = new Date(ev.batDau);
        return !Number.isNaN(d.getTime()) && d.getFullYear() === timelineYear;
      }),
    [suKienList, timelineYear],
  );

  const suKienSteps = useMemo(
    () => buildStudioSuKienSteps(suKienOfYear, orgSlug),
    [suKienOfYear, orgSlug],
  );

  const suKienYears = useMemo(
    () =>
      suKienList
        .map((ev) => new Date(ev.batDau).getFullYear())
        .filter((y) => Number.isFinite(y)),
    [suKienList],
  );

  const yearMoc = useMemo(
    () => timelineMoc.filter((m) => mocMatchesCalendarYear(m, timelineYear)),
    [timelineMoc, timelineYear],
  );

  const customSteps = useMemo(
    () => buildTimelineStepsFromMocDraft(yearMoc),
    [yearMoc],
  );

  const timelineYearOptions = useMemo(() => {
    const unique = collectStudioTimelineYears(
      allPosts,
      jobs,
      isManaging,
      [...collectStudioMocYears(timelineMoc), ...suKienYears],
    );
    if (
      isManaging &&
      isValidTruongYear(timelineYear) &&
      !unique.includes(timelineYear)
    ) {
      return [timelineYear, ...unique].sort((a, b) => b - a);
    }
    return unique;
  }, [
    allPosts,
    jobs,
    isManaging,
    timelineMoc,
    suKienYears,
    timelineYear,
  ]);

  useEffect(() => {
    if (!timelineYearOptions.length) return;
    if (!timelineYearOptions.includes(timelineYear)) {
      setTimelineYear(timelineYearOptions[0]!);
    }
  }, [timelineYearOptions, timelineYear]);

  const timelineSteps = useMemo(() => {
    const dated = [...customSteps, ...suKienSteps, ...baiDangSteps].sort(
      (a, b) =>
        studioStepSortKey(a, yearMoc, suKienList, allPosts) -
        studioStepSortKey(b, yearMoc, suKienList, allPosts),
    );
    return [...jobSteps, ...dated];
  }, [
    jobSteps,
    customSteps,
    suKienSteps,
    baiDangSteps,
    yearMoc,
    suKienList,
    allPosts,
  ]);

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

  useEffect(() => {
    onUpcomingCountChange?.(countUpcomingTimelineSteps(timelineSteps));
  }, [timelineSteps, onUpcomingCountChange]);

  useEffect(() => {
    setShowPastSteps(false);
  }, [timelineYear, timelineSteps.length]);

  function stepRole(step: TuyenSinhTimelineStep): StepRole {
    if (focus.pastIds.has(step.id)) return "past";
    if (step.id === focus.currentId) return "current";
    if (step.id === focus.nextId) return "next";
    return "default";
  }

  function isStepTimelineEditable(step: TuyenSinhTimelineStep): boolean {
    if (parseSuKienStepId(step.id)) return true;
    if (parseStudioJobStepId(step.id)) return false;
    if (parseStudioBaiDangStepId(step.id)) return false;
    return true;
  }

  function stepEditHint(step: TuyenSinhTimelineStep): string {
    if (parseSuKienStepId(step.id)) return "Bấm để sửa hoặc xóa sự kiện";
    return "Bấm để sửa hoặc xóa mốc thông báo";
  }

  function handleEditStep(step: TuyenSinhTimelineStep) {
    const suKienId = parseSuKienStepId(step.id);
    if (suKienId) {
      const ev = suKienList.find((e) => e.id === suKienId);
      if (!ev) {
        ctx?.showToast("Không tìm thấy sự kiện — thử tải lại trang.");
        void loadSuKien();
        return;
      }
      setMocModal(null);
      setSuKienModalOpen(false);
      setEditingSuKien(ev);
      return;
    }
    setEditingSuKien(null);
    setMocModal({ kind: "edit", mocId: step.id });
  }

  const modalMoc = useMemo(() => {
    if (!mocModal) return null;
    if (mocModal.kind === "new") return emptyTimelineMoc();
    return timelineMoc.find((m) => m.id === mocModal.mocId) ?? null;
  }, [mocModal, timelineMoc]);

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

    saveStudioTimelineMoc(orgId, next);
    setTimelineMoc(next);
    setMocModal(null);
    ctx?.showToast("Đã cập nhật mốc thông báo");
  }

  function handleSuKienUpdated(updated: SuKienCardData) {
    setSuKienList((prev) =>
      prev.map((e) => (e.id === updated.id ? updated : e)),
    );
    setEditingSuKien(null);
    ctx?.showToast("Đã cập nhật sự kiện");
  }

  async function handleDeleteSuKien() {
    if (!editingSuKien) return;
    const id = editingSuKien.id;
    try {
      const res = await fetch(
        `/api/org/${encodeURIComponent(orgId)}/su-kien/${encodeURIComponent(id)}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        ctx?.showToast(json?.error ?? "Không xóa được sự kiện.");
        return;
      }
      setSuKienList((prev) => prev.filter((e) => e.id !== id));
      setEditingSuKien(null);
      ctx?.showToast("Đã xóa sự kiện");
    } catch {
      ctx?.showToast("Lỗi mạng — thử lại sau.");
    }
  }

  function handleDeleteMoc() {
    if (!mocModal || mocModal.kind !== "edit") return;
    const next = timelineMoc.filter((m) => m.id !== mocModal.mocId);
    saveStudioTimelineMoc(orgId, next);
    setTimelineMoc(next);
    setMocModal(null);
    ctx?.showToast("Đã xóa mốc thông báo");
  }

  const canAddMoc = isManaging && timelineMoc.length < TIMELINE_MOC_MAX_ITEMS;
  const hasContent = timelineSteps.length > 0;

  return (
    <>
      <aside className="tdh-admission-side" aria-label="Tuyển dụng và thông báo">
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
              Chưa có tin tuyển dụng hay thông báo. Vị trí đang mở, mốc tùy chỉnh
              và sự kiện sẽ hiển thị tại đây.
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
                  isEditing={isManaging && isStepTimelineEditable(step)}
                  editHint={stepEditHint(step)}
                  onEdit={
                    isManaging && isStepTimelineEditable(step)
                      ? () => handleEditStep(step)
                      : undefined
                  }
                />
              ))}

              {isManaging && timelineSteps.length === 0 ? (
                <p className="ptxt-empty-text tdh-admission-side-empty">
                  Chưa có mốc thông báo cho năm {timelineYear}. Thêm mốc hoặc
                  tạo sự kiện workshop, open day, talkshow…
                </p>
              ) : null}

              {canAddMoc ? (
                <button
                  type="button"
                  className="timeline-item timeline-add-moc"
                  onClick={() => {
                    setEditingSuKien(null);
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

              {isManaging ? (
                <button
                  type="button"
                  className="timeline-item timeline-add-moc timeline-add-su-kien"
                  onClick={() => {
                    setMocModal(null);
                    setSuKienModalOpen(true);
                  }}
                >
                  <div className="timeline-dot timeline-dot--add">★</div>
                  <div className="timeline-content">
                    <div className="timeline-label">Thêm sự kiện</div>
                    <p className="timeline-desc">
                      Workshop, open day, talkshow… hiện trên bảng thông báo
                    </p>
                  </div>
                </button>
              ) : null}
            </div>
          )}
        </section>
      </aside>

      {isManaging ? (
        <SuKienCreateModal
          open={suKienModalOpen || Boolean(editingSuKien)}
          orgId={orgId}
          orgDiaChi={orgDiaChi}
          orgTinhThanh={orgTinhThanh}
          editing={editingSuKien}
          onClose={() => {
            setSuKienModalOpen(false);
            setEditingSuKien(null);
          }}
          onCreated={(created) => {
            setSuKienList((prev) => [created, ...prev]);
            setSuKienModalOpen(false);
            ctx?.showToast("Đã thêm sự kiện");
          }}
          onUpdated={handleSuKienUpdated}
          onDelete={editingSuKien ? handleDeleteSuKien : undefined}
        />
      ) : null}

      <TruongInlineModal
        open={mocModal !== null && modalMoc !== null}
        onClose={() => setMocModal(null)}
        className="tdh-inline-modal--wide tdh-timeline-moc-single-modal"
        labelledBy="studio-timeline-moc-single-title"
      >
        <h3
          id="studio-timeline-moc-single-title"
          className="tdh-inline-modal-title"
        >
          {mocModal?.kind === "new" ? "Thêm mốc thông báo" : "Sửa mốc thông báo"}
        </h3>
        <p className="tdh-calc-config-lead">
          Hiển thị trên sidebar năm {timelineYear} — áp dụng cho trang studio
          này.
        </p>
        {modalMoc ? (
          <TruongTimelineMocSingleForm
            initial={modalMoc}
            onSubmit={handleSaveMoc}
            onDelete={mocModal?.kind === "edit" ? handleDeleteMoc : undefined}
            submitLabel={mocModal?.kind === "new" ? "Thêm mốc" : "Lưu mốc"}
          />
        ) : null}
      </TruongInlineModal>
    </>
  );
}
