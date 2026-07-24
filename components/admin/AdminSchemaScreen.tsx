"use client";

import { useDeferredValue, useEffect, useState } from "react";

import {
  schemaFieldSample,
  schemaTableDoc,
} from "@/lib/admin/schema-docs";
import {
  SCHEMA_DOMAIN_LABELS,
  type SchemaDomainId,
  type SchemaListing,
  type SchemaTable,
} from "@/lib/admin/schema-types";

type TabId = "tables" | "enums";

type Props = {
  data: SchemaListing;
};

function formatQueriedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AdminSchemaScreen({ data }: Props) {
  const [tab, setTab] = useState<TabId>("tables");
  const [domain, setDomain] = useState<SchemaDomainId | "all">("all");
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const [selectedName, setSelectedName] = useState(data.tables[0]?.name ?? "");

  const enumFirst = new Map(
    data.enums.map((e) => [e.name, e.values[0] ?? null] as const),
  );

  const needle = deferredQ.trim().toLowerCase();

  const filteredTables = data.tables.filter((t) => {
    if (domain !== "all" && t.domain !== domain) return false;
    if (!needle) return true;
    if (t.name.includes(needle)) return true;
    if (schemaTableDoc(t.name).toLowerCase().includes(needle)) return true;
    if (t.pk.some((c) => c.toLowerCase().includes(needle))) return true;
    return t.columns.some(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        c.type.toLowerCase().includes(needle),
    );
  });

  const selected: SchemaTable | undefined =
    filteredTables.find((t) => t.name === selectedName) ?? filteredTables[0];

  const filteredEnums = data.enums.filter((e) => {
    if (!needle) return true;
    if (e.name.toLowerCase().includes(needle)) return true;
    return e.values.some((v) => v.toLowerCase().includes(needle));
  });

  function jumpToTable(name: string) {
    setDomain("all");
    setSelectedName(name);
    setQ("");
    setTab("tables");
  }

  useEffect(() => {
    const el = document.querySelector(
      `[data-schema-table="${CSS.escape(selectedName)}"]`,
    );
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedName]);

  return (
    <div className="page-body admin-schema">
      <header className="admin-schema__top">
        <div className="admin-schema__top-text">
          <h1 className="admin-schema__title">Schema DB</h1>
          <p className="admin-schema__meta">
            {data.tables.length} bảng · {data.enums.length} enum ·{" "}
            {formatQueriedAt(data.queriedAt)}
          </p>
        </div>

        <div className="admin-schema__top-controls">
          <div className="admin-schema__tabs" role="tablist" aria-label="Loại">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "tables"}
              className={`admin-schema__tab${tab === "tables" ? " is-active" : ""}`}
              onClick={() => setTab("tables")}
            >
              Bảng
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "enums"}
              className={`admin-schema__tab${tab === "enums" ? " is-active" : ""}`}
              onClick={() => setTab("enums")}
            >
              Enum
            </button>
          </div>
          {tab === "tables" ? (
            <label className="admin-schema__domain">
              <span className="admin-sr-only">Domain</span>
              <select
                value={domain}
                onChange={(e) =>
                  setDomain(e.target.value as SchemaDomainId | "all")
                }
              >
                <option value="all">Tất cả ({data.tables.length})</option>
                {data.domainCounts.map((d) => (
                  <option key={d.domain} value={d.domain}>
                    {SCHEMA_DOMAIN_LABELS[d.domain]} ({d.count})
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="admin-schema__search">
            <span className="admin-sr-only">Tìm</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                tab === "tables" ? "Tìm bảng, mô tả, cột…" : "Tìm enum…"
              }
              autoComplete="off"
            />
          </label>
        </div>
      </header>

      {tab === "tables" ? (
        <>
          <div className="admin-schema__layout">
            <aside className="admin-schema__list" aria-label="Danh sách bảng">
              <p className="admin-schema__list-count">
                {filteredTables.length} bảng
              </p>
              {filteredTables.length === 0 ? (
                <p className="admin-schema__empty">Không có bảng khớp.</p>
              ) : (
                <ul className="admin-schema__table-list">
                  {filteredTables.map((t) => {
                    const active = t.name === selected?.name;
                    return (
                      <li key={t.name}>
                        <button
                          type="button"
                          data-schema-table={t.name}
                          className={`admin-schema__row${active ? " is-active" : ""}`}
                          onClick={() => setSelectedName(t.name)}
                        >
                          <span className="admin-schema__row-name">
                            {t.name}
                          </span>
                          <span className="admin-schema__row-doc">
                            {schemaTableDoc(t.name)}
                          </span>
                          <span className="admin-schema__row-meta">
                            {t.columns.length} cột
                            {t.fks.length > 0 ? ` · ${t.fks.length} FK` : ""}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </aside>

            <section
              className="admin-schema__detail"
              aria-label="Chi tiết bảng"
            >
              {!selected ? (
                <p className="admin-schema__empty">Chọn một bảng để xem cột.</p>
              ) : (
                <>
                  <div className="admin-schema__detail-head">
                    <p className="admin-schema__eyebrow">
                      {SCHEMA_DOMAIN_LABELS[selected.domain]}
                    </p>
                    <h2 className="admin-schema__detail-title">
                      {selected.name}
                    </h2>
                    <p className="admin-schema__detail-doc">
                      {schemaTableDoc(selected.name)}
                    </p>
                    <p className="admin-schema__detail-stats">
                      PK{" "}
                      <strong>
                        {selected.pk.length ? selected.pk.join(", ") : "—"}
                      </strong>
                      <span aria-hidden>·</span>
                      {selected.columns.length} cột
                      <span aria-hidden>·</span>
                      {selected.fks.length} FK
                    </p>
                  </div>

                  <p className="admin-schema__hint">
                    Giá trị{" "}
                    <span className="admin-schema__hint-fk">cam</span> là FK —
                    bấm để mở bảng đích.
                  </p>

                  <div className="admin-schema__table-wrap">
                    <table className="admin-schema__grid">
                      <thead>
                        <tr>
                          <th>Cột</th>
                          <th>Kiểu</th>
                          <th>Null</th>
                          <th>Ví dụ</th>
                          <th>Default</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.columns.map((c) => {
                          const isPk = selected.pk.includes(c.name);
                          const sample = schemaFieldSample(
                            selected,
                            c,
                            enumFirst.get(c.type) ?? null,
                          );
                          return (
                            <tr
                              key={c.name}
                              className={isPk ? "is-pk" : undefined}
                            >
                              <td>
                                <span className="admin-schema__col">
                                  {c.name}
                                </span>
                                {isPk ? (
                                  <span className="admin-schema__tag">PK</span>
                                ) : null}
                                {sample.fkRefTable ? (
                                  <span className="admin-schema__tag admin-schema__tag--fk">
                                    FK
                                  </span>
                                ) : null}
                              </td>
                              <td>
                                <span className="admin-schema__type">
                                  {c.type}
                                </span>
                              </td>
                              <td>{c.nullable ? "YES" : "NO"}</td>
                              <td>
                                {sample.fkRefTable ? (
                                  <button
                                    type="button"
                                    className="admin-schema__sample admin-schema__sample--fk"
                                    onClick={() =>
                                      jumpToTable(sample.fkRefTable!)
                                    }
                                    title={`Mở ${sample.fkRefTable}`}
                                  >
                                    {sample.text}
                                  </button>
                                ) : (
                                  <span className="admin-schema__sample">
                                    {sample.text}
                                  </span>
                                )}
                              </td>
                              <td className="admin-schema__default">
                                {c.default ?? "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {selected.fks.length > 0 ? (
                    <div className="admin-schema__fk-block">
                      <h3 className="admin-schema__section">Foreign keys</h3>
                      <ul className="admin-schema__fk-list">
                        {selected.fks.map((fk) => (
                          <li
                            key={`${fk.column}-${fk.refTable}-${fk.refColumn}`}
                          >
                            <button
                              type="button"
                              className="admin-schema__fk"
                              onClick={() => jumpToTable(fk.refTable)}
                            >
                              <span>{fk.column}</span>
                              <span aria-hidden className="admin-schema__fk-arrow">
                                →
                              </span>
                              <span>
                                {fk.refTable}.{fk.refColumn}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              )}
            </section>
          </div>
        </>
      ) : (
        <div className="admin-schema__enums">
          <p className="admin-schema__list-count">
            {filteredEnums.length} enum
          </p>
          {filteredEnums.length === 0 ? (
            <p className="admin-schema__empty">Không có enum khớp.</p>
          ) : (
            <ul className="admin-schema__enum-list">
              {filteredEnums.map((e) => (
                <li key={e.name} className="admin-schema__enum-card">
                  <div className="admin-schema__enum-head">
                    <strong>{e.name}</strong>
                    <span>{e.values.length}</span>
                  </div>
                  <div className="admin-schema__enum-values">
                    {e.values.map((v) => (
                      <span key={v}>{v}</span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
