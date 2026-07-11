"use client";

import { Loader2, Shield, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";

import {
  adminGrantCuratorQuyen,
  adminRevokeCuratorQuyen,
} from "@/app/admin/bai-viet/dong-gop-actions";
import type {
  AdminCuratorQuyenRow,
  PhamViThamDinh,
} from "@/lib/article/dong-gop/types";
import { PHAM_VI_THAM_DINH_LABEL } from "@/lib/article/dong-gop/types";

type Props = {
  rows: AdminCuratorQuyenRow[];
  linhVucOptions: { id: string; ten: string }[];
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function scopeLabel(row: AdminCuratorQuyenRow): string {
  if (row.phamVi === "toan_cuc") return "Mọi entity";
  if (row.phamVi === "linh_vuc" && row.linhVuc) {
    return `Lĩnh vực: ${row.linhVuc.ten}`;
  }
  if (row.phamVi === "bai_viet" && row.baiViet) {
    return `Entity: ${row.baiViet.tieuDe} (${row.baiViet.slug})`;
  }
  return PHAM_VI_THAM_DINH_LABEL[row.phamVi];
}

export function AdminDongGopCuratorPanel({ rows, linhVucOptions }: Props) {
  const [list, setList] = useState(rows);
  const [userSlug, setUserSlug] = useState("");
  const [phamVi, setPhamVi] = useState<PhamViThamDinh>("toan_cuc");
  const [idLinhVuc, setIdLinhVuc] = useState("");
  const [articleSlug, setArticleSlug] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function revoke(id: string) {
    if (!window.confirm("Gỡ quyền curator này?")) return;
    setMsg(null);
    setPendingId(id);
    startTransition(async () => {
      const res = await adminRevokeCuratorQuyen({ id });
      setPendingId(null);
      if (!res.ok) {
        setMsg(res.message);
        return;
      }
      setList((prev) => prev.filter((r) => r.id !== id));
    });
  }

  function grant() {
    const slug = userSlug.trim();
    if (!slug) {
      setMsg("Cần nhập slug user.");
      return;
    }
    setMsg(null);
    setPendingId("__grant__");
    startTransition(async () => {
      const res = await adminGrantCuratorQuyen({
        userSlug: slug,
        phamVi,
        idLinhVuc: phamVi === "linh_vuc" ? idLinhVuc : null,
        articleSlug: phamVi === "bai_viet" ? articleSlug : null,
      });
      setPendingId(null);
      if (!res.ok) {
        setMsg(res.message);
        return;
      }
      window.location.reload();
    });
  }

  return (
    <section className="dgop-curator-section">
      <header className="dgop-curator-header">
        <Shield size={20} aria-hidden />
        <div>
          <h2 className="dgop-curator-title">Phân quyền curator</h2>
          <p className="dgop-curator-sub">
            Gán user được thẩm định bản đóng góp — toàn cục, theo lĩnh vực, hoặc
            theo một entity cụ thể.
          </p>
        </div>
      </header>

      {msg ? <p className="dgop-admin-msg">{msg}</p> : null}

      <div className="dgop-curator-form">
        <div className="dgop-curator-form-row">
          <label className="dgop-field">
            <span>Slug user</span>
            <input
              type="text"
              value={userSlug}
              onChange={(e) => setUserSlug(e.target.value)}
              placeholder="vd: nguyen-van-a"
            />
          </label>
          <label className="dgop-field">
            <span>Phạm vi</span>
            <select
              value={phamVi}
              onChange={(e) => setPhamVi(e.target.value as PhamViThamDinh)}
            >
              {(Object.keys(PHAM_VI_THAM_DINH_LABEL) as PhamViThamDinh[]).map(
                (k) => (
                  <option key={k} value={k}>
                    {PHAM_VI_THAM_DINH_LABEL[k]}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>

        {phamVi === "linh_vuc" ? (
          <label className="dgop-field">
            <span>Lĩnh vực</span>
            <select
              value={idLinhVuc}
              onChange={(e) => setIdLinhVuc(e.target.value)}
            >
              <option value="">— Chọn lĩnh vực —</option>
              {linhVucOptions.map((lv) => (
                <option key={lv.id} value={lv.id}>
                  {lv.ten}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {phamVi === "bai_viet" ? (
          <label className="dgop-field">
            <span>Slug entity</span>
            <input
              type="text"
              value={articleSlug}
              onChange={(e) => setArticleSlug(e.target.value)}
              placeholder="vd: game-design-document"
            />
          </label>
        ) : null}

        <button
          type="button"
          className="admin-btn primary"
          disabled={pendingId === "__grant__"}
          onClick={grant}
        >
          {pendingId === "__grant__" ? (
            <Loader2 size={16} className="spin" aria-hidden />
          ) : (
            <UserPlus size={16} aria-hidden />
          )}
          Gán quyền curator
        </button>
      </div>

      {list.length === 0 ? (
        <p className="dgop-curator-empty">Chưa có curator scoped nào.</p>
      ) : (
        <ul className="dgop-curator-list">
          {list.map((row) => (
            <li key={row.id} className="dgop-curator-item">
              <div className="dgop-curator-item-main">
                <strong>
                  {row.nguoiDung.tenHienThi?.trim() || row.nguoiDung.slug}
                </strong>
                <span className="dgop-curator-scope">{scopeLabel(row)}</span>
                <span className="dgop-curator-date">{fmtDate(row.taoLuc)}</span>
              </div>
              <button
                type="button"
                className="admin-btn ghost danger"
                disabled={pendingId === row.id}
                onClick={() => revoke(row.id)}
              >
                Gỡ quyền
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
