import type { Metadata } from "next";
import { Anton, Be_Vietnam_Pro } from "next/font/google";

import "./globals.css";
import "./cins-design-tokens.css";
import "./cins-font-bridge.css";
import "./cins-styles.css";
import "./cins-cmm.css";
import "./cins-material-symbols.css";
import "./cins-gradients.css";
import "./cins-app-nav.css";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700", "800", "900"],
});

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin", "vietnamese"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "CINs — Khám phá ngành sáng tạo thị giác tại Việt Nam",
  description:
    "120+ vị trí nghề · 38 trường đại học · Lộ trình 4 bước. Tìm ra đúng nghề trước khi chọn ngành.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${beVietnam.variable} ${anton.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Load Material Symbols in <head> — @import in CSS is easy to block or apply late; icon text shows as words if the font never loads. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
          rel="stylesheet"
        />
        {/* Khớp typography trang home v2 (Anton / Be Vietnam Pro / Crimson Pro) */}
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Be+Vietnam+Pro:wght@300;400;500;600;700;800;900&family=Crimson+Pro:ital,wght@0,400;0,600;1,400;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
