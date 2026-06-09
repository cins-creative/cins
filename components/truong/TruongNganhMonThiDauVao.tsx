"use client";

import { useEffect, useMemo, useState } from "react";

import { MonThiThumb } from "@/components/truong/MonThiThumb";
import { monThiDauVaoFromConfig } from "@/lib/truong/mon-thi-dau-vao";
import type { TruongCauHinhTinhDiem } from "@/lib/truong/types";

type Props = {
  orgId: string;
  programId: string;
  year: number;
  open: boolean;
  cached?: TruongCauHinhTinhDiem | null;
};

function MonThiEyeOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.93" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <path d="M2 2l20 20" />
    </svg>
  );
}

export function TruongNganhMonThiDauVao({
  orgId,
  programId,
  year,
  open,
  cached,
}: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [fetched, setFetched] = useState<TruongCauHinhTinhDiem | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) setDetailsOpen(false);
  }, [open]);

  useEffect(() => {
    if (
      !open ||
      !detailsOpen ||
      cached?.mon.length ||
      !orgId.trim() ||
      !programId.trim()
    ) {
      setFetched(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({
      nam: String(year),
      nganh: programId,
    });

    void fetch(
      `/api/truong/${encodeURIComponent(orgId)}/cau-hinh-tinh-diem?${params}`,
    )
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setFetched(null);
          return;
        }
        const json = (await res.json()) as { config?: TruongCauHinhTinhDiem };
        setFetched(json.config ?? null);
      })
      .catch(() => {
        if (!cancelled) setFetched(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, detailsOpen, cached?.mon.length, orgId, programId, year]);

  const config = cached?.mon.length ? cached : fetched;
  const { khoiLabel, monItems } = useMemo(
    () => monThiDauVaoFromConfig(config),
    [config],
  );

  return (
    <div className="nganh-mon-thi">
      {!detailsOpen ? (
        <button
          type="button"
          className="nganh-mon-thi-toggle"
          onClick={() => setDetailsOpen(true)}
          aria-expanded={false}
        >
          Xem môn thi đầu vào
        </button>
      ) : (
        <>
          <div className="nganh-mon-thi-hdr">
            <div className="nib-cell-label">Môn thi đầu vào {year}</div>
            <button
              type="button"
              className="nganh-mon-thi-collapse"
              onClick={() => setDetailsOpen(false)}
              aria-expanded={true}
              aria-label="Ẩn môn thi đầu vào"
              title="Ẩn môn thi đầu vào"
            >
              <MonThiEyeOffIcon />
            </button>
          </div>
          {loading ? (
            <p className="nganh-mon-thi-placeholder">Đang tải…</p>
          ) : monItems.length > 0 ? (
            <>
              {khoiLabel ? (
                <p className="nganh-mon-thi-khoi">
                  <span className="cins-meta">Khối</span> {khoiLabel}
                </p>
              ) : null}
              <ul className="nganh-mon-thi-list" aria-label="Danh sách môn thi">
                {monItems.map((item) => (
                  <li key={item.key} className="nganh-mon-thi-chip">
                    <MonThiThumb
                      className="nganh-mon-thi-chip-thumb"
                      ten={item.ten}
                      loai={item.loai}
                      ma={item.ma}
                      thumbnail_id={item.thumbnail_id}
                      thumbnail_url={item.thumbnail_url}
                    />
                    <span className="nganh-mon-thi-chip-label">{item.label}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="nganh-mon-thi-placeholder">
              Chưa có cấu hình môn thi cho năm {year}.
            </p>
          )}
        </>
      )}
    </div>
  );
}
