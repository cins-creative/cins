"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { TruongYearSelect } from "@/components/truong/YearFilterProvider";
import { TruongTimelineMocSingleForm } from "@/components/truong/tuyensinh/TruongTimelineMocSingleForm";
import { KhoaHocCreateModal } from "@/components/co-so/KhoaHocCreateModal";
import { SuKienCreateModal } from "@/components/co-so/SuKienCreateModal";
import {
  labelLoaiSuKien,
  labelSuKienVe,
  type SuKienCardData,
} from "@/lib/to-chuc/su-kien-constants";
import { formatSuKienDiaDiemDisplay } from "@/lib/truong/contact";
import { formatTimelineDate, getStepStatus } from "@/lib/truong/timeline";
import { coSoTabPath } from "@/lib/to-chuc/co-so-routes";
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
  parseCoSoAutoPinLopId,
  isCoSoAutoPinLopStepId,
  isCoSoAutoPinKhoaStepId,
  isCoSoAutoPinStepId,
} from "@/lib/to-chuc/co-so-timeline";
import {
  buildCoSoLopAutoPinSteps,
  collectCoSoLopTimelineYears,
  type CoSoLopTimelinePin,
} from "@/lib/to-chuc/co-so-timeline-lop";
import { mocDateSortKey } from "@/lib/truong/timeline-moc";
import { coSoKhoaHocDetailPath } from "@/lib/to-chuc/co-so-routes";
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
import { LICH_KHAI_GIANG_LIEN_TUC_DEFAULT } from "@/lib/to-chuc/khoa-hoc-labels";

type Props = {
  orgId: string;
  orgSlug: string;
  orgDiaChi?: string | null;
  orgTinhThanh?: string | null;
  canManageKhoaHoc?: boolean;
  isMobileShell?: boolean;
  isMobileShellActive?: boolean;
};

type StepRole = "past" | "current" | "next" | "default";
type MocModalMode = { kind: "new" } | { kind: "edit"; mocId: string };

const WEEKLY_KHAI_GIANG_LABEL = LICH_KHAI_GIANG_LIEN_TUC_DEFAULT;

const SU_KIEN_STEP_PREFIX = "su-kien:";

function suKienStepId(eventId: string): string {
  return `${SU_KIEN_STEP_PREFIX}${eventId}`;
}

function parseSuKienStepId(stepId: string): string | null {
  return stepId.startsWith(SU_KIEN_STEP_PREFIX)
    ? stepId.slice(SU_KIEN_STEP_PREFIX.length)
    : null;
}

/** Chuyển sự kiện org → bước timeline cho sidebar thông báo. */
function buildSuKienSteps(
  events: SuKienCardData[],
  orgSlug: string,
): TuyenSinhTimelineStep[] {
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
      labelSuKienVe(ev.mienPhi, ev.giaVe),
    ];
    const diaDiemLabel = formatSuKienDiaDiemDisplay(ev.tinhThanh, ev.diaDiem);
    if (diaDiemLabel) descParts.push(diaDiemLabel);
    return {
      id: suKienStepId(ev.id),
      label: ev.ten,
      dateLabel,
      desc: descParts.join(" · "),
      link: coSoTabPath(orgSlug, "su-kien"),
      status,
      dot: status === "done" ? "✓" : status === "active" ? "→" : "★",
    };
  });
}

