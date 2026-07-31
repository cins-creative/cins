"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const SLUG_RE = /^[a-z0-9][a-z0-9-_]{1,62}[a-z0-9]$|^[a-z0-9]$/;

export default function OnboardingPage() {
  const router = useRouter();
  const [ten, setTen] = useState("");
  const [slug, setSlug] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cleanSlug = slug.trim().toLowerCase();
    if (!SLUG_RE.test(cleanSlug)) {
      setError("Slug chỉ gồm a-z, 0-9, - hoặc _.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      setError("Chưa đăng nhập.");
      return;
    }

    const { error: updErr } = await supabase
      .from("user_nguoi_dung")
      .update({
        ten_hien_thi: ten.trim(),
        slug: cleanSlug,
        bio: bio.trim() || null,
      })
      .eq("auth_user_id", user.id);

    setBusy(false);
    if (updErr) {
      if (updErr.code === "23505") {
        setError("Slug đã được dùng — chọn slug khác.");
      } else {
        setError(updErr.message);
      }
      return;
    }
    router.replace("/studio");
    router.refresh();
  }

  return (
    <div className="stack">
      <h1>Thiết lập hồ sơ</h1>
      <p className="muted">Cập nhật profile (không tạo mới). Bắt buộc trước khi vào studio.</p>
      <form className="form" onSubmit={onSubmit}>
        <label>
          Tên hiển thị
          <input required value={ten} onChange={(e) => setTen(e.target.value)} />
        </label>
        <label>
          Slug portfolio (/@slug)
          <input
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="ten-ban"
          />
        </label>
        <label>
          Bio
          <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          Lưu và tiếp tục
        </button>
      </form>
    </div>
  );
}
