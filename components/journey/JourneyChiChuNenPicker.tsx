"use client";

import { useEffect, useRef, useState } from "react";

import { updateChiChuNen } from "@/app/[slug]/journey/actions";
import {
  CHI_CHU_NEN_IDS,
  CHI_CHU_NEN_LABELS,
  type ChiChuNenId,
} from "@/lib/journey/plain-text-bg";

type Props = {
  tacPhamId: string;
  nen: ChiChuNenId;
  onNenChange: (nen: ChiChuNenId) => void;
};

/** Debounce lưu server — UI đổi màu ngay, persist chạy nền (latest-wins). */
const SAVE_DEBOUNCE_MS = 220;

export function JourneyChiChuNenPicker({
  tacPhamId,
  nen,
  onNenChange,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  /** Màu đã lưu thành công gần nhất — dùng revert khi save fail. */
  const committedRef = useRef<ChiChuNenId>(nen);
  const saveGenRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tacPhamIdRef = useRef(tacPhamId);
  tacPhamIdRef.current = tacPhamId;

  useEffect(() => {
    committedRef.current = nen;
  }, [tacPhamId]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      saveGenRef.current += 1;
    };
  }, []);

  function pick(nextNen: ChiChuNenId) {
    if (nextNen === nen) return;
    setError(null);
    /* UI ngay — không chờ server / không khóa nút. */
    onNenChange(nextNen);

    if (timerRef.current) clearTimeout(timerRef.current);
    const gen = ++saveGenRef.current;
    const toSave = nextNen;

    timerRef.current = setTimeout(() => {
      void (async () => {
        const result = await updateChiChuNen(tacPhamIdRef.current, toSave);
        if (gen !== saveGenRef.current) return;
        if (!result.ok) {
          setError(result.error);
          onNenChange(committedRef.current);
          return;
        }
        committedRef.current = toSave;
      })();
    }, SAVE_DEBOUNCE_MS);
  }

  return (
    <div
      className="jcard-chi-chu-nen-wrap"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div
        className="jcard-chi-chu-nen-picker"
        role="group"
        aria-label="Chọn màu nền bài chỉ chữ"
      >
        {CHI_CHU_NEN_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={
              "jcard-chi-chu-nen-btn jcard-chi-chu-nen-btn--" +
              id +
              (nen === id ? " is-active" : "")
            }
            aria-label={CHI_CHU_NEN_LABELS[id]}
            aria-pressed={nen === id}
            onClick={() => pick(id)}
          />
        ))}
      </div>
      {error ? (
        <p className="jcard-chi-chu-nen-err" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
