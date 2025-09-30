import { PublishSplitButton } from "../../../components/PublishButton/PublishButton"
import Head from "next/head"
import { TableOfContents } from "../../../components/TableOfContents/TocComponent"
import { useEffect, useRef, useState } from "react"

const PublishButtonPage = () => {
  return (
    <>
      <Head>
        <title>Design engineering: a details (or disclosure) component</title>
        <meta
          name="description"
          content="Building a details (disclosure) component, using React, TypeScript, and SCSS."
        />
      </Head>
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
        <h1>Design engineering: a publish button</h1>
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
          <span style={{ opacity: 0.25 }}>
            <span className="above_medium">Click this</span> -&gt;
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
    </>
  )
}

export default PublishButtonPage
