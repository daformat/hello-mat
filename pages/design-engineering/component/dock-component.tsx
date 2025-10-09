import { TableOfContents } from "components/TableOfContents/TocComponent"
import { useEffect, useRef } from "react"
import { NextCard } from "../../../components/Navigation/NextCard"
import Link from "next/link"
import { Dock, DockItem } from "../../../components/Dock/Dock"
import {
  BeamIcon,
  BeamIconBeta,
  BeamIconDev,
  BeamIconNightly,
} from "../../../components/Dock/BeamIcon"
import { PageMetas } from "../../../components/PageMetas/PageMetas"

const DockComponentPage = () => (
  <>
    <PageMetas
      title="Design engineering: a dock component"
      description="Building a macOS-like dock component, using React, TypeScript, and SCSS."
      url="https://hello-mat.com/design-engineering/component/dock-component"
      image="https://hello-mat.com/media/design-engineering/dock/dock-light.png"
      imageWidth="1200"
      imageHeight="630"
      video="https://hello-mat.com/design-engineering/dock/dock-overview-light.mp4"
      videoType="video/mp4"
      videoWidth="990"
      videoHeight="500"
    />
    <TableOfContents.Provider>
      <DockComponentPageContent />
    </TableOfContents.Provider>
  </>
)

const DockComponentPageContent = () => {
  const tocContext = TableOfContents.useToc()
  const contentRef = useRef<HTMLDivElement>(null)

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
        <h1 id="design-engineering-a-dock-component">
          Design engineering: a dock component
        </h1>
        <p>
          A macOS inspired dock component. Icons are from{" "}
          <a href="https://beamapp.co" target="_blank" rel="noopener">
            beam
          </a>
          , a browser with a first-class note taking experience. This is an
          exploration made for fun. The dock is accessible to mouse and keyboard
          users, try alternating between mouse and keyboard to see the
          difference. This is a desktop-only component (for now).
        </p>
        <div
          className="card"
          style={{
            backgroundColor: "transparent",
            overflow: "visible",
            display: "flex",
            justifyContent: "center",
            padding: "128px 16px",
          }}
        >
          <Dock>
            <DockItem icon={<BeamIcon />} name="beam" />
            <DockItem icon={<BeamIconBeta />} name="beam beta" />
            <DockItem icon={<BeamIconDev />} name="beam dev" />
            <DockItem icon={<BeamIconNightly />} name="beam nightly" />
            <DockItem icon={<BeamIcon />} name="beam" />
            <DockItem icon={<BeamIconBeta />} name="beam beta" />
          </Dock>
        </div>
        <NextCard href={"/design-engineering/component/table-of-contents"}>
          Table of contents
        </NextCard>
      </div>
    </>
  )
}

export default DockComponentPage
