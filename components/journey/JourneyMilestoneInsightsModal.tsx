"use client";

import { BarChart3, Eye, FileText, Image as ImageIcon, Link2, MessageCircle, UserRound, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { CotMocInsight } from "@/lib/social/su-kien";

import "./journey-milestone-insights.css";

type Props = {
  open: boolean;
  onClose: () => void;
  milestoneId: string;
};

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; data: CotMocInsight }
  | { status: "forbidden" }
  | { status: "error"; message: string };

function formatNumber(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n);
}

export function JourneyMilestoneInsightsModal({ open, onClose, milestoneId }: Props) {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<FetchState>({ status: "idle" });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setState({ status: "loading" });
    void fetch(`/api/social/su-kien?cotMocId=${encodeURIComponent(milestoneId)}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 403) {
          setState({ status: "forbidden" });
          return;
        }
        if (!res.ok) {
          setState({ status: "error", message: "Không tải được số liệu." });
          return;
        }
        const json = (await res.json().catch(() => null)) as {
          insight?: CotMocInsight;
        } | null;
        if (cancelled) return;
        if (json?.insight) setState({ status: "ok", data: json.insight });
        else setState({ status: "error", message: "Không có dữ liệu." });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", message: "Lỗi mạng." });
      });
    return () => {
      cancelled = true;
    };
  }, [open, milestoneId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="jmi-backdrop" role="presentation" onClick={onClose}>
      <div
        className="jmi-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Số liệu tiếp cận"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="jmi-head">
          <span className="jmi-head-ico" aria-hidden>
            <BarChart3 size={18} strokeWidth={2} />
          </span>
          <div className="jmi-head-copy">
            <strong>Số liệu tiếp cận</strong>
            <small>Chỉ bạn (quản trị) thấy — không hiển thị công khai.</small>
          </div>
          <button type="button" className="jmi-close" aria-label="Đóng" onClick={onClose}>
            <X size={16} aria-hidden />
          </button>
        </div>

        {state.status === "loading" ? (
          <p className="jmi-msg">Đang tải số liệu…</p>
        ) : state.status === "forbidden" ? (
          <p className="jmi-msg">Chỉ quản trị viên của tổ chức mới xem được số liệu này.</p>
        ) : state.status === "error" ? (
          <p className="jmi-msg jmi-msg--err">{state.message}</p>
        ) : state.status === "ok" ? (
          <div className="jmi-grid">
            <Stat
              icon={<Eye size={16} strokeWidth={1.9} aria-hidden />}
              label="Lượt tiếp cận"
              value={state.data.luotTiepCan}
              sub={`${formatNumber(state.data.tiepCanUnique)} người/phiên duy nhất`}
            />
            <Stat
              icon={<FileText size={16} strokeWidth={1.9} aria-hidden />}
              label="Xem nội dung"
              value={state.data.luotXemNoiDung}
            />
            <Stat
              icon={<UserRound size={16} strokeWidth={1.9} aria-hidden />}
              label="Click xem hồ sơ"
              value={state.data.luotClickProfile}
            />
            <Stat
              icon={<MessageCircle size={16} strokeWidth={1.9} aria-hidden />}
              label="Mở bình luận"
              value={state.data.luotMoComment}
            />
            <Stat
              icon={<ImageIcon size={16} strokeWidth={1.9} aria-hidden />}
              label="Xem ảnh / video"
              value={state.data.luotXemMedia}
            />
            <Stat
              icon={<Link2 size={16} strokeWidth={1.9} aria-hidden />}
              label="Click liên kết"
              value={state.data.luotClickLienKet}
            />
          </div>
        ) : null}

        <p className="jmi-foot">
          <Users size={12} strokeWidth={2} aria-hidden />
          Số liệu tổng hợp mỗi ngày, có thể trễ tới sáng hôm sau.
        </p>
      </div>
    </div>,
    document.body,
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <div className="jmi-stat">
      <span className="jmi-stat-ico" aria-hidden>
        {icon}
      </span>
      <span className="jmi-stat-num">{formatNumber(value)}</span>
      <span className="jmi-stat-lbl">{label}</span>
      {sub ? <span className="jmi-stat-sub">{sub}</span> : null}
    </div>
  );
}
