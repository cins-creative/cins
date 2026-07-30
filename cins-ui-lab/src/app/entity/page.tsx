import { LabSlicePlaceholder } from "@/components/lab/LabSlicePlaceholder";

/** Placeholder — Entity (trường/tag/nghề) slice. */
export default function EntityLabPage() {
  return (
    <LabSlicePlaceholder
      title="Entity (trường / tag / nghề)"
      slice="/entity"
      notes={[
        "Mẫu lens chung: Nội dung / Đóng góp / Thảo luận.",
        "LOGIC_TOUCH dự kiến: entity.canonical, lens aggregation, curator promote.",
      ]}
    />
  );
}
