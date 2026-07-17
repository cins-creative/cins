"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";

import { CoAuthorPositionPicker } from "@/components/journey/CoAuthorPositionPicker";
import { loadCoAuthorNgheRoleOptions } from "@/lib/editor/coauthor-role-action";
import type { CoAuthorNgheRoleOption } from "@/lib/editor/coauthor-role-types";
import { parseVaiTroPositions } from "@/lib/social/vai-tro";

type Props = {
  tacPhamId: string;
  userId: string;
  role?: string | null;
  onSaved: (positions: string[]) => void;
};

/** Nút và picker để tác giả tự sửa vị trí của mình trên một tác phẩm. */
export function JourneyOwnCoAuthorRoleEditor({
  tacPhamId,
  userId,
  role,
  onSaved,
}: Props) {
  const [open, setOpen] = useState(false);
  const [positions, setPositions] = useState<string[]>(() =>
    parseVaiTroPositions(role),
  );
  const [options, setOptions] = useState<CoAuthorNgheRoleOption[]>([]);
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showEditor = () => {
    setPositions(parseVaiTroPositions(role));
    setError(null);
    setOpen(true);
    if (optionsLoaded) return;
    setOptionsLoaded(true);
    void loadCoAuthorNgheRoleOptions()
      .then(setOptions)
      .catch(() => setOptions([]));
  };

  const save = async () => {
    if (saving || positions.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/tac-pham/${encodeURIComponent(tacPhamId)}/tac-gia/${encodeURIComponent(userId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_role",
            vai_tro: positions,
          }),
        },
      );
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setError(json?.error ?? "Không lưu được vai trò.");
        return;
      }
      onSaved(positions);
      setOpen(false);
    } catch {
      setError("Không kết nối được. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`author-row-role-edit${open ? " is-open" : ""}`}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {!open ? (
        <button
          type="button"
          className="author-row-role-edit-trigger"
          aria-label="Sửa vai trò của bạn"
          title="Sửa vai trò của bạn"
          onClick={showEditor}
        >
          <Pencil size={14} strokeWidth={2} aria-hidden />
        </button>
      ) : (
        <div className="author-row-role-edit-panel">
          <p>Vai trò của bạn trong dự án (tối đa 2)</p>
          <CoAuthorPositionPicker
            value={positions}
            onChange={setPositions}
            options={options}
          />
          <div className="author-row-role-edit-actions">
            <button
              type="button"
              className="is-save"
              disabled={saving || positions.length === 0}
              onClick={() => void save()}
            >
              {saving ? "Đang lưu…" : "Lưu"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
            >
              Huỷ
            </button>
          </div>
          {error ? (
            <p className="author-row-role-edit-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
