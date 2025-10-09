import { PublishSplitButton } from "../../../components/PublishButton/PublishButton"
import { TableOfContents } from "../../../components/TableOfContents/TocComponent"
import { useEffect, useRef, useState } from "react"
import { NextCard } from "../../../components/Navigation/NextCard"
import Link from "next/link"
import { PageMetas } from "../../../components/PageMetas/PageMetas"

const PublishButtonPage = () => {
  return (
    <>
      <PageMetas
        title="Design engineering: a publish button"
        description="Building a publish button component with feedback, using React, TypeScript, and SCSS."
        url="https://hello-mat.com/design-engineering/component/publish-button"
        image="https://hello-mat.com/media/design-engineering/publish-button/publish-button.png"
        imageWidth="1200"
        imageHeight="630"
        video="https://hello-mat.com/design-engineering/publish-button/publish-button-overview-light.mp4"
        videoType="video/mp4"
        videoWidth="990"
        videoHeight="500"
      />
      <TableOfContents.Provider>
        <PublishButtonPageContent />
      </TableOfContents.Provider>
    </>
  )
}

const PublishButtonPageContent = () => {
  const tocContext = TableOfContents.useToc()
  const contentRef = useRef<HTMLDivElement>(null)
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    if (contentRef.current) {
      tocContext.setRootElement(contentRef.current)
    }
  })

  return (
    <>
      <TableOfContents.Root />
      <div ref={contentRef} className="prose page">
        <Link href="/design-engineering" className="back_link">
          Back to gallery
        </Link>
        <h1>Design engineering: a publish button</h1>
        <p>
          Whenever something is publishable, you need an action for that. And
          when it’s published, you need an action to unpublish it, and maybe
          additional actions that should be available when published. This
          publish button was created at{" "}
          <a target="_blank" rel="noopener" href="https://beamapp.co">
            beam
          </a>{" "}
          to solve this problem.
        </p>
        <p>
          Following beam’s minimalistic approach to design, the button is just
          an icon, until hovered or focused. In either of these states, the
          button reveals the action label. Clicking the button transitions the
          content to feedback about what’s happening, or about what’s happened
          in the case of successful / unsuccessful publishing or unpublishing.
        </p>
        <h2>Interactive demo</h2>
        <p>
          Network calls are simulated and can fail with a 25% probability, click
          a few times and the outcome <strong>might be different</strong>, you
          can also use the buttons below the card to slow down animations.
        </p>
        <div style={{ marginTop: "1em" }}>
          <div
            className="card"
            style={{
              backgroundColor: "var(--color-card-background-secondary)",
              alignItems: "center",
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.5em",
              width: "100%",
              overflow: "hidden",
              paddingInline: 14,
            }}
          >
            <span style={{ opacity: 0.5 }}>
              <span className="above_medium">Hover and click this</span> -&gt;
            </span>
            <PublishSplitButton speed={slow ? 0.1 : 1} />
          </div>
          <div style={{ textAlign: "right", marginTop: "0.5em" }}>
            <button
              className="button"
              onClick={() => setSlow(false)}
              data-state={!slow ? "active" : undefined}
              aria-pressed={!slow ? "true" : "false"}
              title="Set normal animation speed"
            >
              100%
            </button>{" "}
            <button
              className="button"
              onClick={() => setSlow(true)}
              data-state={slow ? "active" : undefined}
              aria-pressed={slow ? "true" : "false"}
              title="Set slow animation speed"
            >
              10%
            </button>
          </div>
        </div>
        <NextCard href={"/design-engineering/component/dock-component"}>
          A dock component
        </NextCard>
      </div>
    </>
  )
}

export default PublishButtonPage
