import { TaoToChucPageShell } from "@/components/to-chuc/TaoToChucPageShell";

export default function TaoToChucLoading() {
  return (
    <TaoToChucPageShell>
      <div aria-busy="true" aria-label="Đang tải">
        <div
          className="cins-login-eyebrow"
          style={{
            height: 14,
            width: "45%",
            background: "var(--neutral-100, #f1f2f5)",
            borderRadius: 6,
          }}
        />
        <div
          style={{
            marginTop: 12,
            height: 36,
            width: "70%",
            background: "var(--neutral-100, #f1f2f5)",
            borderRadius: 8,
          }}
        />
        <div
          style={{
            marginTop: 12,
            height: 14,
            width: "90%",
            background: "var(--neutral-100, #f1f2f5)",
            borderRadius: 6,
          }}
        />
        <div className="ttc-type-grid" style={{ marginTop: 22 }}>
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
    </TaoToChucPageShell>
  );
}
