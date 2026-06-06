import { Anton } from "next/font/google";

import { AuthGateRoot } from "@/components/auth/AuthGateProvider";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";

import "@/app/login/login.css";
import "./journey/journey.css";
import "./journey/image-grid.css";
import "@/styles/article-rich-content.css";
import "./p/new/editor.css";
import "./p/[postSlug]/post-page.css";

const anton = Anton({
  variable: "--font-j-anton",
  subsets: ["latin", "vietnamese"],
  weight: ["400"],
  display: "swap",
});

export default async function UserProfileLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  const session = await getCurrentSessionAndProfile();
  const initialAuthenticated = Boolean(session?.profile);

  return (
    <div className={anton.variable}>
      <AuthGateRoot initialAuthenticated={initialAuthenticated}>
        {children}
        {modal}
      </AuthGateRoot>
    </div>
  );
}
