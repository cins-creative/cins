"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useLab } from "@/components/lab/LabProvider";
import type { MockGiaiDoan } from "@/mocks/session";

/**
 * Onboarding mock.
 *
 * LOGIC_TOUCH: onboarding.giai-doan
 * Real: lưu user_nguoi_dung.giai_doan; redirect nếu null trên Home logged-in
 * Mock: select local + setAuthenticated
 * Apply: write profile; enforce redirect in app/page + HomeWorldJourneyMain
 */
export default function OnboardingLabPage() {
  const router = useRouter();
  const { setAuthenticated, setGiaiDoan, giaiDoan } = useLab();
  const [value, setValue] = useState<MockGiaiDoan>(giaiDoan);

  return (
    <div className="lab-placeholder" style={{ maxWidth: 480 }}>
      <p className="gh-eyebrow">onboarding mock</p>
      <h1>Bạn đang ở giai đoạn nào?</h1>
      <p>Chọn giai_doan — Home adaptive sẽ đổi module theo persona.</p>
      <select
        className="lab-chrome-select"
        style={{
          width: "100%",
          padding: 12,
          marginBottom: 16,
          color: "var(--ink-display)",
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
        value={value}
        onChange={(e) => setValue(e.target.value as MockGiaiDoan)}
      >
        <option value="dang_hoc">Đang học</option>
        <option value="dang_lam">Đang làm</option>
        <option value="tim_viec">Tìm việc</option>
        <option value="freelance">Freelance</option>
        <option value="dang_day">Đang dạy</option>
      </select>
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
          setGiaiDoan(value);
          setAuthenticated(true);
          router.push("/");
        }}
      >
        Xong — vào Home logged-in
      </button>
      <p style={{ fontSize: 13 }}>
        <Link href="/" style={{ color: "var(--cins-blue)" }}>
          ← Home
        </Link>
      </p>
    </div>
  );
}
