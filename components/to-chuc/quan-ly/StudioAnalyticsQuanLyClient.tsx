"use client";

type Props = {
  orgTen: string;
};

const METRIC_SLOTS = [
  {
    id: "tiep-can",
    label: "Tiếp cận",
    hint: "Người thấy nội dung (unique + lượt)",
  },
  {
    id: "tuong-tac",
    label: "Tương tác",
    hint: "Xem nội dung, mở bình luận, xem media",
  },
  {
    id: "nguon",
    label: "Nguồn",
    hint: "Trang org · Journey · chia sẻ ngoài",
  },
  {
    id: "noi-dung",
    label: "Theo bài",
    hint: "Xếp hạng bài đăng theo hiệu quả tiếp cận",
  },
] as const;

/**
 * Tab Analytics — tổng hợp hiệu quả tiếp cận nội dung org.
 * Số liệu chi tiết từng bài đã có qua «Số liệu tiếp cận»; tab này gom cấp org.
 */
export function StudioAnalyticsQuanLyClient({ orgTen }: Props) {
  return (
    <div className="cso-ql-analytics">
      <header className="cso-ql-analytics-head">
        <h1 className="cso-ql-placeholder-title">Analytics</h1>
        <p className="cso-ql-placeholder-desc">
          Tổng hợp hiệu quả tiếp cận nội dung của «{orgTen}» — lượt thấy, tương
          tác và nguồn phân phối trên CINs.
        </p>
      </header>

      <ul className="cso-ql-analytics-grid" aria-label="Nhóm chỉ số">
        {METRIC_SLOTS.map((slot) => (
          <li key={slot.id} className="cso-ql-analytics-card">
            <p className="cso-ql-analytics-card-label">{slot.label}</p>
            <p className="cso-ql-analytics-card-value" aria-hidden="true">
              —
            </p>
            <p className="cso-ql-analytics-card-hint">{slot.hint}</p>
          </li>
        ))}
      </ul>

      <p className="cso-ql-analytics-note">
        Bảng tổng hợp và danh sách bài đang được nối từ số liệu tiếp cận hiện
        có. Từng bài vẫn xem được «Số liệu tiếp cận» ngay trên menu bài đăng.
      </p>
    </div>
  );
}
