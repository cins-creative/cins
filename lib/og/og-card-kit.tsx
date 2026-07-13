import type { ReactNode } from "react";

/** Bảng màu dùng chung cho mọi OG card CINs. */
export const OG_INK = "#0f172a";
export const OG_MUTED = "#64748b";
export const OG_ACCENT = "#1d4ed8";
export const OG_ACCENT_SOFT = "rgba(29, 78, 216, 0.10)";

/** Màu 4 hình khối thương hiệu — khớp thumbnail trang chủ. */
const SHAPE_AMBER = "#f59e0b";
const SHAPE_EMERALD = "#34d399";
const SHAPE_YELLOW = "#fbbf24";
const SHAPE_VIOLET = "#a78bfa";

/** Cụm 4 hình khối thương hiệu: tam giác · thoi · tròn · vuông. */
export function BrandShapes() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: "11px solid transparent",
          borderRight: "11px solid transparent",
          borderBottom: `19px solid ${SHAPE_AMBER}`,
        }}
      />
      <div
        style={{
          width: 18,
          height: 18,
          background: SHAPE_EMERALD,
          borderRadius: 4,
          transform: "rotate(45deg)",
        }}
      />
      <div
        style={{ width: 19, height: 19, background: SHAPE_YELLOW, borderRadius: "50%" }}
      />
      <div style={{ width: 18, height: 18, background: SHAPE_VIOLET, borderRadius: 5 }} />
    </div>
  );
}

/** Logo + wordmark CINS.VN. */
export function OgBrand({ logoUrl }: { logoUrl: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt="CINs"
        width={44}
        height={44}
        style={{ width: 44, height: 44, borderRadius: 11 }}
      />
      <span
        style={{
          fontSize: 21,
          fontWeight: 700,
          color: OG_INK,
          letterSpacing: "0.05em",
        }}
      >
        CINS.VN
      </span>
    </div>
  );
}

/** Nhãn phân loại: gạch accent + chữ hoa + cụm shape. */
export function OgEyebrow({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 18,
          fontWeight: 700,
          color: OG_ACCENT,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        <div style={{ width: 44, height: 5, background: OG_ACCENT, borderRadius: 5 }} />
        {label}
      </div>
      <BrandShapes />
    </div>
  );
}

/** Pill trắng nổi (viền + shadow) — dùng cho mã / lĩnh vực / loại. */
export function OgFloatingPill({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "10px 22px",
        borderRadius: 999,
        background: "#ffffff",
        border: "2px solid rgba(29, 78, 216, 0.18)",
        boxShadow: "0 6px 18px rgba(29, 78, 216, 0.12)",
        color: OG_ACCENT,
        fontSize: 19,
        fontWeight: 700,
      }}
    >
      {children}
    </div>
  );
}

/** Pill mềm nền accent nhạt — dùng cho URL trang. */
export function OgUrlPill({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "11px 20px",
        borderRadius: 999,
        background: OG_ACCENT_SOFT,
        color: OG_ACCENT,
        fontSize: 18,
        fontWeight: 700,
      }}
    >
      {children}
    </div>
  );
}

/** Khung ảnh minh hoạ bo góc + viền trắng + khối màu lệch phía sau. */
export function OgCoverFrame({
  src,
  fallbackLabel = "CINs",
}: {
  src: string | null;
  fallbackLabel?: string;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 44px 40px 20px",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 62,
          right: 26,
          bottom: 58,
          left: 44,
          borderRadius: 30,
          background: "linear-gradient(140deg, #93c5fd 0%, #60a5fa 100%)",
          transform: "rotate(4deg)",
        }}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: 26,
          overflow: "hidden",
          border: "7px solid #ffffff",
          boxShadow: "0 28px 60px rgba(15, 23, 42, 0.28)",
          display: "flex",
        }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            width={420}
            height={560}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                "linear-gradient(150deg, #1d4ed8 0%, #2563eb 55%, #38bdf8 100%)",
            }}
          >
            <span
              style={{
                fontSize: 92,
                fontWeight: 800,
                color: "rgba(255,255,255,0.92)",
                letterSpacing: "-0.03em",
              }}
            >
              {fallbackLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Khung nền chung: gradient sáng + 2 blob trang trí, chứa các cột nội dung. */
export function OgCardRoot({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        fontFamily: "Be Vietnam Pro",
        background:
          "linear-gradient(135deg, #ffffff 0%, #f6f9ff 52%, #e8f0ff 100%)",
        color: OG_INK,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -140,
          left: -120,
          width: 360,
          height: 360,
          borderRadius: "50%",
          background: "rgba(96, 165, 250, 0.16)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -160,
          left: 220,
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "rgba(251, 191, 36, 0.14)",
        }}
      />
      {children}
    </div>
  );
}
