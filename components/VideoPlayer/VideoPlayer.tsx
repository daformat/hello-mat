import { useState } from "react"

type BaseVideoSources = {
  light: {
    src: string
    type: string
  }
  dark: {
    src: string
    type: string
  }
}

type VideoSourcesWithSlowVersions = BaseVideoSources & {
  slow: BaseVideoSources
}

type VideoSourcesWithoutSlowVersions = BaseVideoSources & {
  slow?: never
}

type VideoSources =
  | VideoSourcesWithSlowVersions
  | VideoSourcesWithoutSlowVersions

export const VideoPlayer = ({ sources }: { sources: VideoSources }) => {
  const [showSlow, setShowSlow] = useState(false)
  const renderNormal = !showSlow || !sources.slow

  return (
    <section>
      <div className="video_player">
        <div style={{ display: renderNormal ? undefined : "none" }}>
          <video className="video_dark" autoPlay loop muted>
            <source src={sources.dark.src} type={sources.dark.type} />
          </video>
          <video className="video_light" autoPlay loop muted>
            <source src={sources.light.src} type={sources.light.type} />
          </video>
        </div>
        {sources.slow ? (
          <div style={{ display: !renderNormal ? undefined : "none" }}>
            <video className="video_dark" autoPlay loop muted>
              <source
                src={sources.slow.dark.src}
                type={sources.slow.dark.type}
              />
            </video>
            <video className="video_light" autoPlay loop muted>
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
            onClick={() => setShowSlow(false)}
            data-state={renderNormal ? "active" : undefined}
          >
            100%
          </button>{" "}
          <button
            onClick={() => setShowSlow(true)}
            data-state={!renderNormal ? "active" : undefined}
          >
            10%
          </button>
        </div>
      )}
    </section>
  )
}
