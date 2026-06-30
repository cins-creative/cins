"use client";

import { useState } from "react";

type Props = {
  jobId: string;
  onDone: () => void;
};

export function StudioJobApplyForm({ jobId, onDone }: Props) {
  const [thuNgo, setThuNgo] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch(
        `/api/studio/tuyen-dung/${encodeURIComponent(jobId)}/ung-tuyen`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ thuNgo: thuNgo.trim() || null }),
        },
      );
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setError(json?.error ?? "Không gửi được hồ sơ.");
        return;
      }
      setDone(true);
      setTimeout(onDone, 1400);
    } catch {
      setError("Lỗi mạng — thử lại sau.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="studio-apply-form studio-apply-form--done">
        Đã gửi hồ sơ ứng tuyển. Tổ chức sẽ liên hệ nếu phù hợp.
      </div>
    );
  }

  return (
    <div className="studio-apply-form">
      <label className="studio-apply-label" htmlFor={`apply-${jobId}`}>
        Thư ngỏ (không bắt buộc)
      </label>
      <textarea
        id={`apply-${jobId}`}
        className="studio-apply-textarea"
        rows={3}
        value={thuNgo}
        maxLength={2000}
        placeholder="Giới thiệu ngắn về bạn, link portfolio…"
        onChange={(e) => setThuNgo(e.target.value)}
        disabled={pending}
      />
      {error ? <p className="studio-apply-error">{error}</p> : null}
      <div className="studio-apply-actions">
        <button
          type="button"
          className="studio-apply-cancel"
          onClick={onDone}
          disabled={pending}
        >
          Hủy
        </button>
        <button
          type="button"
          className="studio-apply-submit"
          onClick={submit}
          disabled={pending}
        >
          {pending ? "Đang gửi…" : "Gửi hồ sơ"}
        </button>
      </div>
    </div>
  );
}
