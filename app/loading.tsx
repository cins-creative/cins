import { LoggedInChromeSkeleton } from "@/components/auth/LoggedInChromeSkeleton";

/**
 * Skeleton segment — cùng chrome logged-in (sidebar + topbar + feed)
 * để soft-nav sau sign-in không tụt về khung cụt.
 */
export default function HomeLoading() {
  return <LoggedInChromeSkeleton />;
}
