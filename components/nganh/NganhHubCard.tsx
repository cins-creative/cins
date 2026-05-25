"use client";

import Link from "next/link";
import { useState } from "react";

import { removeNganhFromNhom } from "@/app/nganh/actions";
import { NganhHubCardThumb } from "@/components/nganh/hub/NganhHubCardThumb";
import {
  useNganhHubEdit,
  useNganhHubRefresh,
} from "@/components/nganh/hub/NganhHubEditContext";
import { NctRemoveIcon } from "@/components/nganh/NctRemoveIcon";
import type { DeptCardTheme } from "@/lib/career/hubRailTheme";
import type { NganhHubItem } from "@/lib/nganh/types";

type Props = {
  item: NganhHubItem;
  href: string;
  deptTheme: DeptCardTheme;
  /** Nhóm section hiện tại — dùng gỡ `article_gan_nhom` khi quản trị. */
  nhomId?: string | null;
};

function displayTitle(item: NganhHubItem): string {
  return (item.titleVi ?? item.title ?? item.slug).trim();
}

function subtitle(item: NganhHubItem, main: string): string | null {
  const eng = (item.titleEng ?? "").trim();
  if (!eng || eng.toLowerCase() === main.toLowerCase()) return null;
  return eng;
}

export function NganhHubCard({ item, href, deptTheme, nhomId }: Props) {
  const hub = useNganhHubEdit();
  const refresh = useNganhHubRefresh();
  const [busy, setBusy] = useState(false);
  const main = displayTitle(item);
  const sub = subtitle(item, main);
  const khoi = item.khoi_thi?.filter(Boolean) ?? [];
  const editing = Boolean(hub?.isEditing);
  const canRemoveFromNhom = editing && Boolean(nhomId?.trim());

  async function onRemoveFromNhom(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!nhomId?.trim() || busy) return;
    if (
      !confirm(
        "Gỡ ngành khỏi nhóm này? Ngành vẫn còn trên CINs (có thể nằm nhóm khác hoặc mục Ngành khác).",
      )
    ) {
      return;
    }
    setBusy(true);
    const r = await removeNganhFromNhom(item.id, nhomId.trim());
    setBusy(false);
    if (!r.ok) {
      hub?.showToast(r.message);
      return;
    }
    hub?.showToast("Đã gỡ ngành khỏi nhóm.");
    refresh();
  }

  const cardBody = (
    <>
      <NganhHubCardThumb item={item} title={main} />
      <div className="hn-role-body">
        <span className="career-hub-card-text">
          <span className="career-hub-card-title">{main}</span>
          {sub ? (
            <span className="career-hub-card-title-vi">{sub}</span>
          ) : null}
          {item.ma_nganh ? (
            <span className="hn-nganh-ma-badge">
              {"Mã ngành: "}
              {item.ma_nganh}
            </span>
          ) : null}
          {khoi.length > 0 ? (
            <span className="hn-nganh-khoi">
              {khoi.slice(0, 4).join("\u00a0\u00b7\u00a0")}
              {khoi.length > 4 ? "\u2026" : ""}
            </span>
          ) : null}
          {editing ? (
            <Link
              href={href}
              className="hn-hub-card-edit-link"
              onClick={(e) => e.stopPropagation()}
            >
              Sửa trang →
            </Link>
          ) : null}
        </span>
      </div>
    </>
  );

  if (editing) {
    return (
      <li>
        <div className="hn-nganh-card-edit-wrap">
          <div
            className="hn-role-card hn-nganh-card hn-nganh-card--editing"
            data-dept={deptTheme}
          >
            {cardBody}
          </div>
          {canRemoveFromNhom ? (
            <button
              type="button"
              className="hn-hub-card-remove"
              disabled={busy}
              onClick={(e) => void onRemoveFromNhom(e)}
              aria-label={`Gỡ ${main} khỏi nhóm`}
            >
              <NctRemoveIcon />
            </button>
          ) : null}
        </div>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={href}
        className="hn-role-card hn-nganh-card"
        data-dept={deptTheme}
        aria-label={
          item.ma_nganh ? `${main} — mã ngành ${item.ma_nganh}` : main
        }
      >
        {cardBody}
      </Link>
    </li>
  );
}


