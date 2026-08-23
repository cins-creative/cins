import { LabSlicePlaceholder } from "@/components/lab/LabSlicePlaceholder";

/** Placeholder — Gallery/feed slice. */
export default function GalleryLabPage() {
  return (
    <LabSlicePlaceholder
      title="Gallery / feed"
      slice="/gallery"
      notes={[
        "Visual fork từ Journey gallery grid + World Journey view=gallery.",
        "LOGIC_TOUCH dự kiến: gallery.fetch, gallery.filter, media CDN variants.",
      ]}
    />
  );
}
