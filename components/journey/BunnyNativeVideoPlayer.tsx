"use client";

import { Loader2, Play } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";

import { JourneyCoverImage } from "@/components/journey/JourneyCoverImage";
import {
  BUNNY_FEED_QUALITY,
  bunnyMp4Candidates,
  cancelBunnyPrefetch,
  pickDetailQuality,
  prefetchBunnyMp4,
  readBunnyPlaybackState,
  saveBunnyPlaybackState,
  type BunnyMp4Quality,
} from "@/lib/journey/bunny-video-playback";
import { buildBunnyVideoMp4Url } from "@/lib/bunny/embed";
import { useOffscreenMedia } from "@/lib/journey/use-offscreen-media";

type Props = {
  videoId: string;
  title: string;
  poster?: string | null;
  canvasClass?: string;
  /** CSS aspect-ratio thật (đã clamp cao tối đa 9:16). */
  canvasStyle?: CSSProperties;
  mode: "feed" | "detail";
  /** Chi tiết bài — tự phát khi mở (modal / permalink). */
  autoplay?: boolean;
  preview?: {
    srcSet?: string;
    width?: number;
    height?: number;
  } | null;
};

function useViewportPrefetch(
  rootRef: RefObject<HTMLDivElement | null>,
  feedMp4Url: string | null,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled || !feedMp4Url || !rootRef.current) return;

    const el = rootRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            prefetchBunnyMp4(feedMp4Url);
          } else if (!entry.isIntersecting) {
            cancelBunnyPrefetch(feedMp4Url);
          }
        }
      },
      { threshold: [0, 0.55, 0.85], rootMargin: "120px 0px" },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelBunnyPrefetch(feedMp4Url);
    };
  }, [enabled, feedMp4Url, rootRef]);
}

