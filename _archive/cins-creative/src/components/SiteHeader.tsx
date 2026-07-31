import Link from "next/link";
import { getMyProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getMyProfile() : null;

  return (
    <header className="site-header">
      <Link href="/" className="brand">
        Trung CINs website
      </Link>
      <nav className="nav">
        <Link href="/explore">Khám phá</Link>
        {user ? (
          <>
            <Link href="/studio">Studio</Link>
            {profile?.slug ? (
              <Link href={`/@${profile.slug}`}>Portfolio</Link>
            ) : null}
            <Link href="/auth/logout" className="btn">
              Đăng xuất
            </Link>
          </>
        ) : (
          <Link href="/login" className="btn btn-primary">
            Đăng nhập
          </Link>
        )}
      </nav>
    </header>
  );
}
