"use client";

import { BarChart3, Building2, Eye, FileText, Globe, Image as ImageIcon, Link2, MessageCircle, UserRound, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { giaiDoanLabel } from "@/lib/cins/home-adaptive/labels";
import type { CotMocInsight } from "@/lib/social/su-kien";

import "./journey-milestone-insights.css";

/** Nhãn nhóm người xem — phủ thêm các giá trị tổng hợp ngoài enum giai_doan. */
function nhomNguoiXemLabel(key: string): string {
  if (key === "khach") return "Khách (chưa đăng nhập)";
  if (key === "chua_khai") return "Chưa khai báo";
  return giaiDoanLabel(key);
}

type Props = {
  open: boolean;
  onClose: () => void;
  /** Cột mốc — tương thích usage cũ. Nếu có `subject` thì ưu tiên `subject`. */
  milestoneId?: string;
  /** Đối tượng tổng quát: cột mốc hoặc bài đăng tổ chức. */
  subject?: { loai: "cot_moc" | "org_bai_dang"; id: string };
};

function buildInsightQuery(props: Pick<Props, "milestoneId" | "subject">): string | null {
  const subject = props.subject ??
    (props.milestoneId ? { loai: "cot_moc" as const, id: props.milestoneId } : null);
  if (!subject) return null;
  const key = subject.loai === "org_bai_dang" ? "baiDangId" : "cotMocId";
  return `${key}=${encodeURIComponent(subject.id)}`;
}

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; data: CotMocInsight }
  | { status: "forbidden" }
  | { status: "error"; message: string };

function formatNumber(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n);
}

export function JourneyMilestoneInsightsModal({
  open,
  onClose,
  milestoneId,
  subject,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<FetchState>({ status: "idle" });
  const query = buildInsightQuery({ milestoneId, subject });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !query) return;
    let cancelled = false;
    setState({ status: "loading" });
    void fetch(`/api/social/su-kien?${query}`)
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
  }, [open, query]);

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
            <small>Riêng tư — chỉ tác giả / người được gắn / quản trị org thấy.</small>
          </div>
          <button type="button" className="jmi-close" aria-label="Đóng" onClick={onClose}>
            <X size={16} aria-hidden />
          </button>
        </div>

        {state.status === "loading" ? (
          <p className="jmi-msg">Đang tải số liệu…</p>
        ) : state.status === "forbidden" ? (
          <p className="jmi-msg">
            Chỉ tác giả, người được gắn thẻ, hoặc quản trị viên tổ chức mới xem được số liệu này.
          </p>
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

        {state.status === "ok" ? (
          <>
            <section className="jmi-section">
              <h4 className="jmi-section-title">Người xem thấy bài từ đâu</h4>
              <div className="jmi-split">
                <Split
                  icon={<Globe size={15} strokeWidth={1.9} aria-hidden />}
                  label="Từ bên ngoài"
                  hint="Feed, trang cá nhân, link trực tiếp…"
                  value={state.data.tiepCanBenNgoai}
                />
                <Split
                  icon={<Building2 size={15} strokeWidth={1.9} aria-hidden />}
                  label="Trong trang tổ chức"
                  hint="Trang trường / cơ sở (đồ án, sản phẩm…)"
                  value={state.data.tiepCanTrongToChuc}
                />
              </div>
            </section>

            <section className="jmi-section">
              <h4 className="jmi-section-title">Người xem theo nhóm</h4>
              {state.data.giaiDoanBreakdown.length === 0 ? (
                <p className="jmi-empty">Chưa có người xem được ghi nhận.</p>
              ) : (
                <ul className="jmi-bars">
                  {(() => {
                    const max = Math.max(
                      1,
                      ...state.data.giaiDoanBreakdown.map((r) => r.nguoi),
                    );
                    return state.data.giaiDoanBreakdown.map((r) => (
                      <li key={r.giaiDoan} className="jmi-bar-row">
                        <span className="jmi-bar-lbl">{nhomNguoiXemLabel(r.giaiDoan)}</span>
                        <span className="jmi-bar-track" aria-hidden>
                          <span
                            className="jmi-bar-fill"
                            style={{ width: `${Math.round((r.nguoi / max) * 100)}%` }}
                          />
                        </span>
                        <span className="jmi-bar-num">{formatNumber(r.nguoi)}</span>
                      </li>
                    ));
                  })()}
                </ul>
              )}
            </section>
          </>
        ) : null}

        <p className="jmi-foot">
          <Users size={12} strokeWidth={2} aria-hidden />
          Số liệu cập nhật gần thời gian thực. Không tính lượt xem của chính bạn.
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

function Split({
  icon,
  label,
  hint,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  value: number;
}) {
  return (
    <div className="jmi-split-card">
      <span className="jmi-split-ico" aria-hidden>
        {icon}
      </span>
      <span className="jmi-split-num">{formatNumber(value)}</span>
      <span className="jmi-split-lbl">{label}</span>
      <span className="jmi-split-hint">{hint}</span>
    </div>
  );
}