export function BunnyNativeVideoPlayer({
  videoId,
  title,
  poster = null,
  canvasClass = "",
  canvasStyle,
  mode,
  autoplay = false,
  preview = null,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shouldAutoplay = mode === "detail" && autoplay;
  const [playing, setPlaying] = useState(shouldAutoplay);
  const [posterVisible, setPosterVisible] = useState(true);
  const [buffering, setBuffering] = useState(shouldAutoplay);
  const [candidateIndex, setCandidateIndex] = useState(0);

  const preferredQuality: BunnyMp4Quality =
    mode === "feed" ? BUNNY_FEED_QUALITY : pickDetailQuality();

  const candidates = useMemo(
    () => bunnyMp4Candidates(videoId, preferredQuality),
    [videoId, preferredQuality],
  );

  const activeSrc = candidates[candidateIndex] ?? null;
  const feedMp4Url = useMemo(
    () => buildBunnyVideoMp4Url(videoId, BUNNY_FEED_QUALITY),
    [videoId],
  );

  const stopPlayback = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      saveBunnyPlaybackState(videoId, video.currentTime);
      video.pause();
    }
    if (mode === "feed") {
      setPlaying(false);
      setPosterVisible(true);
      setBuffering(false);
    }
  }, [mode, videoId]);

  const { ref: rootRef } = useOffscreenMedia<HTMLDivElement>({
    enabled: mode === "detail" || playing,
    threshold: 0.2,
    onLeave: stopPlayback,
  });

  useViewportPrefetch(rootRef, feedMp4Url, mode === "feed" && !playing);

  const seekToSavedTime = useCallback(() => {
    if (mode !== "detail") return;
    const video = videoRef.current;
    if (!video) return;
    const saved = readBunnyPlaybackState(videoId);
    if (saved == null || saved <= 0) return;
    try {
      video.currentTime = saved;
    } catch {
      /* metadata chưa sẵn sàng */
    }
  }, [mode, videoId]);

  useEffect(() => {
    setCandidateIndex(0);
  }, [videoId, preferredQuality]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeSrc) return;
    video.load();

    if (!shouldAutoplay) return;

    const startPlayback = () => {
      seekToSavedTime();
      void video.play().then(() => {
        setPlaying(true);
        setPosterVisible(false);
        setBuffering(false);
      }).catch(() => {
        setPlaying(false);
        setBuffering(false);
      });
    };

    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      startPlayback();
      return;
    }

    video.addEventListener("canplay", startPlayback, { once: true });
    return () => video.removeEventListener("canplay", startPlayback);
  }, [activeSrc, shouldAutoplay, seekToSavedTime]);

  useEffect(() => {
    if (mode !== "detail") return;
    const video = videoRef.current;
    if (!video) return;
    video.addEventListener("loadedmetadata", seekToSavedTime, { once: true });
    return () => video.removeEventListener("loadedmetadata", seekToSavedTime);
  }, [mode, seekToSavedTime, activeSrc]);

  useEffect(() => {
    if (mode !== "feed" || !playing) return;
    const video = videoRef.current;
    if (!video) return;

    const persist = () => saveBunnyPlaybackState(videoId, video.currentTime);
    const interval = window.setInterval(persist, 2500);
    video.addEventListener("pause", persist);
    video.addEventListener("timeupdate", persist);

    return () => {
      window.clearInterval(interval);
      video.removeEventListener("pause", persist);
      video.removeEventListener("timeupdate", persist);
      persist();
    };
  }, [mode, playing, videoId]);

  const startFeedPlayback = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      setPlaying(true);
      setBuffering(true);
      requestAnimationFrame(() => {
        const video = videoRef.current;
        if (!video) return;
        void video.play().catch(() => {
          setPlaying(false);
          setBuffering(false);
        });
      });
    },
    [],
  );

  const handlePlaying = useCallback(() => {
    setPosterVisible(false);
    setBuffering(false);
  }, []);

  const handleWaiting = useCallback(() => {
    if (playing || mode === "detail") setBuffering(true);
  }, [mode, playing]);

  const handleCanPlay = useCallback(() => {
    setBuffering(false);
  }, []);

  const handleVideoError = useCallback(() => {
    setCandidateIndex((index) => {
      const next = index + 1;
      if (next >= candidates.length) {
        setBuffering(false);
        return index;
      }
      return next;
    });
  }, [candidates.length]);

  const showPosterLayer =
    Boolean(poster) &&
    posterVisible &&
    (buffering || (mode === "feed" && playing) || mode === "detail");

  return (
    <div ref={rootRef} className="jcard-video-root">
      {mode === "feed" && !playing ? (
        <button
          type="button"
          className={`preview preview--video jcard-video-trigger ${canvasClass}`}
          style={canvasStyle}
          aria-label={`Phát video: ${title}`}
          onClick={startFeedPlayback}
        >
          {poster ? (
            <>
              <JourneyCoverImage
                src={poster}
                srcSet={preview?.srcSet}
                sizes={
                  preview?.srcSet ? "(max-width: 767px) 100vw, 680px" : undefined
                }
                width={preview?.width ?? 1280}
                height={preview?.height ?? 720}
                alt=""
              />
              <span className="jcard-video-play" aria-hidden>
                <Play size={28} strokeWidth={2} fill="currentColor" />
              </span>
            </>
          ) : (
            <>
              <div className="preview-inner jcard-video-poster">
                <Play size={36} strokeWidth={1.8} aria-hidden />
              </div>
              <span className="jcard-video-play" aria-hidden>
                <Play size={28} strokeWidth={2} fill="currentColor" />
              </span>
            </>
          )}
        </button>
      ) : (
        <div
          className={[
            "jcard-video-player",
            canvasClass,
            buffering ? "is-buffering" : "",
            !posterVisible ? "is-playing-ready" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={canvasStyle}
          onClick={(e) => e.stopPropagation()}
        >
          {showPosterLayer ? (
            <div
              className={
                "jcard-video-poster-layer" +
                (!posterVisible ? " is-hidden" : "")
              }
              aria-hidden={!posterVisible}
            >
              <JourneyCoverImage
                src={poster!}
                srcSet={preview?.srcSet}
                sizes={
                  preview?.srcSet ? "(max-width: 767px) 100vw, 680px" : undefined
                }
                width={preview?.width ?? 1280}
                height={preview?.height ?? 720}
                alt=""
              />
              {buffering ? (
                <span
                  className="jcard-video-play jcard-video-play--loading"
                  aria-hidden
                >
                  <Loader2 size={26} strokeWidth={2.2} />
                </span>
              ) : null}
            </div>
          ) : null}

          {buffering && mode === "detail" ? (
            <span className="jcard-video-quality-hint" aria-live="polite">
              Đang tải chất lượng cao…
            </span>
          ) : null}

          {activeSrc ? (
            /* eslint-disable-next-line jsx-a11y/media-has-caption */
            <video
              ref={videoRef}
              key={activeSrc}
              className="jcard-video-native"
              src={activeSrc}
              poster={poster ?? undefined}
              title={title}
              controls
              playsInline
              autoPlay={shouldAutoplay}
              preload={shouldAutoplay || mode === "feed" ? "auto" : "metadata"}
              onPlaying={handlePlaying}
              onWaiting={handleWaiting}
              onCanPlay={handleCanPlay}
              onError={handleVideoError}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

type DetailProps = {
  videoId: string;
  title?: string;
  poster?: string | null;
  canvasClass?: string;
  canvasStyle?: CSSProperties;
  autoplay?: boolean;
};

/** Player native HD cho permalink / modal / unfold. */
export function JourneyDetailBunnyVideo({
  videoId,
  title = "Video",
  poster = null,
  canvasClass = "",
  canvasStyle,
  autoplay = false,
}: DetailProps) {
  return (
    <div
      className={
        "b-embed b-embed-ro is-native-video" +
        (canvasClass ? ` ${canvasClass}` : "")
      }
      style={canvasStyle}
      data-provider="bunny"
    >
      <BunnyNativeVideoPlayer
        videoId={videoId}
        title={title}
        poster={poster}
        canvasClass={canvasClass}
        canvasStyle={canvasStyle}
        mode="detail"
        autoplay={autoplay}
      />
    </div>
  );
}
