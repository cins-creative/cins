import { LabSlicePlaceholder } from "@/components/lab/LabSlicePlaceholder";

/** Placeholder — Chat slice. */
export default function ChatLabPage() {
  return (
    <LabSlicePlaceholder
      title="Chat"
      slice="/chat"
      notes={[
        "Phòng chat / workspace nhóm (L28) — UI only.",
        "LOGIC_TOUCH dự kiến: chat.membership, realtime, project rooms, thẻ tài nguyên.",
      ]}
    />
  );
}