function coSoStepSortKey(
  step: TuyenSinhTimelineStep,
  lopPins: CoSoLopTimelinePin[],
  khoaList: KhoaHocCardData[],
  yearMoc: TuyenSinhTimelineMoc[],
  suKienList: SuKienCardData[],
): number {
  const suKienId = parseSuKienStepId(step.id);
  if (suKienId) {
    const ev = suKienList.find((e) => e.id === suKienId);
    return ev ? mocDateSortKey(ev.batDau, ev.ketThuc) : Number.MAX_SAFE_INTEGER;
  }
  const lopParsed = parseCoSoAutoPinLopId(step.id);
  if (lopParsed) {
    const pin = lopPins.find((p) => p.lopId === lopParsed.lopId);
    return pin ? mocDateSortKey(pin.ngayKhaiGiang, null) : Number.MAX_SAFE_INTEGER;
  }
  const khoaId = parseCoSoAutoPinKhoaId(step.id);
  if (khoaId) {
    const khoa = khoaList.find((k) => k.id === khoaId);
    if (khoa?.loaiMoHinh === "lien_tuc_theo_thang") {
      return Number.MAX_SAFE_INTEGER;
    }
    return mocDateSortKey(khoa?.ngayKhaiGiangGanNhat ?? null, null);
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
    role === "past" ? "timeline-item--past" : "",
    role === "current" ? "timeline-item--focus timeline-item--current" : "",
    role === "next" ? "timeline-item--focus timeline-item--next" : "",
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
        {role === "next" ? (
          <span className="timeline-focus-kicker">Tiếp theo</span>
        ) : null}
        {role === "current" ? (
          <span className="timeline-focus-kicker timeline-focus-kicker--now">
            Hiện tại
          </span>
        ) : null}
        <div
          className={[
            "timeline-date",
            step.dateLabel === WEEKLY_KHAI_GIANG_LABEL
              ? "timeline-date--recurring"
              : "",
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

export function CoSoUpcomingSidebar({
  orgId,
  orgSlug,
  orgDiaChi = null,
  orgTinhThanh = null,
  canManageKhoaHoc = false,
  isMobileShell = false,
  isMobileShellActive = false,
}: Props) {
  const ctx = useTruongInlineEdit();
  const pathname = usePathname();
  const router = useRouter();
  const isManaging = canManageKhoaHoc && (ctx?.isEditing ?? false);

  const [khoaList, setKhoaList] = useState<KhoaHocCardData[]>([]);
  const [lopPins, setLopPins] = useState<CoSoLopTimelinePin[]>([]);
  const [suKienList, setSuKienList] = useState<SuKienCardData[]>([]);
  const [timelineMoc, setTimelineMoc] = useState<TuyenSinhTimelineMoc[]>([]);
  const [showPastSteps, setShowPastSteps] = useState(false);
  const [mocModal, setMocModal] = useState<MocModalMode | null>(null);
  const [editingKhoa, setEditingKhoa] = useState<KhoaHocCardData | null>(null);
  const [suKienModalOpen, setSuKienModalOpen] = useState(false);
  const [editingSuKien, setEditingSuKien] = useState<SuKienCardData | null>(null);
  const [timelineYear, setTimelineYear] = useState(defaultTruongNganhYear());

  const loadLopPins = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/co-so/${encodeURIComponent(orgId)}/timeline-lop-pins`,
        { credentials: "include" },
      );
      const data = (await res.json()) as { pins?: CoSoLopTimelinePin[] };
      if (res.ok) {
        setLopPins(data.pins ?? []);
      }
    } catch {
      /* giữ danh sách cũ */
    }
  }, [orgId]);

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

  const refreshTimelineSources = useCallback(async () => {
    await Promise.all([loadKhoa(), loadLopPins(), loadSuKien()]);
  }, [loadKhoa, loadLopPins, loadSuKien]);

  useEffect(() => {
    void refreshTimelineSources();
  }, [refreshTimelineSources, pathname]);

  useEffect(() => {
    function onKhoaUpdated(ev: Event) {
      const detail = (ev as CustomEvent<{ orgId?: string }>).detail;
      if (detail?.orgId === orgId) void refreshTimelineSources();
    }
    window.addEventListener(CO_SO_KHOA_UPDATED_EVENT, onKhoaUpdated);
    return () =>
      window.removeEventListener(CO_SO_KHOA_UPDATED_EVENT, onKhoaUpdated);
  }, [orgId, refreshTimelineSources]);

  useEffect(() => {
    setTimelineMoc(loadCoSoTimelineMoc(orgId));
  }, [orgId]);

  useEffect(() => {
    if (!isManaging) {
      setMocModal(null);
      setEditingKhoa(null);
      setSuKienModalOpen(false);
      setEditingSuKien(null);
    }
  }, [isManaging]);

  const autoPinSteps = useMemo(() => {
    const lopSteps = buildCoSoLopAutoPinSteps(lopPins, orgSlug, timelineYear);
    const khoaIdsWithLop = new Set(lopPins.map((p) => p.khoaId));
    const khoaFallback = buildCoSoAutoPinSteps(
      khoaList.filter((k) => !khoaIdsWithLop.has(k.id)),
      orgSlug,
    );
    return [...lopSteps, ...khoaFallback];
  }, [lopPins, khoaList, orgSlug, timelineYear]);

  const suKienOfYear = useMemo(
    () =>
      suKienList.filter((ev) => {
        const d = new Date(ev.batDau);
        return !Number.isNaN(d.getTime()) && d.getFullYear() === timelineYear;
      }),
    [suKienList, timelineYear],
  );

  const suKienSteps = useMemo(
    () => buildSuKienSteps(suKienOfYear, orgSlug),
    [suKienOfYear, orgSlug],
  );

  const suKienYears = useMemo(
    () =>
      suKienList
        .map((ev) => new Date(ev.batDau).getFullYear())
        .filter((y) => Number.isFinite(y)),
    [suKienList],
  );

  const timelineYearOptions = useMemo(() => {
    const years = [
      ...collectCoSoTimelineYears(timelineMoc),
      ...collectCoSoLopTimelineYears(lopPins),
      ...suKienYears,
    ];
    const unique = [...new Set(years)].sort((a, b) => b - a);
    if (
      isManaging &&
      isValidTruongYear(timelineYear) &&
      !unique.includes(timelineYear)
    ) {
      return [timelineYear, ...unique].sort((a, b) => b - a);
    }
    return unique;
  }, [timelineMoc, lopPins, suKienYears, isManaging, timelineYear]);

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

  const timelineSteps = useMemo(() => {
    const merged = [...autoPinSteps, ...customSteps, ...suKienSteps];
    return merged.sort(
      (a, b) =>
        coSoStepSortKey(a, lopPins, khoaList, yearMoc, suKienList) -
        coSoStepSortKey(b, lopPins, khoaList, yearMoc, suKienList),
    );
  }, [autoPinSteps, customSteps, suKienSteps, lopPins, khoaList, yearMoc, suKienList]);

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

  function stepRole(step: TuyenSinhTimelineStep): StepRole {
    if (focus.pastIds.has(step.id)) return "past";
    if (step.id === focus.currentId) return "current";
    if (step.id === focus.nextId) return "next";
    return "default";
  }

  function stepEditHint(step: TuyenSinhTimelineStep): string {
    if (parseSuKienStepId(step.id)) return "Bấm để sửa hoặc xóa sự kiện";
    if (isCoSoAutoPinLopStepId(step.id)) return "";
    if (isCoSoAutoPinKhoaStepId(step.id)) return "Bấm để sửa khóa học";
    return "Bấm để sửa hoặc xóa";
  }

  function isStepTimelineEditable(step: TuyenSinhTimelineStep): boolean {
    if (parseSuKienStepId(step.id)) return true;
    return !isCoSoAutoPinLopStepId(step.id);
  }

  function handleEditStep(step: TuyenSinhTimelineStep) {
    const suKienId = parseSuKienStepId(step.id);
    if (suKienId) {
      const ev = suKienList.find((e) => e.id === suKienId);
      if (!ev) {
        ctx?.showToast("Không tìm thấy sự kiện — thử tải lại trang.");
        void refreshTimelineSources();
        return;
      }
      setMocModal(null);
      setEditingKhoa(null);
      setSuKienModalOpen(false);
      setEditingSuKien(ev);
      return;
    }
    if (isCoSoAutoPinStepId(step.id)) {
      handleEditAutoPin(step);
      return;
    }
    setEditingKhoa(null);
    setMocModal({ kind: "edit", mocId: step.id });
  }

  const modalMoc = useMemo(() => {
    if (!mocModal) return null;
    if (mocModal.kind === "new") return emptyTimelineMoc();
    return timelineMoc.find((m) => m.id === mocModal.mocId) ?? null;
  }, [mocModal, timelineMoc]);

  useEffect(() => {
    setShowPastSteps(false);
  }, [timelineYear, timelineSteps.length]);

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
    if (isCoSoAutoPinLopStepId(step.id)) {
      const parsed = parseCoSoAutoPinLopId(step.id);
      if (!parsed) return;
      const pin = lopPins.find((p) => p.lopId === parsed.lopId);
      if (!pin) {
        ctx?.showToast("Không tìm thấy lớp học — thử tải lại trang.");
        void refreshTimelineSources();
        return;
      }
      setMocModal(null);
      setEditingKhoa(null);
      router.push(coSoKhoaHocDetailPath(orgSlug, pin.khoaSlug));
      return;
    }

    const khoaId = parseCoSoAutoPinKhoaId(step.id);
    if (!khoaId) return;
    const khoa = khoaList.find((k) => k.id === khoaId);
    if (!khoa) {
      ctx?.showToast("Không tìm thấy khóa học — thử tải lại trang.");
      void refreshTimelineSources();
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
    saveCoSoTimelineMoc(orgId, next);
    setTimelineMoc(next);
    setMocModal(null);
    ctx?.showToast("Đã xóa mốc thông báo");
  }

  const canAddMoc = isManaging && timelineMoc.length < TIMELINE_MOC_MAX_ITEMS;
  const hasContent = timelineSteps.length > 0;

  return (
    <>
      <aside
        className="tdh-admission-side"
        aria-label="Khai giảng và thông báo"
        id={isMobileShell ? "cso-shell-panel-notify" : undefined}
        role={isMobileShell ? "tabpanel" : undefined}
        aria-labelledby={isMobileShell ? "cso-shell-tab-notify" : undefined}
        hidden={isMobileShell ? !isMobileShellActive : undefined}
      >
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

              {isManaging ? (
                <button
                  type="button"
                  className="timeline-item timeline-add-moc timeline-add-su-kien"
                  onClick={() => {
                    setEditingKhoa(null);
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
        <KhoaHocCreateModal
          open={Boolean(editingKhoa)}
          orgId={orgId}
          orgDiaChi={orgDiaChi}
          editing={editingKhoa}
          onClose={() => setEditingKhoa(null)}
          onUpdated={handleKhoaUpdated}
        />
      ) : null}

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
