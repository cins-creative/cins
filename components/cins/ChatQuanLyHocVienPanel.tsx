"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { LOAI_BAI_GIAO_TRINH_LABEL } from "@/lib/to-chuc/khoa-hoc-types";
import type { LoaiBaiGiaoTrinh } from "@/lib/to-chuc/khoa-hoc-types";

type BaiMeta = {
  id: string;
  ten: string;
  thuTu: number;
  thuocTinh: LoaiBaiGiaoTrinh;
  thumbnailUrl: string | null;
};

type HvRow = {
  hocVienLopId: string;
  userId: string;
  tenHienThi: string;
  baiHienTaiId: string | null;
  baiDaMoIds: string[];
  soChoDuyet: number;
};

type Props = {
  roomId: string;
  canGanTienDo: boolean;
  onlineUserIds?: Set<string>;
};

export function ChatQuanLyHocVienPanel({
  roomId,
  canGanTienDo,
  onlineUserIds,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bai, setBai] = useState<BaiMeta[]>([]);
  const [hocVien, setHocVien] = useState<HvRow[]>([]);
  const [dongBo, setDongBo] = useState(false);
  const [khoaId, setKhoaId] = useState<string | null>(null);
  const [picker, setPicker] = useState<
    { kind: "hv"; hvlId: string; ten: string } | { kind: "lop" } | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/progress`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || "Không tải được.");
        return;
      }
      setBai(Array.isArray(data?.bai) ? data.bai : []);
      setHocVien(Array.isArray(data?.hocVien) ? data.hocVien : []);
      setDongBo(Boolean(data?.dongBoTienDo));
      setKhoaId(typeof data?.khoaId === "string" ? data.khoaId : null);
    } catch {
      setError("Không tải được.");
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    void load();
  }, [load]);

  const baiById = useMemo(() => {
    const m = new Map<string, BaiMeta>();
    for (const b of bai) m.set(b.id, b);
    return m;
  }, [bai]);

  const pickerHvRow = useMemo(
    () =>
      picker?.kind === "hv"
        ? hocVien.find((h) => h.hocVienLopId === picker.hvlId) ?? null
        : null,
    [hocVien, picker],
  );

  const isOnline = useCallback(
    (userId: string) => Boolean(onlineUserIds?.has(userId)),
    [onlineUserIds],
  );

  const hocVienSorted = useMemo(() => {
    return [...hocVien].sort((a, b) => {
      const oa = isOnline(a.userId) ? 0 : 1;
      const ob = isOnline(b.userId) ? 0 : 1;
      if (oa !== ob) return oa - ob;
      return a.tenHienThi.localeCompare(b.tenHienThi, "vi");
    });
  }, [hocVien, isOnline]);

  const soOnline = useMemo(
    () => hocVien.reduce((n, h) => n + (isOnline(h.userId) ? 1 : 0), 0),
    [hocVien, isOnline],
  );

  const progressOf = useCallback(
    (h: HvRow) => {
      const opened = h.baiDaMoIds.length;
      let current: BaiMeta | null = h.baiHienTaiId
        ? baiById.get(h.baiHienTaiId) ?? null
        : null;
      if (!current && opened > 0) {
        current =
          bai
            .filter((b) => h.baiDaMoIds.includes(b.id))
            .sort((a, b) => b.thuTu - a.thuTu)[0] ?? null;
      }
      return { opened, total: bai.length, current };
    },
    [bai, baiById],
  );

  const openedIdsForPicker = useMemo(() => {
    if (!picker) return new Set<string>();
    if (picker.kind === "hv") {
      return new Set(pickerHvRow?.baiDaMoIds ?? []);
    }
    if (hocVien.length === 0) return new Set<string>();
    return new Set(
      bai
        .filter((b) => hocVien.every((h) => h.baiDaMoIds.includes(b.id)))
        .map((b) => b.id),
    );
  }, [picker, pickerHvRow, hocVien, bai]);

  async function toggleDongBo(next: boolean) {
    if (!canGanTienDo || !khoaId) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/progress`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_dong_bo",
          dongBo: next,
          khoaId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMsg(data?.error || "Không đổi được.");
        return;
      }
      setDongBo(next);
      setMsg(next ? "Đã bật đồng bộ cả lớp." : "Đã tắt — mỗi HV một tiến độ.");
    } finally {
      setBusy(false);
    }
  }

  const openBai = useCallback(
    async (baiTapIds: string[], note: string) => {
      if (!canGanTienDo || !picker || baiTapIds.length === 0) return;
      setBusy(true);
      setMsg(null);
      try {
        const res = await fetch(`/api/chat/rooms/${roomId}/progress`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hocVienLopId:
              picker.kind === "lop" || dongBo ? "all" : picker.hvlId,
            baiTapIds,
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setMsg(data?.error || "Không mở được bài.");
          return;
        }
        setMsg(note);
        await load();
      } finally {
        setBusy(false);
      }
    },
    [canGanTienDo, picker, dongBo, roomId, load],
  );

  const moToiBai = useCallback(
    (b: BaiMeta) => {
      if (!picker || openedIdsForPicker.has(b.id)) return;
      const ids = bai.filter((x) => x.thuTu <= b.thuTu).map((x) => x.id);
      // Optimistic: đánh dấu mở ngay để ✓ hiện tức thì
      const toAll = picker.kind === "lop" || dongBo;
      const targetHvl = picker.kind === "hv" ? picker.hvlId : null;
      setHocVien((prev) =>
        prev.map((h) => {
          if (!toAll && h.hocVienLopId !== targetHvl) return h;
          const merged = Array.from(new Set([...h.baiDaMoIds, ...ids]));
          return { ...h, baiDaMoIds: merged, baiHienTaiId: b.id };
        }),
      );
      const label = toAll ? "cả lớp" : "học viên";
      void openBai(ids, `Đã mở tới bài ${b.thuTu} cho ${label}.`);
    },
    [openedIdsForPicker, bai, openBai, picker, dongBo],
  );

  if (loading) {
    return (
      <div className="cins-chat-side-empty" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Loader2 size={16} className="animate-spin" aria-hidden />
        Đang tải…
      </div>
    );
  }

  if (error) {
    return <p className="cins-chat-side-empty">{error}</p>;
  }

  const avatarInitial = (ten: string) =>
    (ten.trim().charAt(0) || "?").toUpperCase();

  // ---- Cấp 2: bảng gán bài cho 1 HV (hoặc cả lớp khi đồng bộ) ----
  if (picker) {
    const targetTen =
      picker.kind === "lop" ? "Cả lớp" : picker.ten || "Học viên";
    const openedCount = openedIdsForPicker.size;
    return (
      <div className="cins-hv-panel">
        <div className="cins-hv-picker-head">
          <button
            type="button"
            className="cins-hv-back"
            onClick={() => {
              setPicker(null);
              setMsg(null);
            }}
          >
            ← Danh sách
          </button>
          <div className="cins-hv-picker-who">
            <span className="cins-hv-avatar" aria-hidden>
              {picker.kind === "lop" ? "L" : avatarInitial(targetTen)}
            </span>
            <div className="cins-hv-picker-who-text">
              <span className="cins-hv-row-name">{targetTen}</span>
              <span className="cins-hv-picker-sub">
                {openedCount}/{bai.length} bài đã mở
              </span>
            </div>
          </div>
        </div>

        {!canGanTienDo ? (
          <p className="cins-hv-readonly">Chế độ xem — không chỉnh tiến độ.</p>
        ) : (
          <p className="cins-hv-hint">
            Chạm một bài để mở tiến độ tới bài đó
            {picker.kind === "lop" || dongBo ? " cho cả lớp" : ""}.
          </p>
        )}

        {bai.length === 0 ? (
          <p className="cins-hv-empty">Khóa chưa có bộ giáo trình.</p>
        ) : (
          <div className="cins-hv-grid">
            {bai.map((b) => {
              const daMo = openedIdsForPicker.has(b.id);
              return (
                <button
                  key={b.id}
                  type="button"
                  className={`cins-hv-card${daMo ? " is-open" : ""}`}
                  disabled={!canGanTienDo || busy || daMo}
                  onClick={() => moToiBai(b)}
                >
                  <span className="cins-hv-card-thumb">
                    {b.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.thumbnailUrl} alt="" />
                    ) : (
                      <span className="cins-hv-card-thumb-ph" aria-hidden>
                        {b.thuTu}
                      </span>
                    )}
                    {daMo ? (
                      <span className="cins-hv-card-check" aria-label="Đã mở">
                        ✓
                      </span>
                    ) : null}
                  </span>
                  <span className="cins-hv-card-num">Bài {b.thuTu}</span>
                  <span className="cins-hv-card-ten">{b.ten}</span>
                  <span className="cins-hv-card-loai">
                    {LOAI_BAI_GIAO_TRINH_LABEL[b.thuocTinh] ?? b.thuocTinh}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {msg ? <p className="cins-hv-msg">{msg}</p> : null}
      </div>
    );
  }

  // ---- Cấp 1: danh sách học viên + tiến độ ----
  return (
    <div className="cins-hv-panel">
      <label
        className={`cins-hv-sync${dongBo ? " is-on" : ""}${
          !canGanTienDo || !khoaId ? " is-disabled" : ""
        }`}
      >
        <span className="cins-hv-sync-text">
          <span className="cins-hv-sync-title">Đồng bộ tiến độ cả lớp</span>
          <span className="cins-hv-sync-hint">
            {dongBo
              ? "Mọi HV cùng buổi; HV mới vào nhận bài hiện tại."
              : "Mỗi học viên một tiến độ riêng."}
          </span>
        </span>
        <span className="cins-hv-switch" aria-hidden>
          <input
            type="checkbox"
            checked={dongBo}
            disabled={!canGanTienDo || busy || !khoaId}
            onChange={(e) => void toggleDongBo(e.target.checked)}
          />
          <span className="cins-hv-switch-track">
            <span className="cins-hv-switch-thumb" />
          </span>
        </span>
      </label>

      {!canGanTienDo ? (
        <p className="cins-hv-readonly">Chế độ xem — không chỉnh tiến độ.</p>
      ) : null}

      {dongBo && bai.length > 0 ? (
        <button
          type="button"
          className="cins-hv-lop-btn"
          onClick={() => {
            setPicker({ kind: "lop" });
            setMsg(null);
          }}
        >
          <span className="cins-hv-avatar" aria-hidden>
            L
          </span>
          <span className="cins-hv-row-main">
            <span className="cins-hv-row-name">Tiến độ cả lớp</span>
            <span className="cins-hv-picker-sub">
              {openedIdsForPicker.size}/{bai.length} bài · chạm để chỉnh
            </span>
          </span>
          <span className="cins-hv-chevron" aria-hidden>
            ›
          </span>
        </button>
      ) : null}

      <div className="cins-hv-section">
        <div className="cins-hv-section-head">
          <span className="cins-hv-section-title">Học viên</span>
          <span className="cins-hv-count">{hocVien.length}</span>
          {soOnline > 0 ? (
            <span className="cins-hv-online-count">
              <span className="cins-hv-online-dot" aria-hidden />
              {soOnline} online
            </span>
          ) : null}
        </div>
        {hocVien.length === 0 ? (
          <p className="cins-hv-empty">Chưa có học viên trong lớp.</p>
        ) : (
          <ul className="cins-hv-list" role="list">
            {hocVienSorted.map((h) => {
              const p = progressOf(h);
              const online = isOnline(h.userId);
              return (
                <li key={h.hocVienLopId}>
                  <button
                    type="button"
                    className="cins-hv-row"
                    onClick={() => {
                      setPicker({
                        kind: "hv",
                        hvlId: h.hocVienLopId,
                        ten: h.tenHienThi,
                      });
                      setMsg(null);
                    }}
                  >
                    <span className="cins-hv-row-main">
                      <span className="cins-hv-row-head">
                        <span
                          className={`cins-hv-avatar${online ? " is-online" : ""}`}
                          aria-hidden
                        >
                          {avatarInitial(h.tenHienThi)}
                        </span>
                        <span className="cins-hv-row-name">{h.tenHienThi}</span>
                        {online ? (
                          <span className="cins-hv-online-badge">Online</span>
                        ) : null}
                      </span>
                      <span className="cins-hv-row-cur">
                        {p.current?.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            className="cins-hv-thumb"
                            src={p.current.thumbnailUrl}
                            alt=""
                          />
                        ) : (
                          <span className="cins-hv-thumb is-empty" aria-hidden>
                            {p.current ? p.current.thuTu : "–"}
                          </span>
                        )}
                        <span className="cins-hv-cur-ten">
                          {p.current
                            ? `Bài ${p.current.thuTu} · ${p.current.ten}`
                            : "Chưa mở bài"}
                        </span>
                      </span>
                      <span className="cins-hv-row-progress">
                        <span className="cins-hv-progress-bar" aria-hidden>
                          <span
                            className="cins-hv-progress-fill"
                            style={{
                              width: `${
                                p.total > 0
                                  ? Math.round((p.opened / p.total) * 100)
                                  : 0
                              }%`,
                            }}
                          />
                        </span>
                        <span className="cins-hv-progress-text">
                          {p.opened}/{p.total}
                        </span>
                      </span>
                    </span>
                    {h.soChoDuyet > 0 ? (
                      <span className="cins-hv-chip is-warn">
                        {h.soChoDuyet}
                      </span>
                    ) : null}
                    <span className="cins-hv-chevron" aria-hidden>
                      ›
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {msg ? <p className="cins-hv-msg">{msg}</p> : null}
    </div>
  );
}
