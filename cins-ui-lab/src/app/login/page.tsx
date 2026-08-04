"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useLab } from "@/components/lab/LabProvider";

/**
 * Login mock — lát cắt UI sớm (sau Home theo plan).
 *
 * LOGIC_TOUCH: login.oauth-google
 * Real: LoginActions + Supabase OAuth PKCE → /auth/callback
 * Mock: form local; "Đăng nhập demo" bật session lab
 * Apply: restore Google OAuth; không dùng nút demo trên production
 */
export default function LoginLabPage() {
  const router = useRouter();
  const { setAuthenticated } = useLab();
  const [email, setEmail] = useState("demo@cins.vn");

  return (
    <div className="lab-placeholder" style={{ maxWidth: 420 }}>
      <p className="gh-eyebrow">login mock</p>
      <h1>Đăng nhập</h1>
      <p>Không gọi Supabase. Bấm demo để xem Home logged-in.</p>
      <label style={{ display: "grid", gap: 6, marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 700 }}>Email (mock)</span>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid var(--border)",
          }}
        />
      </label>
      <button
        type="button"
        className="lab-chrome-btn"
        style={{
          width: "100%",
          background: "var(--cins-blue)",
          border: "none",
          padding: 12,
          borderRadius: 12,
          marginBottom: 12,
        }}
        onClick={() => {
          setAuthenticated(true);
          router.push("/");
        }}
      >
        Đăng nhập demo → Home
      </button>
      <p style={{ fontSize: 13 }}>
        <Link href="/onboarding" style={{ color: "var(--cins-blue)" }}>
          Onboarding mock
        </Link>
        {" · "}
        <Link href="/" style={{ color: "var(--cins-blue)" }}>
          Home
        </Link>
      </p>
    </div>
  );
}
