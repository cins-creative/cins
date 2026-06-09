"use client";

import { Calendar, CalendarClock, Clock, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  collectScrollResizeTargets,
  computeFixedMenuPosition,
} from "@/lib/ui/clamp-fixed-menu-position";
import { baiDangDateInputValue } from "@/lib/truong/bai-dang-timeline";
import {
  baiDangScheduleFromDateAndTime,
  baiDangTimeInputValue,
  defaultOrgBaiDangScheduleParts,
  formatOrgBaiDangScheduleLabel,
  formatOrgBaiDangSchedulePreview,
  isFutureOrgBaiDangSchedule,
} from "@/lib/truong/org-bai-dang-schedule";

const PANEL_W = 320;
const PANEL_EST_H = 280;
const PANEL_Z = 9610;

type Props = {
  value: string | null;
  onChange: (iso: string | null) => void;
  disabled?: boolean;
  menuZIndex?: number;
};

export function OrgBaiDangScheduleComposeButton({
  value,
  onChange,
  disabled = false,
  menuZIndex = PANEL_Z,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [panelStyle, setPanelStyle] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [dateValue, setDateValue] = useState("");
  const [timeValue, setTimeValue] = useState("09:00");
  const [error, setError] = useState<string | null>(null);

  const scheduled = value && isFutureOrgBaiDangSchedule(value);
  const scheduleLabel = scheduled ? formatOrgBaiDangScheduleLabel(value) : "";

  const draftIso = useMemo(
    () => baiDangScheduleFromDateAndTime(dateValue, timeValue),
    [dateValue, timeValue],
  );
  const draftPreview = useMemo(
    () => formatOrgBaiDangSchedulePreview(draftIso),
    [draftIso],
  );
  const draftIsFuture = draftIso ? isFutureOrgBaiDangSchedule(draftIso) : false;

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const syncDraftFromValue = useCallback(() => {
    if (value && isFutureOrgBaiDangSchedule(value)) {
      setDateValue(baiDangDateInputValue(value));
      setTimeValue(baiDangTimeInputValue(value));
      return;
    }
    const defaults = defaultOrgBaiDangScheduleParts();
    setDateValue(defaults.date);
    setTimeValue(defaults.time);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    syncDraftFromValue();
    setError(null);
  }, [open, syncDraftFromValue]);

  const closePanel = () => {
    setOpen(false);
    setError(null);
  };

  const updatePanelPosition = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) {
      setPanelStyle(null);
      return;
    }
    const rect = btn.getBoundingClientRect();
    const panelHeight =
      panelRef.current?.getBoundingClientRect().height || PANEL_EST_H;
    const { top, left } = computeFixedMenuPosition(
      rect,
      { width: PANEL_W, height: panelHeight },
      { gap: 8, margin: 8 },
    );
    setPanelStyle({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPanelStyle(null);
      return;
    }
    updatePanelPosition();
    const scrollTargets = collectScrollResizeTargets(btnRef.current);
    const onReflow = () => updatePanelPosition();
    for (const target of scrollTargets) {
      target.addEventListener("scroll", onReflow, { passive: true });
    }
    window.addEventListener("resize", onReflow);
    return () => {
      for (const target of scrollTargets) {
        target.removeEventListener("scroll", onReflow);
      }
      window.removeEventListener("resize", onReflow);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    const node = panelRef.current;
    const ro = new ResizeObserver(() => updatePanelPosition());
    ro.observe(node);
    return () => ro.disconnect();
  }, [open, updatePanelPosition, panelStyle?.top]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      closePanel();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const applySchedule = () => {
    if (!draftIso) {
      setError("Chọn ngày và giờ hợp lệ.");
      return;
    }
    if (!isFutureOrgBaiDangSchedule(draftIso)) {
      setError("Giờ hẹn phải sau thời điểm hiện tại.");
      return;
    }
    onChange(draftIso);
    closePanel();
  };

  const clearSchedule = () => {
    onChange(null);
    closePanel();
  };

  const panel =
    open && panelStyle && portalReady && typeof document !== "undefined"
      ? createPortal(
          <div className="cins-editor-page vis-portal-root">
            <div
              ref={panelRef}
              className="org-compose-schedule-panel is-portal"
              role="dialog"
              aria-label="Hẹn lịch đăng"
              style={{
                position: "fixed",
                top: panelStyle.top,
                left: panelStyle.left,
                width: PANEL_W,
                zIndex: menuZIndex,
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <header className="org-compose-schedule-header">
                <div className="org-compose-schedule-header-main">
                  <span className="org-compose-schedule-header-ico" aria-hidden>
                    <CalendarClock size={18} strokeWidth={2} />
                  </span>
                  <div className="org-compose-schedule-header-text">
                    <span className="org-compose-schedule-title">Hẹn lịch đăng</span>
                    <span className="org-compose-schedule-subtitle">
                      Bài chỉ hiện trên trang trường khi đến giờ
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="org-compose-schedule-close"
                  aria-label="Đóng"
                  onClick={closePanel}
                >
                  <X size={16} strokeWidth={2} aria-hidden />
                </button>
              </header>

              <div
                className={`org-compose-schedule-preview${draftIsFuture ? " is-valid" : " is-muted"}`}
              >
                {draftPreview ? (
                  <>
                    <span className="org-compose-schedule-preview-weekday">
                      {draftPreview.weekday}
                    </span>
                    <span className="org-compose-schedule-preview-date">
                      {draftPreview.dateLine}
                    </span>
                    <span className="org-compose-schedule-preview-time">
                      <Clock size={14} strokeWidth={2} aria-hidden />
                      {draftPreview.timeLine}
                    </span>
                  </>
                ) : (
                  <span className="org-compose-schedule-preview-empty">
                    Chọn ngày và giờ bên dưới
                  </span>
                )}
              </div>

              <div className="org-compose-schedule-fields">
                <label className="org-compose-schedule-field">
                  <span className="org-compose-schedule-field-label">Ngày đăng</span>
                  <span className="org-compose-schedule-input-wrap">
                    <Calendar
                      size={15}
                      strokeWidth={2}
                      className="org-compose-schedule-input-ico"
                      aria-hidden
                    />
                    <input
                      type="date"
                      className="org-compose-schedule-input"
                      value={dateValue}
                      onChange={(e) => {
                        setDateValue(e.target.value);
                        setError(null);
                      }}
                    />
                  </span>
                </label>
                <label className="org-compose-schedule-field">
                  <span className="org-compose-schedule-field-label">Giờ đăng</span>
                  <span className="org-compose-schedule-input-wrap">
                    <Clock
                      size={15}
                      strokeWidth={2}
                      className="org-compose-schedule-input-ico"
                      aria-hidden
                    />
                    <input
                      type="time"
                      className="org-compose-schedule-input"
                      value={timeValue}
                      onChange={(e) => {
                        setTimeValue(e.target.value);
                        setError(null);
                      }}
                    />
                  </span>
                </label>
              </div>

              {error ? (
                <p className="org-compose-schedule-error" role="alert">
                  {error}
                </p>
              ) : null}

              <footer className="org-compose-schedule-footer">
                <div className="org-compose-schedule-footer-inner">
                  {scheduled ? (
                    <button
                      type="button"
                      className="org-compose-schedule-footer-link"
                      onClick={clearSchedule}
                    >
                      Bỏ hẹn, đăng ngay
                    </button>
                  ) : null}
                  <div className="org-compose-schedule-footer-actions">
                    <button
                      type="button"
                      className="org-compose-schedule-btn-ghost"
                      onClick={closePanel}
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      className="org-compose-schedule-btn-primary"
                      onClick={applySchedule}
                    >
                      Xác nhận hẹn
                    </button>
                  </div>
                </div>
              </footer>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      className={`org-compose-schedule-wrap${scheduled ? " is-scheduled" : ""}${open ? " is-open" : ""}`}
      ref={wrapRef}
    >
      <button
        ref={btnRef}
        type="button"
        className="org-compose-schedule-btn"
        aria-expanded={open}
        aria-haspopup="dialog"
        disabled={disabled}
        title={scheduled ? `Hẹn đăng: ${scheduleLabel}` : "Hẹn lịch đăng"}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <CalendarClock size={15} strokeWidth={2} aria-hidden />
        <span className="org-compose-schedule-btn-text">
          {scheduled ? scheduleLabel : "Hẹn đăng"}
        </span>
      </button>
      {panel}
    </div>
  );
}
