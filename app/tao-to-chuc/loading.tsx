export default function TaoToChucLoading() {
  return (
    <div className="ttc-shell" aria-busy="true" aria-label="Đang tải">
      <div className="ttc-card">
        <div className="ttc-card-head">
          <div
            className="ttc-card-title"
            style={{
              height: 28,
              width: "55%",
              background: "var(--neutral-100, #f1f2f5)",
              borderRadius: 8,
            }}
          />
          <div
            style={{
              marginTop: 10,
              height: 14,
              width: "85%",
              background: "var(--neutral-100, #f1f2f5)",
              borderRadius: 6,
            }}
          />
        </div>
        <div className="ttc-card-body">
          <div className="ttc-type-grid">
            <div
              style={{
                height: 160,
                borderRadius: 20,
                background: "var(--neutral-50, #f8f9fb)",
                border: "1px solid var(--border, #e4e6eb)",
              }}
            />
            <div
              style={{
                height: 160,
                borderRadius: 20,
                background: "var(--neutral-50, #f8f9fb)",
                border: "1px solid var(--border, #e4e6eb)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
