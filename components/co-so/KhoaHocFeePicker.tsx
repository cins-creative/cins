"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import type { GoiHocPhiKhoa, LoaiMoHinhKhoa } from "@/lib/to-chuc/khoa-hoc-types";
import {
  formatGoiHocPhiLine,
  hocPhiUnitForGoi,
} from "@/lib/to-chuc/khoa-hoc-goi-phi";
import { formatKhoaHocPhi, formatThoiLuongKhoa } from "@/lib/to-chuc/khoa-hoc-labels";

type Props = {
  packages: GoiHocPhiKhoa[];
  loaiMoHinh: LoaiMoHinhKhoa;
  selectedId?: string;
  onSelect?: (goi: GoiHocPhiKhoa) => void;
};

export function KhoaHocFeePicker({
  packages,
  loaiMoHinh,
  selectedId: selectedIdProp,
  onSelect,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [internalId, setInternalId] = useState(packages[0]?.id ?? "");
  const selectedId = selectedIdProp ?? internalId;

  useEffect(() => {
    if (selectedIdProp != null) return;
    if (!packages.some((goi) => goi.id === internalId)) {
      setInternalId(packages[0]?.id ?? "");
    }
  }, [packages, internalId, selectedIdProp]);

  useEffect(() => {
    if (!open) return;
    function onDocPointer(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected =
    packages.find((goi) => goi.id === selectedId) ?? packages[0] ?? null;
  const multi = packages.length > 1;
  const hasFee = selected != null;

  const feeValue = hasFee
    ? formatKhoaHocPhi(selected.hocPhi, loaiMoHinh).replace(/\/th$/, "")
    : "—";
  const feeUnit = selected
    ? hocPhiUnitForGoi(selected, loaiMoHinh, multi)
    : loaiMoHinh === "lien_tuc_theo_thang"
      ? "VNĐ/tháng"
      : "VNĐ/khóa";

  function pick(goi: GoiHocPhiKhoa) {
    if (selectedIdProp == null) setInternalId(goi.id);
    setOpen(false);
    onSelect?.(goi);
  }

  if (!multi) {
    return (
      <div className="cso-khd-metric cso-khd-metric--fee">
        <span className="cso-khd-metric-k">Học phí</span>
        <div className="cso-khd-metric-main">
          <span
            className={[
              "cso-khd-metric-v",
              !hasFee ? "is-empty" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {feeValue}
          </span>
          {hasFee ? (
            <span className="cso-khd-metric-unit">{feeUnit}</span>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={[
        "cso-khd-metric",
        "cso-khd-metric--fee",
        "cso-khd-metric--fee-picker",
        open ? "is-open" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="cso-khd-metric-k">Học phí</span>
      <button
        type="button"
        className="cso-khd-fee-picker-trigger"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        aria-label="Chọn gói học phí"
        title="Chọn gói học phí"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="cso-khd-metric-main">
          <span className="cso-khd-metric-v">{feeValue}</span>
          <span className="cso-khd-metric-unit">{feeUnit}</span>
        </span>
        <span className="cso-khd-fee-picker-chevron-wrap" aria-hidden>
          <ChevronDown
            size={20}
            strokeWidth={2.4}
            className="cso-khd-fee-picker-chevron"
          />
        </span>
      </button>
      {open ? (
        <ul
          id={listId}
          className="cso-khd-fee-picker-menu"
          role="listbox"
          aria-label="Chọn gói học phí"
        >
          {packages.map((goi) => {
            const duration = formatThoiLuongKhoa(goi.soBuoi ?? null, goi.phutMoiBuoi);
            const isActive = goi.id === selected?.id;
            return (
              <li key={goi.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={[
                    "cso-khd-fee-picker-opt",
                    isActive ? "is-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => pick(goi)}
                >
                  <span className="cso-khd-fee-picker-opt-title">
                    {formatGoiHocPhiLine(goi, loaiMoHinh)}
                  </span>
                  {duration !== "—" ? (
                    <span className="cso-khd-fee-picker-opt-meta">{duration}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function selectedGoiDurationLabel(goi: GoiHocPhiKhoa | null): string {
  if (!goi) return "—";
  return formatThoiLuongKhoa(goi.soBuoi ?? null, goi.phutMoiBuoi);
}
