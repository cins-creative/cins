"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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

export function JourneyChiChuNenPicker({
  tacPhamId,
  nen,
  onNenChange,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function pick(nextNen: ChiChuNenId) {
    if (pending || nextNen === nen) return;
    const previousNen = nen;
    setError(null);
    onNenChange(nextNen);
    startTransition(async () => {
      const result = await updateChiChuNen(tacPhamId, nextNen);
      if (!result.ok) {
        setError(result.error);
        onNenChange(previousNen);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="jcard-chi-chu-nen-wrap">
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
            disabled={pending}
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
