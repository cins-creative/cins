"use client";

import { Check, Heart, Users } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";

import { useAuthGate } from "@/components/auth/AuthGateProvider";
import type { LoaiPhanHoiSuKien } from "@/lib/to-chuc/su-kien-dang-ky";

const AUTH_MESSAGE = "Đăng nhập để quan tâm hoặc đăng ký tham gia sự kiện.";

type Props = {
  orgId: string;
  suKienId: string;
  slotToiDa?: number | null;
  initialSoDangKy?: number;
  enabled?: boolean;
  className?: string;
  onLoaiChange?: (loai: LoaiPhanHoiSuKien | null) => void;
  onSoDangKyChange?: (soDangKy: number) => void;
};

export function SuKienPhanHoiActions({
  orgId,
  suKienId,
  slotToiDa = null,
  initialSoDangKy = 0,
  enabled = true,
  className,
  onLoaiChange,
  onSoDangKyChange,
}: Props) {
  const { isAuthenticated, openAuthModal } = useAuthGate();
  const [loai, setLoai] = useState<LoaiPhanHoiSuKien | null>(null);
  const [soDangKy, setSoDangKy] = useState(initialSoDangKy);
  const [loaded, setLoaded] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    if (!enabled) return;
    setLoaded(false);
    setActionError(null);
    void fetch(
      `/api/org/${encodeURIComponent(orgId)}/su-kien/${encodeURIComponent(suKienId)}/dang-ky`,
      { credentials: "include" },
    )
      .then(async (res) => {
        const data = (await res.json()) as {
          loai?: LoaiPhanHoiSuKien | null;
          soDangKy?: number;
        };
        if (res.ok) {
          const nextLoai = data.loai ?? null;
          const nextCount =
            typeof data.soDangKy === "number" ? data.soDangKy : initialSoDangKy;
          setLoai(nextLoai);
          setSoDangKy(nextCount);
          onLoaiChange?.(nextLoai);
          onSoDangKyChange?.(nextCount);
        }
      })
      .finally(() => setLoaded(true));
  }, [enabled, orgId, suKienId, initialSoDangKy, onLoaiChange, onSoDangKyChange]);

  useEffect(() => {
    if (enabled) {
      setSoDangKy(initialSoDangKy);
      refresh();
    } else {
      setLoai(null);
      setLoaded(false);
      setActionError(null);
    }
  }, [enabled, suKienId, orgId, initialSoDangKy, refresh]);

  function handlePhanHoi(nextLoai: LoaiPhanHoiSuKien) {
    if (!isAuthenticated) {
      openAuthModal(AUTH_MESSAGE);
      return;
    }

    startTransition(async () => {
      setActionError(null);
      const res = await fetch(
        `/api/org/${encodeURIComponent(orgId)}/su-kien/${encodeURIComponent(suKienId)}/dang-ky`,
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
      onLoaiChange?.(newLoai);
      onSoDangKyChange?.(newCount);
    });
  }

  const slotFull =
    slotToiDa != null && soDangKy >= slotToiDa && loai !== "se_tham_gia";

  return (
    <div className={className}>
      {actionError ? (
        <p className="cso-sk-detail-foot-err" role="alert">
          {actionError}
        </p>
      ) : null}
      <div className="cso-sk-detail-actions">
        <button
          type="button"
          className={`cso-sk-detail-btn cso-sk-detail-btn--interest${loai === "quan_tam" ? " is-active" : ""}`}
          aria-pressed={loai === "quan_tam"}
          disabled={!loaded || pending || !enabled}
          onClick={() => handlePhanHoi("quan_tam")}
        >
          <Heart size={16} aria-hidden />
          {loai === "quan_tam" ? "Đang quan tâm" : "Quan tâm"}
        </button>
        <button
          type="button"
          className={`cso-sk-detail-btn cso-sk-detail-btn--join${loai === "se_tham_gia" ? " is-active" : ""}`}
          aria-pressed={loai === "se_tham_gia"}
          disabled={!loaded || pending || slotFull || !enabled}
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
  );
}
