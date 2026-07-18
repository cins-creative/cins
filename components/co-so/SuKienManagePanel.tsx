"use client";

import { ClipboardList, Heart, Loader2, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ShopQuaySuKienPanel } from "@/components/shop/ShopQuaySuKienPanel";
import { journeyPathForView } from "@/lib/journey/profile-share";
import type {
  SuKienQuanLyPayload,
  SuKienQuanLyStats,
} from "@/lib/to-chuc/su-kien-quan-ly-types";

import "@/components/shop/shop-dashboard.css";

type Props = {
  orgId: string;
  suKienId: string;
  /** Khi true — tải lại (vd. vừa mở tab). */
  active?: boolean;
  onPendingReviewCountChange?: (count: number) => void;
};

const EMPTY_STATS: SuKienQuanLyStats = {
  soSeThamGia: 0,
  soQuanTam: 0,
  soChoDuyetNoiDung: 0,
  soDaDuyetNoiDung: 0,
  slotToiDa: null,
};

/** Nội dung tab/modal quản lý sự kiện (thống kê, danh sách RSVP, chờ duyệt). */
export function SuKienManagePanel({
  orgId,
  suKienId,
  active = true,
  onPendingReviewCountChange,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<SuKienQuanLyPayload | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    void fetch(
      `/api/org/${encodeURIComponent(orgId)}/su-kien/${encodeURIComponent(suKienId)}/quan-ly`,
      { credentials: "include", cache: "no-store" },
    )
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as
          | (SuKienQuanLyPayload & { error?: string })
          | null;
        if (!res.ok) {
          throw new Error(json?.error ?? "Không tải được bảng quản lý.");
        }
        if (!cancelled && json) {
          const stats = json.stats ?? EMPTY_STATS;
          setData({
            stats,
            thanhVien: json.thanhVien ?? [],
          });
          onPendingReviewCountChange?.(stats.soChoDuyetNoiDung);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setErr(
            e instanceof Error ? e.message : "Không tải được bảng quản lý.",
          );
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active, orgId, suKienId, onPendingReviewCountChange]);

  const stats = data?.stats ?? EMPTY_STATS;
  const slotLabel =
    stats.slotToiDa != null
      ? `${stats.soSeThamGia}/${stats.slotToiDa}`
      : String(stats.soSeThamGia);

  return (
    <div className="cso-sk-manage-body cso-sk-manage-body--embedded">
      {loading ? (
        <p className="cso-sk-manage-loading">
          <Loader2 className="shop-spin" size={16} /> Đang tải…
        </p>
      ) : err ? (
        <p className="cso-sk-manage-err" role="alert">
          {err}
        </p>
      ) : (
        <>
          <div className="cso-sk-manage-stats" role="group" aria-label="Thống kê">
            <div className="cso-sk-manage-stat">
              <span className="cso-sk-manage-stat-ico" aria-hidden>
                <Users size={16} />
              </span>
              <span className="cso-sk-manage-stat-val">{slotLabel}</span>
              <span className="cso-sk-manage-stat-lbl">Sẽ tham gia</span>
            </div>
            <div className="cso-sk-manage-stat">
              <span className="cso-sk-manage-stat-ico" aria-hidden>
                <Heart size={16} />
              </span>
              <span className="cso-sk-manage-stat-val">{stats.soQuanTam}</span>
              <span className="cso-sk-manage-stat-lbl">Quan tâm</span>
            </div>
            <div className="cso-sk-manage-stat">
              <span className="cso-sk-manage-stat-ico" aria-hidden>
                <ClipboardList size={16} />
              </span>
              <span className="cso-sk-manage-stat-val">
                {stats.soChoDuyetNoiDung}
              </span>
              <span className="cso-sk-manage-stat-lbl">Chờ duyệt nội dung</span>
            </div>
            <div className="cso-sk-manage-stat">
              <span className="cso-sk-manage-stat-ico" aria-hidden>
                <ClipboardList size={16} />
              </span>
              <span className="cso-sk-manage-stat-val">
                {stats.soDaDuyetNoiDung}
              </span>
              <span className="cso-sk-manage-stat-lbl">Đã duyệt nội dung</span>
            </div>
          </div>

          <section className="cso-sk-manage-section">
            <h3 className="cso-sk-manage-section-title">Người tham dự & quan tâm</h3>
            {data?.thanhVien.length ? (
              <ul className="cso-sk-manage-people">
                {data.thanhVien.map((tv) => (
                  <li key={`${tv.id}-${tv.loai}`} className="cso-sk-manage-person">
                    <div className="cso-sk-manage-person-copy">
                      {tv.slug ? (
                        <Link
                          href={journeyPathForView(tv.slug, "journey")}
                          className="cso-sk-manage-person-name"
                        >
                          {tv.ten ?? "Thành viên"}
                        </Link>
                      ) : (
                        <span className="cso-sk-manage-person-name">
                          {tv.ten ?? "Thành viên"}
                        </span>
                      )}
                      {tv.slug ? (
                        <span className="cso-sk-manage-person-meta">
                          @{tv.slug}
                        </span>
                      ) : null}
                    </div>
                    <span
                      className={
                        tv.loai === "se_tham_gia"
                          ? "cso-sk-manage-chip is-join"
                          : "cso-sk-manage-chip is-interest"
                      }
                    >
                      {tv.loai === "se_tham_gia" ? "Sẽ tham gia" : "Quan tâm"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="cso-sk-manage-empty">
                Chưa có ai quan tâm hoặc đăng ký tham gia.
              </p>
            )}
          </section>

          <section className="cso-sk-manage-section">
            <h3 className="cso-sk-manage-section-title">
              Nội dung chờ duyệt
            </h3>
            <ShopQuaySuKienPanel
              suKienId={suKienId}
              canManage
              alwaysShow
              title="Đăng ký tham gia / quầy"
              onPendingCountChange={onPendingReviewCountChange}
            />
          </section>
        </>
      )}
    </div>
  );
}
