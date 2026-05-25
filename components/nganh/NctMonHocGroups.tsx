import Image from "next/image";
import Link from "next/link";

import { NctMonHocGroupAdd } from "@/components/nganh/NctMonHocGroupAdd";
import { NctRemoveIcon } from "@/components/nganh/NctRemoveIcon";
import { getCoverUrl } from "@/lib/articles/cover";
import {
  groupMonHocByCapDo,
  type MonHocCapDo,
  type MonHocNganhWithCapDo,
} from "@/lib/nganh/monHoc";

const MON_COLORS = [
  "c-yellow",
  "c-mint",
  "c-orange",
  "c-violet",
  "c-blue",
] as const;

type Props = {
  items: MonHocNganhWithCapDo[];
  editing?: boolean;
  onRemove?: (monArticleId: string) => void;
  onAdd?: (slugs: string[], capDo: MonHocCapDo) => void;
  addBusy?: boolean;
};

function monTomTat(text: string | null | undefined): string | null {
  const t = text?.trim();
  if (!t) return null;
  return t.length > 140 ? `${t.slice(0, 137)}…` : t;
}

function monThumbInitials(title: string): string {
  const w = title.trim().split(/\s+/).filter(Boolean);
  if (w.length >= 2) {
    return `${w[0]!.slice(0, 1)}${w[1]!.slice(0, 1)}`.toUpperCase();
  }
  return title.trim().slice(0, 2).toUpperCase() || "MH";
}

export function NctMonHocGroups({
  items,
  editing = false,
  onRemove,
  onAdd,
  addBusy = false,
}: Props) {
  const groups = groupMonHocByCapDo(items, { includeEmptyGroups: editing });
  if (!groups.length) return null;

  const linkedIds = items.map((i) => i.id);
  let colorOffset = 0;

  return (
    <div className="nct-mon-groups">
      {groups.map((group) => {
        const section = (
          <section
            key={group.cap_do}
            className="nct-mon-group"
            aria-labelledby={`nct-mon-group-${group.cap_do}`}
          >
            <div className="nct-mon-group-head">
              <h3
                id={`nct-mon-group-${group.cap_do}`}
                className="nct-mon-group-title"
              >
                {group.title}
              </h3>
              {editing && onAdd ? (
                <NctMonHocGroupAdd
                  capDo={group.cap_do}
                  linkedIds={linkedIds}
                  busy={addBusy}
                  onSave={(slugs) => onAdd(slugs, group.cap_do)}
                />
              ) : null}
            </div>
            {group.items.length > 0 ? (
              <ul className="nct-mon-list">
                {group.items.map((item, i) => (
                  <li key={item.id}>
                    <MonHocCard
                      item={item}
                      color={
                        MON_COLORS[(colorOffset + i) % MON_COLORS.length]!
                      }
                      editing={editing}
                      onRemove={onRemove}
                    />
                  </li>
                ))}
              </ul>
            ) : editing ? (
              <p className="nct-mon-group-empty">Chưa có môn trong nhóm này.</p>
            ) : null}
          </section>
        );
        colorOffset += group.items.length;
        return section;
      })}
    </div>
  );
}

function MonHocCard({
  item,
  color,
  editing,
  onRemove,
}: {
  item: MonHocNganhWithCapDo;
  color: string;
  editing?: boolean;
  onRemove?: (id: string) => void;
}) {
  const label = item.tieu_de_viet ?? item.tieu_de;
  const desc = monTomTat(item.tom_tat);
  const coverUrl = getCoverUrl(item.cover_id);

  const inner = (
    <>
      <div className="nct-mon-thumb">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt=""
            width={200}
            height={120}
            className="nct-mon-thumb-img"
            sizes="100px"
          />
        ) : (
          <span className="nct-mon-thumb-ph" aria-hidden>
            {monThumbInitials(label)}
          </span>
        )}
      </div>
      <div className="nct-mon-body">
        <div className="mc-name">{label}</div>
        {desc ? <p className="mc-desc">{desc}</p> : null}
      </div>
    </>
  );

  if (editing) {
    return (
      <div className={`nct-mon-card nct-mon-card--edit ${color}`}>
        <Link href={`/bai-viet/${item.slug}`} className="nct-mon-card-link">
          {inner}
        </Link>
        {onRemove ? (
          <button
            type="button"
            className="nct-mon-remove"
            onClick={(e) => {
              e.preventDefault();
              onRemove(item.id);
            }}
            aria-label="Gỡ môn học"
          >
            <NctRemoveIcon />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <Link href={`/bai-viet/${item.slug}`} className={`nct-mon-card ${color}`}>
      {inner}
    </Link>
  );
}
