import { LabSlicePlaceholder } from "@/components/lab/LabSlicePlaceholder";

/** Placeholder — Studio/portfolio slice. */
export default function StudioLabPage() {
  return (
    <LabSlicePlaceholder
      title="Studio / portfolio"
      slice="/studio"
      notes={[
        "Dashboard tác giả + tạo/sửa tác phẩm (UI only).",
        "LOGIC_TOUCH dự kiến: studio.auth-gate, upload CF Images, publish.",
      ]}
    />
  );
}
