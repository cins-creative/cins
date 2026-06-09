"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import type { NganhCandidate } from "@/lib/truong/nganh-program-crud";
import { readTruongInlineError, truongInlineFetch } from "@/lib/truong/inline-api";
import type { TruongNganhProgram } from "@/lib/truong/types";

type Props = {
  onAdded: (program: TruongNganhProgram) => void;
};

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`tdh-nganh-add-chevron${open ? " is-open" : ""}`}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function TruongNganhManageBar({ onAdded }: Props) {
  const ctx = useTruongInlineEdit();
  const [candidates, setCandidates] = useState<NganhCandidate[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const filteredCandidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((c) => {
      const title = c.title.toLowerCase();
      const ma = c.ma_nganh?.toLowerCase() ?? "";
      return title.includes(q) || ma.includes(q);
    });
  }, [candidates, query]);

  const allFilteredSelected =
    filteredCandidates.length > 0 &&
    filteredCandidates.every((c) => selectedIds.has(c.id));

  if (!ctx?.isEditing) return null;

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const c of filteredCandidates) next.delete(c.id);
      } else {
        for (const c of filteredCandidates) next.add(c.id);
      }
      return next;
    });
  }

  function closePanel() {
    setOpen(false);
    setQuery("");
    setSelectedIds(new Set());
  }

  async function addSelectedNganh() {
    if (!ctx || loading || selectedIds.size === 0) return;
    setLoading(true);
    setError(null);

    const ids = [...selectedIds];
    const added: TruongNganhProgram[] = [];
    const addedNganhIds = new Set<string>();
    let lastError: string | null = null;

    try {
      for (const idNganh of ids) {
        const res = await truongInlineFetch(ctx.orgId, "/nganh", {
          method: "POST",
          body: JSON.stringify({
            idNganh,
            orgSlug: ctx.school.slug,
          }),
        });
        if (!res.ok) {
          lastError = await readTruongInlineError(res);
          continue;
        }
        const json = (await res.json()) as { program?: TruongNganhProgram };
        if (json.program) {
          added.push(json.program);
          addedNganhIds.add(idNganh);
        }
      }

      if (added.length) {
        setCandidates((prev) =>
          prev.filter((c) => !addedNganhIds.has(c.id)),
        );
        for (const program of added) onAdded(program);
        if (added.length === 1) {
          ctx.showToast(`Đã thêm ngành ${added[0]!.nganhTitle}`);
        } else {
          ctx.showToast(`Đã thêm ${added.length} ngành`);
        }
        closePanel();
      }

      if (lastError && !added.length) {
        setError(lastError);
      } else if (lastError && added.length < ids.length) {
        setError(`Một số ngành không thêm được: ${lastError}`);
      }
    } catch {
      setError("Lỗi kết nối khi thêm ngành.");
    } finally {
      setLoading(false);
    }
  }

  const selectedCount = selectedIds.size;
  const emptyCatalog = candidates.length === 0;

  return (
    <div className="tdh-nganh-manage-bar">
      <div className="tdh-nganh-add-dropdown" ref={rootRef}>
        <button
          type="button"
          className="tdh-nganh-add-trigger"
          aria-expanded={open}
          aria-haspopup="dialog"
          disabled={loading}
          onClick={() => {
            if (open) closePanel();
            else setOpen(true);
          }}
        >
          Thêm ngành
          {selectedCount > 0 && !open ? (
            <span className="tdh-nganh-add-trigger-count">{selectedCount}</span>
          ) : null}
          <ChevronIcon open={open} />
        </button>

        {open ? (
          <div
            className="tdh-nganh-add-panel"
            role="dialog"
            aria-label="Chọn ngành để gắn với trường"
          >
            <div className="tdh-nganh-add-panel-head">
              <input
                type="search"
                className="tdh-nganh-add-search"
                placeholder="Tìm tên hoặc mã ngành…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading || emptyCatalog}
              />
            </div>

            {emptyCatalog ? (
              <p className="tdh-nganh-add-empty">
                Không còn ngành trong danh mục để thêm.
              </p>
            ) : filteredCandidates.length === 0 ? (
              <p className="tdh-nganh-add-empty">Không có kết quả phù hợp.</p>
            ) : (
              <div className="tdh-nganh-add-table-wrap">
                <table className="tdh-nganh-add-table">
                  <thead>
                    <tr>
                      <th scope="col" className="tdh-nganh-add-th-check">
                        <input
                          type="checkbox"
                          className="tdh-nganh-add-check"
                          checked={allFilteredSelected}
                          onChange={toggleAllFiltered}
                          disabled={loading}
                          aria-label="Chọn tất cả trong danh sách lọc"
                        />
                      </th>
                      <th scope="col">Tên ngành</th>
                      <th scope="col">Mã ngành</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCandidates.map((c) => {
                      const checked = selectedIds.has(c.id);
                      return (
                        <tr
                          key={c.id}
                          className={checked ? "is-selected" : undefined}
                        >
                          <td className="tdh-nganh-add-td-check">
                            <input
                              type="checkbox"
                              className="tdh-nganh-add-check"
                              checked={checked}
                              disabled={loading}
                              onChange={() => toggleSelected(c.id)}
                              aria-label={`Chọn ${c.title}`}
                            />
                          </td>
                          <td className="tdh-nganh-add-td-title">{c.title}</td>
                          <td className="tdh-nganh-add-td-ma mono">
                            {c.ma_nganh ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="tdh-nganh-add-panel-actions">
              <button
                type="button"
                className="tdh-inline-btn ghost tdh-nganh-add-cancel"
                disabled={loading}
                onClick={closePanel}
              >
                Hủy
              </button>
              <button
                type="button"
                className="tdh-inline-btn primary tdh-nganh-add-confirm"
                disabled={loading || selectedCount === 0}
                onClick={() => void addSelectedNganh()}
              >
                {loading
                  ? "Đang thêm…"
                  : selectedCount > 0
                    ? `Thêm ${selectedCount} ngành`
                    : "Thêm ngành"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
      {error ? <p className="tdh-nganh-manage-error">{error}</p> : null}
    </div>
  );
}
