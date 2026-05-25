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

export function TruongNganhMonThiDauVao({
  orgId,
  programId,
  year,
  open,
  cached,
}: Props) {
  const [fetched, setFetched] = useState<TruongCauHinhTinhDiem | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || cached?.mon.length || !orgId.trim() || !programId.trim()) {
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
  }, [open, cached?.mon.length, orgId, programId, year]);

  const config = cached?.mon.length ? cached : fetched;
  const { khoiLabel, monItems } = useMemo(
    () => monThiDauVaoFromConfig(config),
    [config],
  );

  return (
    <div className="nganh-mon-thi">
      <div className="nib-cell-label">Môn thi đầu vào {year}</div>
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
    </div>
  );
}
