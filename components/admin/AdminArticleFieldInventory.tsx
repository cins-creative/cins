"use client";

import type { ArticleFieldStatus } from "@/lib/admin/article-fields";

type Props = {
  fields: ArticleFieldStatus[];
  compact?: boolean;
  title?: string;
};

export function AdminArticleFieldInventory({
  fields,
  compact = false,
  title = "Dữ liệu bài viết",
}: Props) {
  const filled = fields.filter((f) => f.hasData).length;
  const total = fields.length;

  return (
    <div
      className={`admin-field-inventory${compact ? " admin-field-inventory--compact" : ""}`}
    >
      <div className="admin-field-inventory__head">
        <span className="admin-field-inventory__title">{title}</span>
        <span className="admin-field-inventory__count">
          {filled}/{total} field có dữ liệu
        </span>
      </div>
      <ul className="admin-field-inventory__list">
        {fields.map((f) => (
          <li
            key={f.key}
            className={`admin-field-inventory__item${f.hasData ? " admin-field-inventory__item--yes" : ""}`}
          >
            <span className="admin-field-inventory__dot" aria-hidden />
            <span className="admin-field-inventory__label">{f.label}</span>
            {f.hint ? (
              <span className="admin-field-inventory__hint" title={f.hint}>
                {f.hint.length > 48 ? `${f.hint.slice(0, 45)}…` : f.hint}
              </span>
            ) : (
              <span className="admin-field-inventory__hint admin-field-inventory__hint--empty">
                {f.hasData ? "có" : "trống"}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
