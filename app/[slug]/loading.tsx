import { CinsShell } from "@/components/cins/CinsShell";
import { JourneyProfilePageSkeleton } from "@/app/[slug]/_components/JourneyProfilePage.skeleton";

export default function UserJourneyLoading() {
  return (
    <CinsShell data-screen-label="Journey">
      <JourneyProfilePageSkeleton />
    </CinsShell>
  );
}
