"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AdminTaiKhoanClonePanel } from "@/components/admin/AdminTaiKhoanClonePanel";
import type { AutopilotOverview } from "@/lib/admin/autopilot-types";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const data = (await res.json().catch(() => null)) as T & {
    error?: string;
    ok?: boolean;
  };
  if (!res.ok || (data && "ok" in data && data.ok === false)) {
    throw new Error(
      (data && "error" in data && data.error) || `HTTP ${res.status}`,
    );
  }
  return data;
}

async function postAction(
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetch("/api/admin/autopilot/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as {
    ok?: boolean;
    error?: string;
  } & Record<string, unknown>;
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
  return data;
}

export function AdminTaiKhoanAiScreen() {
  const [overview, setOverview] = useState<AutopilotOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refreshOverview = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
    const ov = await getJson<{ overview: AutopilotOverview }>(
      "/api/admin/autopilot?view=tong-quan",
    );
    setOverview(ov.overview);
      } catch (e) {
      setErr(e instanceof Error ? e.message : "Lỗi tải");
      } finally {
        setLoading(false);
      }
  }, []);

  useEffect(() => {
    void refreshOverview();
  }, [refreshOverview]);

  return (
    <>
      <header className="page-header admin-bai-viet-header">
        <div className="admin-bai-viet-header__copy">
          <h1 className="page-title">Nick seeding</h1>
          <p className="page-subtitle">
            Quản lý nick up tay thủ công · KPI ngày · bàn giao artist.
          </p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={loading || busy}
            onClick={() => void refreshOverview()}
          >
            <RefreshCw size={14} />
            Làm mới
          </button>
        </div>
      </header>

      {(msg || err) && (
        <div
          className={`tkai-flash${err ? " tkai-flash--err" : ""}`}
          role="status"
        >
          {err || msg}
        </div>
      )}

      <div className="page-body tkai-body">
        {loading && !overview ? (
          <p className="admin-panel-loading">
            <Loader2 className="tkai-spin" size={16} /> Đang tải…
          </p>
        ) : (
          <AdminTaiKhoanClonePanel
            busy={busy}
            setBusy={setBusy}
            setMsg={setMsg}
            setErr={setErr}
            postAction={postAction}
            coVault={Boolean(overview?.env.coVaultMatKhau)}
            kpi={overview?.kpi ?? null}
            onKpiUpdated={() => void refreshOverview()}
          />
        )}
      </div>
    </>
  );
}
