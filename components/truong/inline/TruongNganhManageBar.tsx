"use client";

import { useEffect, useState } from "react";

import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import type { NganhCandidate } from "@/lib/truong/nganh-program-crud";
import { readTruongInlineError, truongInlineFetch } from "@/lib/truong/inline-api";
import type { TruongNganhProgram } from "@/lib/truong/types";

type Props = {
  onAdded: (program: TruongNganhProgram) => void;
};

export function TruongNganhManageBar({ onAdded }: Props) {
  const ctx = useTruongInlineEdit();
  const [candidates, setCandidates] = useState<NganhCandidate[]>([]);
  const [pickId, setPickId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ctx?.isEditing) return;
    let cancelled = false;
    setError(null);
    void truongInlineFetch(ctx.orgId, "/nganh")
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setCandidates([]);
          setError(await readTruongInlineError(res));
          return;
        }
        const json = (await res.json()) as { items?: NganhCandidate[] };
        setCandidates(json.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Không tải danh sách ngành.");
      });
    return () => {
      cancelled = true;
    };
  }, [ctx?.isEditing, ctx?.orgId]);

  if (!ctx?.isEditing) return null;

  async function addNganh() {
    if (!ctx || !pickId || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await truongInlineFetch(ctx.orgId, "/nganh", {
        method: "POST",
        body: JSON.stringify({
          idNganh: pickId,
          orgSlug: ctx.school.slug,
        }),
      });
      if (!res.ok) {
        setError(await readTruongInlineError(res));
        return;
      }
      const json = (await res.json()) as { program?: TruongNganhProgram };
      if (!json.program) {
        setError("Không nhận được dữ liệu ngành mới.");
        return;
      }
      onAdded(json.program);
      setCandidates((prev) => prev.filter((c) => c.id !== pickId));
      setPickId("");
      ctx.showToast(`Đã thêm ngành ${json.program.nganhTitle}`);
    } catch {
      setError("Lỗi kết nối khi thêm ngành.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="tdh-nganh-manage-bar">
      <label className="tdh-nganh-manage-label" htmlFor="tdh-nganh-add-select">
        Thêm ngành
      </label>
      <select
        id="tdh-nganh-add-select"
        className="tdh-nganh-add-select"
        value={pickId}
        disabled={loading || candidates.length === 0}
        onChange={(e) => {
          const id = e.target.value;
          setPickId(id);
          if (id) void addNganh();
        }}
        aria-label="Chọn ngành để gắn với trường"
      >
        <option value="">
          {candidates.length === 0
            ? "— Không còn ngành trong danh mục —"
            : "— Chọn ngành —"}
        </option>
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
            {c.ma_nganh ? ` (${c.ma_nganh})` : ""}
          </option>
        ))}
      </select>
      {error ? <p className="tdh-nganh-manage-error">{error}</p> : null}
    </div>
  );
}
