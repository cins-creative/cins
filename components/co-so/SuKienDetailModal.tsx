"use client";

import {
  CalendarDays,
  Check,
  Heart,
  ImageIcon,
  MapPin,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useId, useState, useTransition } from "react";

import { ArticleRichBody } from "@/components/article/ArticleRichBody";
import { useAuthGate } from "@/components/auth/AuthGateProvider";
import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import type { LoaiPhanHoiSuKien } from "@/lib/to-chuc/su-kien-dang-ky";
import {
  labelSuKienVe,
  type SuKienCardData,
} from "@/lib/to-chuc/su-kien-constants";
import { formatSuKienDiaDiemDisplay } from "@/lib/truong/contact";
import { hasTruongGioiThieuContent } from "@/lib/truong/gioi-thieu";

type Props = {
  open: boolean;
  orgId: string;
  suKien: SuKienCardData | null;
  onClose: () => void;
  onSoDangKyChange?: (suKienId: string, soDangKy: number) => void;
};

function formatRange(batDau: string, ketThuc: string | null): string {
  const start = new Date(batDau);
  if (Number.isNaN(start.getTime())) return "";
  const dateFmt = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeFmt = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const startStr = `${dateFmt.format(start)} · ${timeFmt.format(start)}`;
  if (!ketThuc) return startStr;
  const end = new Date(ketThuc);
  if (Number.isNaN(end.getTime())) return startStr;
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) return `${startStr} – ${timeFmt.format(end)}`;
  return `${startStr} → ${dateFmt.format(end)} · ${timeFmt.format(end)}`;
}

const AUTH_MESSAGE = "Đăng nhập để quan tâm hoặc đăng ký tham gia sự kiện.";

