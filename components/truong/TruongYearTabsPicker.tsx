"use client";

import { useEffect, useState } from "react";

import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { useYearFilter } from "@/components/truong/YearFilterProvider";
import {
  collectTruongYearTabs,
  isValidTruongYear,
  nextSuggestedTruongYear,
} from "@/lib/truong/year-tabs";

type Props = {
  className?: string;
  onYearApplied?: (year: number) => void;
};

export function TruongYearTabsPicker({ className, onYearApplied }: Props) {
  const ctx = useTruongInlineEdit();
  const { year, yearOptions, setYear } = useYearFilter();
  const tuyenSinh = ctx?.tuyenSinh ?? [];

  const [tabYears, setTabYears] = useState<number[]>(() =>
    collectTruongYearTabs(tuyenSinh, yearOptions, year),
  );
  const [showAddYear, setShowAddYear] = useState(false);
  const [newYearDraft, setNewYearDraft] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    setTabYears(collectTruongYearTabs(tuyenSinh, yearOptions, year));
  }, [tuyenSinh, yearOptions, year]);

  function applyYear(next: number) {
    if (!isValidTruongYear(next)) return;
    setYear(next);
    setTabYears((prev) => {
      if (prev.includes(next)) return prev;
      return [...prev, next].sort((a, b) => b - a);
    });
    onYearApplied?.(next);
  }

  function openAddYear() {
    setNewYearDraft(String(nextSuggestedTruongYear(tabYears, yearOptions)));
    setShowAddYear(true);
    setAddError(null);
  }

  function confirmAddYear() {
    const y = Number(newYearDraft.trim());
    if (!isValidTruongYear(y)) {
      setAddError("Năm phải từ 2000 đến 2100.");
      return;
    }
    applyYear(y);
    setShowAddYear(false);
    setAddError(null);
  }

  const rootClass = className
    ? `tdh-year-tabs-picker ${className}`
    : "tdh-year-tabs-picker";

  return (
    <div className={rootClass}>
      <div className="tdh-add-year-tabs" role="tablist" aria-label="Năm tuyển sinh">
        <button
          type="button"
          className="tdh-add-year-tab tdh-add-year-tab--add"
          aria-label="Thêm năm mới"
          aria-expanded={showAddYear}
          onClick={() => (showAddYear ? setShowAddYear(false) : openAddYear())}
        >
          +
        </button>
        {tabYears.map((y) => (
          <button
            key={y}
            type="button"
            role="tab"
            aria-selected={year === y}
            className={`tdh-add-year-tab${year === y ? " is-active" : ""}`}
            onClick={() => applyYear(y)}
          >
            {y}
          </button>
        ))}
      </div>
      {showAddYear ? (
        <div className="tdh-add-year-new">
          <input
            type="number"
            min={2000}
            max={2100}
            value={newYearDraft}
            onChange={(e) => setNewYearDraft(e.target.value)}
            aria-label="Năm mới"
          />
          <button
            type="button"
            className="tdh-inline-btn primary"
            onClick={confirmAddYear}
          >
            Thêm
          </button>
          <button
            type="button"
            className="tdh-inline-btn ghost"
            onClick={() => setShowAddYear(false)}
          >
            Hủy
          </button>
        </div>
      ) : null}
      {addError ? (
        <p className="tdh-year-tabs-picker-error" role="alert">
          {addError}
        </p>
      ) : null}
    </div>
  );
}
