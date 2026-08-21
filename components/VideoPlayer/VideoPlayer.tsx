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

export type VideoPosters = {
  light: string;
  dark: string;
};

export type VideoPlayerProps = {
  sources: VideoSources;
  /**
   * Still frame per theme, painted while the video is still on the shelf. This
   * shadows the native single-value `poster`, since there are two videos here.
   */
  poster?: VideoPosters;
  /** When true, the video will only play when visible in the viewport */
  autoPlaysWhenVisible?: boolean;
  autoPlaysOnHover?: boolean;
} & Omit<ComponentProps<"video">, "poster">;

export const VideoPlayer = ({
  sources,
  poster,
  className,
  style,
  autoPlaysWhenVisible = false,
  autoPlaysOnHover = false,
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

  // With `preload="none"` the video holds back until the player is on screen,
  // which is what keeps the gallery index from asking about every file at once.
  const preloadsLazily = rest.preload === "none";

  // Intersection Observer for autoPlaysWhenVisible and for lazy preloading
  useEffect(() => {
    if ((!autoPlaysWhenVisible && !preloadsLazily) || !containerRef.current) {
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
  }, [autoPlaysWhenVisible, preloadsLazily]);

  // Once a lazy player is on screen, let the video the reader can actually see
  // fetch its metadata, so hovering it does not start from nothing. The other
  // theme's copy stays untouched: it is `display: none`, nobody is looking at
  // it, and it would be a wasted request.
  useEffect(() => {
    if (!preloadsLazily || !isVisible) {
      return;
    }
    videoRefs.current.forEach((video) => {
      if (
        video.preload === "none" &&
        getComputedStyle(video).display !== "none"
      ) {
        video.preload = "metadata";
      }
    });
  }, [preloadsLazily, isVisible]);

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

  // Play/pause videos based on hover
  useLayoutEffect(() => {
    if (!autoPlaysOnHover) {
      return;
    }

    const handlePointerEnter = () => {
      videoRefs.current.forEach((video) => {
        video.play().catch(() => {
          // Autoplay may be blocked by browser
        });
      });
    };

    const handlePointerLeave = () => {
      videoRefs.current.forEach((video) => {
        video.currentTime = 0;
        video.pause();
      });
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("pointerenter", handlePointerEnter);
      container.addEventListener("pointerleave", handlePointerLeave);

      return () => {
        container.removeEventListener("pointerenter", handlePointerEnter);
        container.removeEventListener("pointerleave", handlePointerLeave);
      };
    }
  }, [isVisible, autoPlaysWhenVisible, autoPlaysOnHover]);

  const shouldAutoPlay = !autoPlaysWhenVisible && !autoPlaysOnHover;

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
            poster={poster?.dark}
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
            poster={poster?.light}
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
              poster={poster?.dark}
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
              poster={poster?.light}
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
