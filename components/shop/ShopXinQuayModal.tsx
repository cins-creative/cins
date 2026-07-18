"use client";

import { Loader2, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

type SuKienOpt = { id: string; ten: string; orgTen?: string };

type Props = {
  open: boolean;
  milestoneId: string;
  onClose: () => void;
};

export function ShopXinQuayModal({ open, milestoneId, onClose }: Props) {
  const titleId = useId();
  const [events, setEvents] = useState<SuKienOpt[]>([]);
  const [suKienId, setSuKienId] = useState("");
  const [evidence, setEvidence] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOk(false);
    setErr(null);
    setLoading(true);
    void (async () => {
      try {
        // Listing upcoming events — reuse public su-kien page API if present; fallback empty
        const res = await fetch("/api/su-kien/list?limit=40", {
          cache: "no-store",
        }).catch(() => null);
        if (res?.ok) {
          const json = (await res.json()) as {
            items?: Array<{ id: string; ten: string; orgTen?: string }>;
          };
          setEvents(json.items ?? []);
          if (json.items?.[0]) setSuKienId(json.items[0].id);
        } else {
          setEvents([]);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  if (!open) return null;

  async function submit() {
    if (!suKienId) {
      setErr("Chọn sự kiện hoặc dán ID sự kiện.");
      return;
    }
    if (!evidence.trim()) {
      setErr("Nhập bằng chứng (mã quầy / số vé…).");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/su-kien/${suKienId}/quay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cotMocId: milestoneId,
          bangChung: [
            {
              label: "Bằng chứng quầy",
              kind: "text",
              detail: evidence.trim(),
            },
          ],
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không gửi được.");
        return;
      }
      setOk(true);
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="uas-backdrop" role="presentation" onClick={onClose}>
      <div
        className="uas-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 480 }}
      >
        <header className="uas-head">
          <h2 id={titleId} className="uas-title">
            Xin làm quầy sự kiện
          </h2>
          <button type="button" className="uas-close" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div style={{ padding: 16 }}>
          {ok ? (
            <p>Đã gửi yêu cầu. Chờ ban tổ chức duyệt.</p>
          ) : loading ? (
            <p>
              <Loader2 className="shop-spin" size={16} /> Đang tải…
            </p>
          ) : (
            <>
              {err ? (
                <p style={{ color: "#b42318", fontSize: 13 }}>{err}</p>
              ) : null}
              {events.length > 0 ? (
                <label className="shop-dash-field">
                  Sự kiện
                  <select
                    value={suKienId}
                    onChange={(e) => setSuKienId(e.target.value)}
                  >
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.ten}
                        {ev.orgTen ? ` — ${ev.orgTen}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="shop-dash-field">
                  ID sự kiện
                  <input
                    value={suKienId}
                    onChange={(e) => setSuKienId(e.target.value)}
                    placeholder="UUID org_su_kien"
                  />
                </label>
              )}
              <label className="shop-dash-field">
                Bằng chứng (mã quầy / vé mời…)
                <textarea
                  rows={3}
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                />
              </label>
            </>
          )}
        </div>
        {!ok ? (
          <footer
            style={{
              padding: 12,
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              className="shop-kiosk-submit"
              style={{ width: "auto" }}
              disabled={saving}
              onClick={() => void submit()}
            >
              {saving ? <Loader2 className="shop-spin" size={16} /> : "Gửi duyệt"}
            </button>
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
