import { redirect } from "next/navigation";
import { getMyProfile, needsOnboarding } from "@/lib/supabase/profile";

export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getMyProfile();
  if (!profile) redirect("/login?next=/studio");
  if (needsOnboarding(profile)) redirect("/onboarding");
  return children;
}
