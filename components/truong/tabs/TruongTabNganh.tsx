"use client";

import { useMemo, useState } from "react";

import { TruongAdmissionCalcLauncherSlot } from "@/components/truong/TruongAdmissionCalcLauncher";
import { TruongAddYearDataButton } from "@/components/truong/inline/TruongAddYearDataButton";
import { TruongNganhManageBar } from "@/components/truong/inline/TruongNganhManageBar";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { TruongNganhProgramItem } from "@/components/truong/TruongNganhProgramItem";
import { TruongYearSelect, useYearFilter } from "@/components/truong/YearFilterProvider";
import { cauHinhMonThiCacheKey } from "@/lib/truong/cau-hinh-tinh-diem";
import type { TruongDetail } from "@/lib/truong/types";

type Props = {
  school: TruongDetail;
};

export function TruongTabNganh({ school }: Props) {
  const { year } = useYearFilter();
  const inline = useTruongInlineEdit();
  const programs = inline?.programs ?? school.programs;
  const tuyenSinh = inline?.tuyenSinh ?? [];
  const cauHinhCache = inline?.cauHinhMonThiByKey ?? {};
  const sortedPrograms = useMemo(
    () =>
      [...programs].sort((a, b) =>
        b.nganhTitle.localeCompare(a.nganhTitle, "vi"),
      ),
    [programs],
  );
  const [openNganh, setOpenNganh] = useState<string | null>(
    sortedPrograms[0]?.nganhSlug ?? null,
  );

  function handleProgramAdded(prog: (typeof sortedPrograms)[0]) {
    if (!inline) return;
    inline.setPrograms((prev) =>
      [...prev, prog].sort((a, b) =>
        a.nganhTitle.localeCompare(b.nganhTitle, "vi"),
      ),
    );
    setOpenNganh(prog.nganhSlug);
  }

  function handleProgramRemoved(programId: string) {
    if (!inline) return;
    inline.setPrograms((prev) => {
      const removedSlug = prev.find((p) => p.id === programId)?.nganhSlug;
      const next = prev.filter((p) => p.id !== programId);
      setOpenNganh((open) =>
        open === removedSlug ? (next[0]?.nganhSlug ?? null) : open,
      );
      return next;
    });
    inline.setTuyenSinh((rows) =>
      rows.filter((r) => r.truongNganhId !== programId),
    );
  }

  return (
    <>
      <div className="tdh-v6-filter-row">
        <TruongYearSelect label="Năm điểm chuẩn" />
        <TruongAddYearDataButton />
        <TruongNganhManageBar onAdded={handleProgramAdded} />
      </div>
      <div className="nganh-stream nganh-accord">
        {sortedPrograms.length > 0 ? (
          sortedPrograms.map((prog) => (
            <TruongNganhProgramItem
              key={prog.id}
              prog={prog}
              year={year}
              orgId={school.id}
              cauHinhMonThi={
                cauHinhCache[cauHinhMonThiCacheKey(prog.id, year)] ?? null
              }
              open={openNganh === prog.nganhSlug}
              onToggle={() =>
                setOpenNganh(
                  openNganh === prog.nganhSlug ? null : prog.nganhSlug,
                )
              }
              onRemoved={() => handleProgramRemoved(prog.id)}
            />
          ))
        ) : (
          <p className="tdh-placeholder">
            Chưa có chương trình đang tuyển được gắn với trường này trên CINs.
          </p>
        )}
      </div>
      <TruongAdmissionCalcLauncherSlot
        orgId={school.id}
        programs={programs}
        tuyenSinh={tuyenSinh}
      />
    </>
  );
}
