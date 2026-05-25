"use client";

import { useMemo, useState } from "react";

import { TruongAdmissionCalc } from "@/components/truong/TruongAdmissionCalc";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { useYearFilter } from "@/components/truong/YearFilterProvider";
import { aggregatePhuongThucForCalc } from "@/lib/truong/phuong-thuc";
import type { CalcPhuongThucOption } from "@/lib/truong/phuong-thuc";
import type { TruongNganhProgram, TruongTuyenSinhNamRow } from "@/lib/truong/types";

type NganhOption = {
  label: string;
  id?: string;
  threshold: number;
};

type Props = {
  orgId: string;
  selectedYear?: number;
  nganhOptions?: NganhOption[];
  phuongThucOptions?: CalcPhuongThucOption[];
};

function CalcLauncherIcon() {
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
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 6h8M8 10h2M12 10h2M8 14h2M12 14h2M8 18h8" />
    </svg>
  );
}

export function TruongAdmissionCalcLauncher({
  orgId,
  selectedYear,
  nganhOptions,
  phuongThucOptions,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="tdh-admission-calc-launcher"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <span className="tdh-admission-calc-launcher-icon" aria-hidden>
          <CalcLauncherIcon />
        </span>
        <span className="tdh-admission-calc-launcher-label">
          Tự tính điểm xét tuyển
        </span>
      </button>

      <TruongInlineModal
        open={open}
        onClose={() => setOpen(false)}
        className="tdh-admission-calc-modal"
        labelledBy="tdh-admission-calc-title"
      >
        <h3 id="tdh-admission-calc-title" className="tdh-inline-modal-title">
          Tự tính điểm xét tuyển
        </h3>
        <TruongAdmissionCalc
          orgId={orgId}
          selectedYear={selectedYear}
          nganhOptions={nganhOptions}
          phuongThucOptions={phuongThucOptions}
          showCard={false}
        />
      </TruongInlineModal>
    </>
  );
}

type SlotProps = {
  orgId: string;
  programs?: TruongNganhProgram[];
  tuyenSinh?: TruongTuyenSinhNamRow[];
};

/** Nút + modal tính điểm — dùng chung tab Tuyển sinh & Ngành đào tạo. */
export function TruongAdmissionCalcLauncherSlot({
  orgId,
  programs: programsProp,
  tuyenSinh: tuyenProp,
}: SlotProps) {
  const ctx = useTruongInlineEdit();
  const { year } = useYearFilter();
  const programs =
    programsProp ?? ctx?.programs ?? ctx?.school?.programs ?? [];
  const tuyenSinh = tuyenProp ?? ctx?.tuyenSinh ?? [];

  const yearRows = useMemo(
    () => tuyenSinh.filter((r) => r.nam === year),
    [tuyenSinh, year],
  );

  const calcOptions = useMemo(
    () =>
      programs.map((p) => {
        const row = yearRows.find((r) => r.truongNganhId === p.id);
        const threshold = row?.diem_chuan ?? 0;
        return {
          label: p.nganhTitle,
          id: p.id,
          threshold,
        };
      }),
    [programs, yearRows],
  );

  const phuongThucForCalc = useMemo(
    () => aggregatePhuongThucForCalc(yearRows),
    [yearRows],
  );

  return (
    <TruongAdmissionCalcLauncher
      orgId={orgId}
      selectedYear={year}
      nganhOptions={calcOptions}
      phuongThucOptions={phuongThucForCalc}
    />
  );
}
