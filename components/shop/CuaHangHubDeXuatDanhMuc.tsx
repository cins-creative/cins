"use client";

import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { ShopNhom } from "@/lib/shop/types";
import { useShopReadyGate } from "@/lib/shop/use-shop-ready-gate";

type DanhMucOpt = {
  id: string;
  slug: string;
  ten: string;
  idCha?: string | null;
  id_cha?: string | null;
};

function idChaOf(d: DanhMucOpt): string | null {
  const v = d.idCha ?? d.id_cha;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

type Props = {
  searchQuery: string;
};

export function CuaHangHubDeXuatDanhMuc({ searchQuery }: Props) {
  const { enabled: canDeXuat, loading: gateLoading } = useShopReadyGate();
  const [open, setOpen] = useState(false);
  const [auth, setAuth] = useState<"loading" | "guest" | "seller" | "empty">(
    "loading",
  );
  const [nhoms, setNhoms] = useState<ShopNhom[]>([]);
  const [danhMuc, setDanhMuc] = useState<DanhMucOpt[]>([]);
  const [tuKhoa, setTuKhoa] = useState("");
  const [chaId, setChaId] = useState("");
  const [ganNhatId, setGanNhatId] = useState("");
  const [nhomId, setNhomId] = useState("");
  const [moTa, setMoTa] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTuKhoa(searchQuery.trim().slice(0, 80));
  }, [open, searchQuery]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setAuth("loading");
    setErr(null);
    void (async () => {
      try {
        const [nhomRes, dmRes] = await Promise.all([
          fetch("/api/shop/nhom?truc=1", { cache: "no-store" }),
          fetch("/api/shop/danh-muc", { cache: "no-store" }),
        ]);
        if (cancelled) return;
        if (nhomRes.status === 401) {
          setAuth("guest");
          return;
        }
        const nhomJson = (await nhomRes.json().catch(() => null)) as {
          items?: ShopNhom[];
        } | null;
        const dmJson = (await dmRes.json().catch(() => null)) as {
          danhMuc?: DanhMucOpt[];
        } | null;
        const items = nhomRes.ok ? (nhomJson?.items ?? []) : [];
        setNhoms(items);
        setDanhMuc(
          dmRes.ok
            ? (dmJson?.danhMuc ?? []).map((d) => ({
                ...d,
                idCha: idChaOf(d),
              }))
            : [],
        );
        setAuth(items.length > 0 ? "seller" : "empty");
        const pending = items.filter(
          (n) => !n.danhMucXacNhan || n.danhMucSlug === "khac",
        );
        setNhomId((pending[0] ?? items[0])?.id ?? "");
      } catch {
        if (!cancelled) setAuth("guest");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const parentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const d of danhMuc) {
      const cha = idChaOf(d);
      if (cha) ids.add(cha);
    }
    return ids;
  }, [danhMuc]);

  const parents = useMemo(
    () => danhMuc.filter((d) => parentIds.has(d.id)),
    [danhMuc, parentIds],
  );

  const leaves = useMemo(
    () =>
      danhMuc.filter(
        (d) => !parentIds.has(d.id) && d.slug !== "khac",
      ),
    [danhMuc, parentIds],
  );

  const leafOpts = chaId
    ? leaves.filter((d) => idChaOf(d) === chaId)
    : leaves;

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/shop/danh-muc/yeu-cau", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idNhom: nhomId,
          moTa,
          tuKhoa: tuKhoa.trim() || undefined,
          idDanhMucGanNhat: ganNhatId || chaId || null,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không gửi được yêu cầu.");
        return;
      }
      setDone(true);
    } catch {
      setErr("Không gửi được yêu cầu.");
    } finally {
      setBusy(false);
    }
  }

  if (gateLoading || !canDeXuat) return null;

  if (!open) {
    return (
      <button
        type="button"
        className="ch-list-filter-dexuat-open"
        onClick={() => {
          setDone(false);
          setOpen(true);
        }}
      >
        <Plus size={14} strokeWidth={2.4} aria-hidden />
        Đề xuất danh mục mới
      </button>
    );
  }

  if (done) {
    return (
      <div className="ch-list-filter-dexuat">
        <p className="ch-list-filter-dexuat-ok">
          Đã gửi. Hàng vẫn bán, chưa lên bộ lọc — admin sẽ duyệt hoặc gộp vào
          lá có sẵn.
        </p>
        <button
          type="button"
          className="ch-list-filter-dexuat-open"
          onClick={() => setOpen(false)}
        >
          Đóng
        </button>
      </div>
    );
  }

  return (
    <div className="ch-list-filter-dexuat">
      <p className="ch-list-filter-dexuat-lead">
        Seller không tự tạo chip. Gửi đề xuất — chọn cấp cha để admin duyệt
        hoặc gộp vào lá khác.
      </p>
      {auth === "loading" ? (
        <p className="ch-list-filter-dexuat-hint">Đang tải…</p>
      ) : auth === "guest" ? (
        <p className="ch-list-filter-dexuat-hint">
          <a href={`/login?next=${encodeURIComponent("/cua-hang/hang")}`}>
            Đăng nhập
          </a>{" "}
          bằng tài khoản bán hàng, rồi chọn loại hàng của bạn.
        </p>
      ) : auth === "empty" ? (
        <p className="ch-list-filter-dexuat-hint">
          Chưa có loại hàng. Tạo loại trong{" "}
          <a href="/ban-hang/kho">Kho</a> rồi đề xuất từ đây hoặc từ phân loại
          loại hàng.
        </p>
      ) : (
        <>
          <label className="ch-list-filter-dexuat-field">
            Tên danh mục
            <input
              type="text"
              value={tuKhoa}
              maxLength={80}
              disabled={busy}
              placeholder="vd. Ốp điện thoại"
              onChange={(e) => setTuKhoa(e.target.value)}
            />
          </label>
          <label className="ch-list-filter-dexuat-field">
            Loại hàng của bạn
            <select
              value={nhomId}
              disabled={busy}
              onChange={(e) => setNhomId(e.target.value)}
            >
              {nhoms.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nhan}
                  {n.danhMucSlug === "khac" ? " · đang Khác" : ""}
                </option>
              ))}
            </select>
          </label>
          {parents.length > 0 ? (
            <label className="ch-list-filter-dexuat-field">
              Cấp cha (gợi ý admin)
              <select
                value={chaId}
                disabled={busy}
                onChange={(e) => {
                  const next = e.target.value;
                  setChaId(next);
                  setGanNhatId((prev) =>
                    leaves.some((d) => d.id === prev && idChaOf(d) === next)
                      ? prev
                      : "",
                  );
                }}
              >
                <option value="">— Không nhóm / chưa rõ —</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.ten}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {leafOpts.length > 0 ? (
            <label className="ch-list-filter-dexuat-field">
              Gần giống lá nào
              <select
                value={ganNhatId}
                disabled={busy}
                onChange={(e) => setGanNhatId(e.target.value)}
              >
                <option value="">Không gộp — tạo lá mới</option>
                {leafOpts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.ten}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="ch-list-filter-dexuat-field">
            Mô tả (ít nhất 20 ký tự)
            <textarea
              value={moTa}
              rows={3}
              maxLength={500}
              disabled={busy}
              placeholder="Nó là cái gì / dùng để làm gì? Khác lá gần nhất chỗ nào?"
              onChange={(e) => setMoTa(e.target.value)}
            />
          </label>
          {err ? (
            <p className="ch-list-filter-dexuat-err" role="alert">
              {err}
            </p>
          ) : null}
          <div className="ch-list-filter-dexuat-actions">
            <button
              type="button"
              className="ch-list-filter-dexuat-cancel"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Hủy
            </button>
            <button
              type="button"
              className="ch-list-filter-foot-btn is-primary"
              disabled={busy || !nhomId || moTa.trim().length < 20}
              onClick={() => void submit()}
            >
              {busy ? "Đang gửi…" : "Gửi đề xuất"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
