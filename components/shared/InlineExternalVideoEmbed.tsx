import "@/components/shared/inline-external-video-embed.css";

type Props = {
  src: string;
  title?: string;
  className?: string;
};

export function InlineExternalVideoEmbed({
  src,
  title = "Video nhúng",
  className,
}: Props) {
  const iframeSrc = src.includes("?") ? `${src}&rel=0` : `${src}?rel=0`;

  return (
    <div
      className={`cins-inline-video-embed${className ? ` ${className}` : ""}`}
    >
      <iframe
        src={iframeSrc}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}
