"use client";

import { useEffect, useId, useState } from "react";

const MAX_TEN = 120;
const MAX_MOTA = 500;

type Props = {
  orgId: string;
  ten: string;
  moTa: string | null;
  onSaved: (next: { ten: string; moTa: string | null }) => void;
};

export function CongDongProfileSection({
  orgId,
  ten,
  moTa,
  onSaved,
}: Props) {
  const formId = useId();
  const [tenValue, setTenValue] = useState(ten);
  const [moTaValue, setMoTaValue] = useState(moTa ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setTenValue(ten);
    setMoTaValue(moTa ?? "");
    setError(null);
    setSavedFlash(false);
  }, [ten, moTa]);

  const dirty =
    tenValue.trim() !== ten.trim() ||
    (moTaValue.trim() || "") !== (moTa?.trim() || "");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || !dirty) return;

    const nextTen = tenValue.trim();
    const nextMoTa = moTaValue.trim();

    if (nextTen.length < 2) {
      setError("Tên cộng đồng phải có ít nhất 2 ký tự.");
      return;
    }

    setPending(true);
    setError(null);
    setSavedFlash(false);

    try {
      const res = await fetch(`/api/cong-dong/${encodeURIComponent(orgId)}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          ten: nextTen,
          moTa: nextMoTa || null,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        ten?: string;
        moTa?: string | null;
        error?: string;
      } | null;
      if (!res.ok || !json?.ten) {
        setError(json?.error ?? "Không lưu được thông tin.");
        return;
      }
      onSaved({ ten: json.ten, moTa: json.moTa ?? null });
      setSavedFlash(true);
    } catch {
      setError("Lỗi mạng — thử lại sau.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="cd-manage-profile"
      onSubmit={onSubmit}
      aria-label="Thông tin cộng đồng"
    >
      {error ? (
        <p className="cd-manage-profile-err" role="alert">
          {error}
        </p>
      ) : null}

      <div className="cd-manage-profile-field">
        <label className="cd-manage-profile-lbl" htmlFor={`${formId}-ten`}>
          Tên cộng đồng
        </label>
        <input
          id={`${formId}-ten`}
          className="cd-manage-profile-inp"
          value={tenValue}
          maxLength={MAX_TEN}
          required
          disabled={pending}
          onChange={(e) => {
            setTenValue(e.target.value);
            setSavedFlash(false);
          }}
          placeholder="VD: Motion Designer Việt Nam"
          autoComplete="off"
        />
        <p className="cd-manage-profile-hint">
          {tenValue.trim().length}/{MAX_TEN} — đường dẫn (/cong-dong/…) không đổi khi
          đổi tên.
        </p>
      </div>

      <div className="cd-manage-profile-field">
        <label className="cd-manage-profile-lbl" htmlFor={`${formId}-mo-ta`}>
          Mô tả
        </label>
        <textarea
          id={`${formId}-mo-ta`}
          className="cd-manage-profile-txt"
          value={moTaValue}
          maxLength={MAX_MOTA}
          rows={4}
          disabled={pending}
          onChange={(e) => {
            setMoTaValue(e.target.value);
            setSavedFlash(false);
          }}
          placeholder="Cộng đồng này dành cho ai? Chia sẻ gì?"
        />
        <p className="cd-manage-profile-hint">
          {moTaValue.trim().length}/{MAX_MOTA}
        </p>
      </div>

      <div className="cd-manage-profile-foot">
        {savedFlash && !dirty ? (
          <span className="cd-manage-profile-ok" role="status">
            Đã lưu
          </span>
        ) : (
          <span className="cd-manage-profile-foot-spacer" aria-hidden />
        )}
        <button
          type="submit"
          className="cd-v4-btn"
          disabled={pending || !dirty}
        >
          {pending ? "Đang lưu…" : "Lưu thay đổi"}
        </button>
      </div>
    </form>
  );
}