export function SuKienDetailModal({
  open,
  orgId,
  suKien,
  onClose,
  onSoDangKyChange,
}: Props) {
  const titleId = useId();
  const { isAuthenticated, openAuthModal } = useAuthGate();
  const [loai, setLoai] = useState<LoaiPhanHoiSuKien | null>(null);
  const [soDangKy, setSoDangKy] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    if (!suKien) return;
    setLoaded(false);
    setActionError(null);
    void fetch(
      `/api/org/${encodeURIComponent(orgId)}/su-kien/${encodeURIComponent(suKien.id)}/dang-ky`,
      { credentials: "include" },
    )
      .then(async (res) => {
        const data = (await res.json()) as {
          loai?: LoaiPhanHoiSuKien | null;
          soDangKy?: number;
        };
        if (res.ok) {
          setLoai(data.loai ?? null);
          setSoDangKy(
            typeof data.soDangKy === "number" ? data.soDangKy : suKien.soDangKy,
          );
        }
      })
      .finally(() => setLoaded(true));
  }, [orgId, suKien]);

  useEffect(() => {
    if (open && suKien) {
      setSoDangKy(suKien.soDangKy);
      refresh();
    } else {
      setLoai(null);
      setLoaded(false);
      setActionError(null);
    }
  }, [open, suKien, refresh]);

  function handlePhanHoi(nextLoai: LoaiPhanHoiSuKien) {
    if (!suKien) return;
    if (!isAuthenticated) {
      openAuthModal(AUTH_MESSAGE);
      return;
    }

    startTransition(async () => {
      setActionError(null);
      const res = await fetch(
        `/api/org/${encodeURIComponent(orgId)}/su-kien/${encodeURIComponent(suKien.id)}/dang-ky`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ loai: nextLoai }),
        },
      );
      const data = (await res.json().catch(() => null)) as {
        loai?: LoaiPhanHoiSuKien | null;
        soDangKy?: number;
        error?: string;
      } | null;
      if (!res.ok) {
        setActionError(data?.error ?? "Không lưu được phản hồi.");
        return;
      }
      const newLoai = data?.loai ?? null;
      const newCount =
        typeof data?.soDangKy === "number" ? data.soDangKy : soDangKy;
      setLoai(newLoai);
      setSoDangKy(newCount);
      onSoDangKyChange?.(suKien.id, newCount);
    });
  }

  if (!suKien) return null;

  const diaDiemLabel = formatSuKienDiaDiemDisplay(
    suKien.tinhThanh,
    suKien.diaDiem,
  );
  const slotFull =
    suKien.slotToiDa != null &&
    soDangKy >= suKien.slotToiDa &&
    loai !== "se_tham_gia";
  const hasDetail = hasTruongGioiThieuContent(suKien.noiDung);

  return (
    <TruongInlineModal
      open={open}
      onClose={onClose}
      className="tdh-inline-modal--wide cso-sk-detail-modal"
      labelledBy={titleId}
      showClose={false}
    >
      <div className="cso-sk-detail-cover">
        {suKien.coverSrc ? (
          <Image
            src={suKien.coverSrc}
            alt=""
            fill
            className="cso-sk-detail-cover-img"
            sizes="(max-width: 640px) 100vw, 560px"
            priority
          />
        ) : (
          <span className="cso-sk-detail-cover-ph" aria-hidden>
            <ImageIcon size={40} strokeWidth={1.25} />
          </span>
        )}
        <button
          type="button"
          className="cso-sk-detail-close"
          aria-label="Đóng"
          onClick={onClose}
        >
          <X size={18} aria-hidden />
        </button>
      </div>

      <div className="cso-sk-detail-body">
        <h2 id={titleId} className="cso-sk-detail-title">
          {suKien.ten}
        </h2>

        <div className="cso-sk-detail-meta">
          <p className="cso-sk-detail-meta-row">
            <CalendarDays size={15} aria-hidden />
            {formatRange(suKien.batDau, suKien.ketThuc)}
          </p>
          <p className="cso-sk-detail-meta-row">
            <span className="cso-sk-meta-item--tag">
              {labelSuKienVe(suKien.mienPhi, suKien.giaVe)}
            </span>
          </p>
          {diaDiemLabel ? (
            <p className="cso-sk-detail-meta-row">
              <MapPin size={15} aria-hidden />
              {diaDiemLabel}
            </p>
          ) : null}
          {suKien.slotToiDa ? (
            <p className="cso-sk-detail-meta-row">
              <Users size={15} aria-hidden />
              {soDangKy}/{suKien.slotToiDa} chỗ
              {slotFull ? " · Hết chỗ" : ""}
            </p>
          ) : null}
        </div>

        {suKien.moTa ? <p className="cso-sk-detail-lead">{suKien.moTa}</p> : null}

        {hasDetail ? (
          <div className="cso-sk-detail-rich-wrap">
            <ArticleRichBody
              source={suKien.noiDung!}
              className="cso-sk-detail-rich article-rich-content article-content-html"
            />
          </div>
        ) : null}
      </div>

      <div className="cso-sk-detail-foot">
        {actionError ? (
          <p className="cso-sk-detail-foot-err">{actionError}</p>
        ) : null}
        <div className="cso-sk-detail-actions">
          <button
            type="button"
            className={`cso-sk-detail-btn cso-sk-detail-btn--interest${loai === "quan_tam" ? " is-active" : ""}`}
            aria-pressed={loai === "quan_tam"}
            disabled={!loaded || pending}
            onClick={() => handlePhanHoi("quan_tam")}
          >
            <Heart size={16} aria-hidden />
            {loai === "quan_tam" ? "Đang quan tâm" : "Quan tâm"}
          </button>
          <button
            type="button"
            className={`cso-sk-detail-btn cso-sk-detail-btn--join${loai === "se_tham_gia" ? " is-active" : ""}`}
            aria-pressed={loai === "se_tham_gia"}
            disabled={!loaded || pending || slotFull}
            onClick={() => handlePhanHoi("se_tham_gia")}
          >
            {loai === "se_tham_gia" ? (
              <Check size={16} aria-hidden />
            ) : (
              <Users size={16} aria-hidden />
            )}
            {loai === "se_tham_gia" ? "Đã đăng ký" : "Sẽ tham gia"}
          </button>
        </div>
      </div>
    </TruongInlineModal>
  );
}
