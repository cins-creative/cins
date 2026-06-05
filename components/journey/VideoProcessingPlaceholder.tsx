import { Loader2, Video } from "lucide-react";

/** Placeholder khi video Bunny đang upload / encode. */
export function VideoProcessingPlaceholder() {
  return (
    <div className="j-m-video-processing" aria-live="polite">
      <Video size={32} strokeWidth={1.6} aria-hidden />
      <strong>Video đang được xử lý</strong>
      <span>Video sẽ hiển thị khi sẵn sàng. Bạn sẽ nhận thông báo.</span>
      <Loader2 size={20} strokeWidth={2} className="j-m-video-processing-spin" aria-hidden />
    </div>
  );
}
