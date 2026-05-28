import { Anton } from "next/font/google";

import "./journey/journey.css";
import "@/styles/article-rich-content.css";
import "./p/new/editor.css";
import "./p/[postSlug]/post-page.css";

const anton = Anton({
  variable: "--font-j-anton",
  subsets: ["latin", "vietnamese"],
  weight: ["400"],
  display: "swap",
});

export default function UserProfileLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  return (
    <div className={anton.variable}>
      {children}
      {modal}
    </div>
  );
}
