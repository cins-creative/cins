"use client";

import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const search = useSearchParams();
  const next = search.get("next") || "/studio";
  const err = search.get("error");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signInGoogle() {
    setBusy(true);
    const supabase = createClient();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setMessage(error.message);
      setBusy(false);
    }
  }

  async function signInMagic(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);
    setMessage(error ? error.message : "Đã gửi link đăng nhập — kiểm tra email.");
  }

  return (
    <div className="stack" style={{ maxWidth: 420 }}>
      <h1>Đăng nhập</h1>
      <p className="muted">Dùng tài khoản CINs (Google hoặc magic link).</p>
      {err ? <p className="error">Đăng nhập thất bại. Thử lại.</p> : null}
      {message ? <p className="muted">{message}</p> : null}
      <button
        type="button"
        className="btn btn-primary"
        disabled={busy}
        onClick={signInGoogle}
      >
        Tiếp tục với Google
      </button>
      <form className="form" onSubmit={signInMagic}>
        <label>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ban@email.com"
          />
        </label>
        <button type="submit" className="btn" disabled={busy}>
          Gửi magic link
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="muted">Đang tải…</p>}>
      <LoginForm />
    </Suspense>
  );
}
