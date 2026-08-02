"use client";

import { CalendarDays, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { SuKienCreateModal } from "@/components/co-so/SuKienCreateModal";
import type { SuKienQuanLyOrgPayload } from "@/lib/to-chuc/su-kien-quan-ly-types";
import {
  studioSuKienManagePath,
  studioSuKienPath,
} from "@/lib/to-chuc/studio-routes";

type Props = {
  orgId: string;
  orgSlug: string;
};

function formatRange(batDau: string, ketThuc: string | null): string {
  try {
    const start = new Date(batDau);
    const fmt = new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    if (!ketThuc) return fmt.format(start);
    return `${fmt.format(start)} → ${fmt.format(new Date(ketThuc))}`;
  } catch {
    return batDau;
  }
}

export function StudioSuKienQuanLyClient({ orgId, orgSlug }: Props) {
  const [data, setData] = useState<SuKienQuanLyOrgPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/org/${encodeURIComponent(orgId)}/su-kien/quan-ly`,
        { cache: "no-store", credentials: "same-origin" },
      );
      const json = (await res.json()) as SuKienQuanLyOrgPayload & {
        error?: string;
      };
      if (!res.ok) {
        setErr(json.error ?? "Không tải được danh sách sự kiện.");
        setData(null);
        return;
      }
      setData({
        suKien: json.suKien ?? [],
        tongChoDuyet: json.tongChoDuyet ?? 0,
      });
    } catch {
      setErr("Không tải được danh sách sự kiện.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="cso-su-kien-ql">
      <header className="cso-su-kien-ql-head">
        <div>
          <h1 className="cso-su-kien-ql-title">Sự kiện</h1>
          <p className="cso-su-kien-ql-desc">
            Tạo và quản lý sự kiện studio — duyệt quầy, đăng ký, nội dung chờ xử
            lý.
            {data && data.tongChoDuyet > 0 ? (
              <>
                {" "}
                <strong>{data.tongChoDuyet}</strong> mục chờ duyệt.
              </>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          className="cso-ql-btn cso-ql-btn--primary"
          onClick={() => setCreateOpen(true)}
        >
          <Plus size={16} strokeWidth={2.2} aria-hidden />
          Tạo sự kiện
        </button>
      </header>

      {loading ? (
        <p className="cso-su-kien-ql-empty">
          <Loader2 size={16} className="uas-spin" aria-hidden /> Đang tải…
        </p>
      ) : err ? (
        <p className="cso-su-kien-ql-empty" role="alert">
          {err}
        </p>
      ) : !data?.suKien.length ? (
        <p className="cso-su-kien-ql-empty">
          <CalendarDays size={18} strokeWidth={2} aria-hidden /> Chưa có sự kiện
          đang / sắp diễn ra.
        </p>
      ) : (
        <ul className="cso-su-kien-ql-list" role="list">
          {data.suKien.map((item) => (
            <li key={item.id} className="cso-su-kien-ql-card">
              <div className="cso-su-kien-ql-card-main">
                <Link
                  href={studioSuKienPath(orgSlug, item.id)}
                  className="cso-su-kien-ql-card-title"
                >
                  {item.ten}
                </Link>
                <p className="cso-su-kien-ql-card-meta">
                  {item.status === "active" ? "Đang diễn ra" : "Sắp tới"} ·{" "}
                  {formatRange(item.batDau, item.ketThuc)}
                </p>
                <p className="cso-su-kien-ql-card-stats">
                  {item.soSeThamGia} sẽ tham gia
                  {item.soChoDuyetNoiDung > 0
                    ? ` · ${item.soChoDuyetNoiDung} chờ duyệt`
                    : ""}
                </p>
              </div>
              <Link
                href={studioSuKienManagePath(orgSlug, item.id)}
                className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
              >
                Quản lý
              </Link>
            </li>
          ))}
        </ul>
      )}

      {createOpen ? (
        <SuKienCreateModal
          open
          orgId={orgId}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}
