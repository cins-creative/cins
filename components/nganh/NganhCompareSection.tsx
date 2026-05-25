"use client";

import { useNganhInlineEdit } from "@/components/nganh/inline/NganhInlineEditContext";
import type { NganhCompareItem } from "@/lib/nganh/parseNoiDung";

type Props = {
  compareItems: NganhCompareItem[];
  titleVi: string;
  thisCompare: { main: string; em: string | null };
  heroDesc: string | null;
  maNganh?: string;
};

function stripHtmlToPlain(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function plainToDescriptionHtml(text: string): string {
  const t = text.trim();
  if (!t) return "<p></p>";
  if (/<[a-z][\s\S]*>/i.test(t)) return t;
  return `<p>${t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
}

export function NganhCompareSection({
  compareItems,
  titleVi,
  thisCompare,
  heroDesc,
  maNganh,
}: Props) {
  const ctx = useNganhInlineEdit();
  const items = ctx?.isEditing ? ctx.compare_items : compareItems;
  const show =
    items.length > 0 || Boolean(maNganh) || Boolean(ctx?.isEditing);

  if (!show) return null;

  function updateItem(index: number, patch: Partial<NganhCompareItem>) {
    if (!ctx?.isEditing) return;
    ctx.setCompareItems(
      ctx.compare_items.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    );
  }

  function removeItem(index: number) {
    if (!ctx?.isEditing) return;
    ctx.setCompareItems(ctx.compare_items.filter((_, i) => i !== index));
  }

  function addItem() {
    if (!ctx?.isEditing) return;
    ctx.setCompareItems([
      ...ctx.compare_items,
      { title: "", maNganh: null, descriptionHtml: "<p></p>" },
    ]);
  }

  return (
    <>
      <div className="nct-sec-title">
        <div className="nct-sec-num">03</div>
        <div>
          <h2 className="nct-sec-h">Dễ nhầm với ngành nào?</h2>
          {ctx?.isEditing ? (
            <p className="nct-sec-sub nct-sec-sub--edit">
              Sửa danh sách ngành dễ nhầm — lưu cùng nút Lưu thay đổi.
            </p>
          ) : null}
        </div>
      </div>

      <div className="nct-compare-list">
        <div className="nct-compare-row is-this">
          <div className="nct-compare-left">
            <span className="nct-compare-tag nct-compare-tag--this">
              Ngành này
            </span>
            <div className="nct-compare-name">
              {thisCompare.em ? (
                <>
                  {thisCompare.main} <em>{thisCompare.em}</em>
                </>
              ) : (
                titleVi
              )}
            </div>
            {maNganh ? (
              <span className="nct-compare-code">{maNganh}</span>
            ) : null}
          </div>
          <p className="nct-compare-desc">
            {heroDesc || "Ngành đào tạo bạn đang xem trên CINs."}
          </p>
        </div>

        {items.map((row, index) =>
          ctx?.isEditing ? (
            <div
              key={`edit-${index}`}
              className="nct-compare-row nct-compare-row--edit"
            >
              <div className="nct-compare-edit-fields">
                <label className="nct-inline-field">
                  <span className="nct-inline-field-label">Tên ngành</span>
                  <input
                    className="nct-inline-input"
                    value={row.title}
                    onChange={(e) =>
                      updateItem(index, { title: e.target.value })
                    }
                  />
                </label>
                <label className="nct-inline-field">
                  <span className="nct-inline-field-label">Mã ngành</span>
                  <input
                    className="nct-inline-input"
                    value={row.maNganh ?? ""}
                    onChange={(e) =>
                      updateItem(index, {
                        maNganh: e.target.value.trim() || null,
                      })
                    }
                  />
                </label>
                <label className="nct-inline-field">
                  <span className="nct-inline-field-label">Mô tả</span>
                  <textarea
                    className="nct-inline-input nct-inline-input--desc"
                    rows={3}
                    value={stripHtmlToPlain(row.descriptionHtml)}
                    onChange={(e) =>
                      updateItem(index, {
                        descriptionHtml: plainToDescriptionHtml(e.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <button
                type="button"
                className="nct-editorial-list-btn nct-editorial-list-btn--danger nct-compare-remove"
                onClick={() => removeItem(index)}
              >
                Xóa
              </button>
            </div>
          ) : (
            <div key={`${row.title}-${row.maNganh}`} className="nct-compare-row">
              <div className="nct-compare-left">
                <span className="nct-compare-tag">Dễ nhầm</span>
                <div className="nct-compare-name">{row.title}</div>
                {row.maNganh ? (
                  <span className="nct-compare-code">{row.maNganh}</span>
                ) : null}
              </div>
              {row.descriptionHtml ? (
                <div
                  className="nct-compare-desc"
                  dangerouslySetInnerHTML={{ __html: row.descriptionHtml }}
                />
              ) : null}
            </div>
          ),
        )}
      </div>

      {ctx?.isEditing ? (
        <button
          type="button"
          className="tdh-mode-btn tdh-mode-btn-viewer nct-compare-add"
          onClick={addItem}
        >
          + Thêm ngành dễ nhầm
        </button>
      ) : null}
    </>
  );
}
