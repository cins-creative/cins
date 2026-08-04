import { LabSlicePlaceholder } from "@/components/lab/LabSlicePlaceholder";

/** Placeholder — Journey/profile slice. */
export default function JourneyLabPage() {
  return (
    <LabSlicePlaceholder
      title="Journey / profile"
      slice="/journey"
      notes={[
        "Visual fork trang /[slug]/journey — timeline + gallery + sidebar.",
        "LOGIC_TOUCH dự kiến: journey.owner-fetch, verify, compose, co-author invites.",
      ]}
    />
  );
}
