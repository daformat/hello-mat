import { ComponentProps, useState } from "react";

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
} & ComponentProps<"video">;

export const VideoPlayer = ({
  sources,
  className,
  style,
  ...rest
}: VideoPlayerProps) => {
  const [showSlow, setShowSlow] = useState(false);
  const renderNormal = !showSlow || !sources.slow;

  return (
    <section style={{ width: "100%", ...style }}>
      <div className="video_player" style={{ width: "100%", ...style }}>
        <div
          style={{
            width: "100%",
            ...style,
            display: renderNormal ? style?.display : "none",
          }}
        >
          <video
            className={["video_dark", className].filter(Boolean).join(" ")}
            autoPlay
            loop
            muted
            playsInline
            style={style}
            {...rest}
          >
            <source src={sources.dark.src} type={sources.dark.type} />
          </video>
          <video
            className={["video_light", className].filter(Boolean).join(" ")}
            autoPlay
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
              className={["video_dark", className].filter(Boolean).join(" ")}
              autoPlay
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
              className={["video_light", className].filter(Boolean).join(" ")}
              autoPlay
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
