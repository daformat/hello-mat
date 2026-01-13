import {
  ComponentProps,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

type BaseVideoSources = {
  light: {
    src: string;
    type: string;
  };
  dark: {
    src: string;
    type: string;
  };
};

export type VideoSourcesWithSlowVersions = BaseVideoSources & {
  slow: BaseVideoSources;
};

export type VideoSourcesWithoutSlowVersions = BaseVideoSources & {
  slow?: never;
};

export type VideoSources =
  | VideoSourcesWithSlowVersions
  | VideoSourcesWithoutSlowVersions;

export type VideoPlayerProps = {
  sources: VideoSources;
  /** When true, the video will only play when visible in the viewport */
  autoPlaysWhenVisible?: boolean;
} & ComponentProps<"video">;

export const VideoPlayer = ({
  sources,
  className,
  style,
  autoPlaysWhenVisible = false,
  ...rest
}: VideoPlayerProps) => {
  const [showSlow, setShowSlow] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Set<HTMLVideoElement>>(new Set());
  const renderNormal = !showSlow || !sources.slow;

  const addVideoRef = useCallback((el: HTMLVideoElement | null) => {
    if (el) {
      videoRefs.current.add(el);
    }
  }, []);

  // Intersection Observer for autoPlaysWhenVisible
  useEffect(() => {
    if (!autoPlaysWhenVisible || !containerRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsVisible(entry.isIntersecting);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [autoPlaysWhenVisible]);

  // Play/pause videos based on visibility
  useLayoutEffect(() => {
    if (!autoPlaysWhenVisible) {
      return;
    }

    videoRefs.current.forEach((video) => {
      if (isVisible) {
        video.play().catch(() => {
          // Autoplay may be blocked by browser
        });
      } else {
        video.pause();
      }
    });
  }, [isVisible, autoPlaysWhenVisible]);

  const shouldAutoPlay = !autoPlaysWhenVisible;

  return (
    <section style={{ width: "100%", ...style }}>
      <div
        ref={containerRef}
        className="video_player"
        style={{ width: "100%", ...style }}
      >
        <div
          style={{
            width: "100%",
            ...style,
            display: renderNormal ? style?.display : "none",
          }}
        >
          <video
            ref={addVideoRef}
            className={["video_dark", className].filter(Boolean).join(" ")}
            autoPlay={shouldAutoPlay}
            loop
            muted
            playsInline
            style={style}
            {...rest}
          >
            <source src={sources.dark.src} type={sources.dark.type} />
          </video>
          <video
            ref={addVideoRef}
            className={["video_light", className].filter(Boolean).join(" ")}
            autoPlay={shouldAutoPlay}
            loop
            muted
            playsInline
            style={style}
            {...rest}
          >
            <source src={sources.light.src} type={sources.light.type} />
          </video>
        </div>
        {sources.slow ? (
          <div
            style={{
              width: "100%",
              ...style,
              display: !renderNormal ? style?.display : "none",
            }}
          >
            <video
              ref={addVideoRef}
              className={["video_dark", className].filter(Boolean).join(" ")}
              autoPlay={shouldAutoPlay}
              loop
              muted
              playsInline
              style={style}
              {...rest}
            >
              <source
                src={sources.slow.dark.src}
                type={sources.slow.dark.type}
              />
            </video>
            <video
              ref={addVideoRef}
              className={["video_light", className].filter(Boolean).join(" ")}
              autoPlay={shouldAutoPlay}
              loop
              muted
              playsInline
              style={style}
              {...rest}
            >
              <source
                src={sources.slow.light.src}
                type={sources.slow.light.type}
              />
            </video>
          </div>
        ) : null}
      </div>
      {sources.slow && (
        <div style={{ textAlign: "right", marginTop: "0.5em" }}>
          <button
            className="button"
            onClick={() => setShowSlow(false)}
            data-state={renderNormal ? "active" : undefined}
          >
            100%
          </button>{" "}
          <button
            className="button"
            onClick={() => setShowSlow(true)}
            data-state={!renderNormal ? "active" : undefined}
          >
            10%
          </button>
        </div>
      )}
    </section>
  );
};
