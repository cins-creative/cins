import { getYoutubeId } from "@/lib/youtube";

type Props = {
  url: string | null | undefined;
  title?: string;
};

export function VideoEmbed({ url, title = "Video" }: Props) {
  const id = getYoutubeId(url);
  if (!id) return null;

  return (
    <div className="career-video career-surface">
      <div className="career-video-inner">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="career-video-frame"
        />
      </div>
    </div>
  );
}
