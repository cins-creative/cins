"use client";

import { Check, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { ShopQuaySuKien } from "@/lib/shop/types";

type Props = {
  suKienId: string;
  canManage?: boolean;
};

export function ShopQuaySuKienPanel({ suKienId, canManage = false }: Props) {
  const [items, setItems] = useState<ShopQuaySuKien[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = canManage ? "?pending=1" : "";
      const res = await fetch(`/api/su-kien/${suKienId}/quay${q}`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as {
        items?: ShopQuaySuKien[];
      } | null;
      setItems(json?.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [suKienId, canManage]);

  useEffect(() => {
    void load();
  }, [load]);

  async function respond(id: string, action: "approve" | "reject") {
    setBusyId(id);
    try {
      await fetch(`/api/su-kien/${suKienId}/quay/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const approved = items.filter((i) => i.trangThai === "da_duyet");
  const pending = items.filter((i) => i.trangThai === "cho_xu_ly");

  if (loading) {
    return (
      <p className="shop-dash-hint">
        <Loader2 className="shop-spin" size={14} /> Đang tải quầy…
      </p>
    );
  }

  if (!approved.length && !(canManage && pending.length)) {
    return null;
  }

  return (
    <section className="shop-quay-panel" style={{ marginTop: 16 }}>
      <h3 style={{ fontSize: 15, margin: "0 0 8px" }}>Quầy bán hàng</h3>
      {approved.length ? (
        <ul className="shop-dash-list">
          {approved.map((q) => (
            <li key={q.id} className="shop-dash-item">
              <div>
                <strong>{q.nguoiDungTen ?? "Artist"}</strong>
                {q.nguoiDungSlug ? (
                  <div className="shop-dash-hint">@{q.nguoiDungSlug}</div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="shop-dash-hint">Chưa có quầy được duyệt.</p>
      )}

      {canManage && pending.length > 0 ? (
        <>
          <h4 style={{ fontSize: 14, margin: "14px 0 8px" }}>
            Chờ duyệt ({pending.length})
          </h4>
          <ul className="shop-dash-list">
            {pending.map((q) => (
              <li key={q.id} className="shop-dash-item">
                <div>
                  <strong>{q.nguoiDungTen ?? "Artist"}</strong>
                  <div className="shop-dash-hint">
                    {q.bangChung
                      .map((e) => e.detail || e.label)
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                <div className="shop-dash-actions">
                  <button
                    type="button"
                    disabled={busyId === q.id}
                    onClick={() => void respond(q.id, "approve")}
                    aria-label="Duyệt"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    className="shop-dash-danger"
                    disabled={busyId === q.id}
                    onClick={() => void respond(q.id, "reject")}
                    aria-label="Từ chối"
                  >
                    <X size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
